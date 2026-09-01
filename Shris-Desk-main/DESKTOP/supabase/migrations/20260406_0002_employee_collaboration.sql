create type public.conversation_kind as enum ('direct', 'group');
create type public.meeting_status as enum ('scheduled', 'live', 'ended');

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind public.conversation_kind not null,
  title text,
  direct_key text unique,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (conversation_id, profile_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  room_code text not null unique,
  status public.meeting_status not null default 'live',
  scheduled_for timestamptz,
  created_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = target_conversation_id
      and cp.profile_id = auth.uid()
  );
$$;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.meetings enable row level security;

create policy "conversation members read conversations"
on public.conversations
for select
to authenticated
using (public.is_superadmin() or public.is_conversation_member(id));

create policy "company users create conversations"
on public.conversations
for insert
to authenticated
with check (
  public.is_superadmin()
  or (
    public.same_company(company_id)
    and created_by_profile_id = auth.uid()
  )
);

create policy "conversation members read participants"
on public.conversation_participants
for select
to authenticated
using (public.is_superadmin() or public.is_conversation_member(conversation_id));

create policy "conversation creators add participants"
on public.conversation_participants
for insert
to authenticated
with check (
  public.is_superadmin()
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and public.same_company(c.company_id)
      and c.created_by_profile_id = auth.uid()
  )
);

create policy "conversation members read messages"
on public.chat_messages
for select
to authenticated
using (public.is_superadmin() or public.is_conversation_member(conversation_id));

create policy "conversation members send messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender_profile_id = auth.uid()
  and (public.is_superadmin() or public.is_conversation_member(conversation_id))
);

create policy "company users read meetings"
on public.meetings
for select
to authenticated
using (public.is_superadmin() or public.same_company(company_id));

create policy "company users create meetings"
on public.meetings
for insert
to authenticated
with check (
  public.is_superadmin()
  or (
    public.same_company(company_id)
    and created_by_profile_id = auth.uid()
  )
);

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
end;
$$;
