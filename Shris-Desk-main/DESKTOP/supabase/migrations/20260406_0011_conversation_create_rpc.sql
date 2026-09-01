create or replace function public.create_conversation_public(
  conversation_kind text,
  conversation_title text,
  participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  company_id uuid;
  conversation_id_value uuid;
  direct_key_value text;
  normalized_participants uuid[];
begin
  company_id := public.current_company_id();
  if company_id is null then
    raise exception 'No company assigned to current user';
  end if;

  if array_length(participant_ids, 1) is null then
    raise exception 'No participants supplied';
  end if;

  normalized_participants := array(
    select distinct unnest(participant_ids)
  );

  if conversation_kind = 'direct' then
    direct_key_value := array_to_string(
      array(
        select unnest(array_append(normalized_participants, auth.uid())) order by 1
      ),
      ':'
    );

    select id into conversation_id_value
    from public.conversations
    where direct_key = direct_key_value
    limit 1;

    if conversation_id_value is null then
      insert into public.conversations (
        company_id,
        kind,
        direct_key,
        created_by_profile_id
      )
      values (
        company_id,
        'direct',
        direct_key_value,
        auth.uid()
      )
      returning id into conversation_id_value;
    end if;
  else
    insert into public.conversations (
      company_id,
      kind,
      title,
      created_by_profile_id
    )
    values (
      company_id,
      'group',
      coalesce(conversation_title, 'Team Group'),
      auth.uid()
    )
    returning id into conversation_id_value;
  end if;

  insert into public.conversation_participants (conversation_id, profile_id)
  select conversation_id_value, participant_id
  from unnest(array_append(normalized_participants, auth.uid())) as participant_id
  on conflict (conversation_id, profile_id) do nothing;

  return conversation_id_value;
end;
$$;

revoke all on function public.create_conversation_public(text, text, uuid[]) from public;
grant execute on function public.create_conversation_public(text, text, uuid[]) to authenticated;
