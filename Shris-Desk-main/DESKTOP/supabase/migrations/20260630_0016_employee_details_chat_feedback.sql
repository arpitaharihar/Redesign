-- Employee profile details, chat delivery state, editable group names, and company feedback.

alter table public.profiles
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists employee_code text,
  add column if not exists location text,
  add column if not exists shift_name text,
  add column if not exists joining_date date,
  add column if not exists manager_name text,
  add column if not exists emergency_contact text,
  add column if not exists skills text;

alter table public.chat_messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

alter table public.conversations
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create index if not exists idx_chat_messages_conversation_created
on public.chat_messages(conversation_id, created_at);

create or replace function public.touch_conversation_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = timezone('utc', now())
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_chat_message_touch_conversation on public.chat_messages;
create trigger on_chat_message_touch_conversation
after insert on public.chat_messages
for each row
execute function public.touch_conversation_updated_at();

create or replace function public.rename_group_conversation_public(
  target_conversation_id uuid,
  next_title text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if char_length(trim(coalesce(next_title, ''))) < 2 then
    raise exception 'Group name must be at least 2 characters';
  end if;

  update public.conversations
  set title = trim(next_title),
      updated_at = timezone('utc', now())
  where id = target_conversation_id
    and kind = 'group'
    and public.is_conversation_member(target_conversation_id);

  if not found then
    raise exception 'Group conversation not found';
  end if;
end;
$$;

revoke all on function public.rename_group_conversation_public(uuid, text) from public;
grant execute on function public.rename_group_conversation_public(uuid, text) to authenticated;

create or replace function public.mark_conversation_read_public(target_conversation_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.chat_messages
  set delivered_at = coalesce(delivered_at, timezone('utc', now())),
      read_at = coalesce(read_at, timezone('utc', now()))
  where conversation_id = target_conversation_id
    and sender_profile_id <> auth.uid()
    and public.is_conversation_member(target_conversation_id);
$$;

revoke all on function public.mark_conversation_read_public(uuid) from public;
grant execute on function public.mark_conversation_read_public(uuid) to authenticated;

create policy "conversation members update own delivery state"
on public.chat_messages
for update
to authenticated
using (public.is_superadmin() or public.is_conversation_member(conversation_id))
with check (public.is_superadmin() or public.is_conversation_member(conversation_id));

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception
  when duplicate_object then null;
end;
$$;
