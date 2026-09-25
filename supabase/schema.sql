-- Proctor WhatsApp — Supabase schema (Postgres + Auth + Row Level Security)
-- Run this in the Supabase SQL editor once.

create extension if not exists pgcrypto;

-- profiles (one per authenticated user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  default_country_code text not null default '20',
  created_at timestamptz not null default now()
);

-- Email format only: no organisation or domain is assumed.
alter table public.profiles drop constraint if exists profiles_email_shape_check;
alter table public.profiles
  add constraint profiles_email_shape_check
  check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') not valid;

-- lists (one per user; each has its own message template)
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message_template text not null default E'السلام عليكم ورحمة الله وبركاته، أهلاً {name}\n\nده الجروب الخاص بامتحان EST1\n\nالمكان: قاعة الامتحانات الرئيسية\n\n📌 رابط الجروب: https://example.com/demo-invite\n\n🗓 موعد الامتحان: يوم الجمعة الموافق 9 أكتوبر 2026\n\n🔔 يرجى تأكيد الحضور بكتابة الاسم الثنائي داخل الجروب.\n\nمع تمنياتنا بالتوفيق، وكل سنة وأنتم طيبين 🌷',
  default_country_code text not null default '20',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- proctors
create table if not exists public.proctors (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  name text not null,
  phone text not null,
  opened_at timestamptz,
  opened_count int not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint proctors_phone_format_check check (phone ~ '^[0-9]{11,15}$'),
  constraint proctors_name_not_blank_check check (length(trim(name)) > 0),
  constraint proctors_list_phone_unique unique (list_id, phone)
);

create index if not exists proctors_list_idx on public.proctors (list_id);
create index if not exists proctors_phone_idx on public.proctors (phone);
create index if not exists lists_owner_idx on public.lists (owner_id);

-- Keep list metadata fresh and make opened tracking atomic.
create or replace function public.touch_list_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lists_touch_updated_at on public.lists;
create trigger lists_touch_updated_at
  before update on public.lists
  for each row execute function public.touch_list_updated_at();

create or replace function public.increment_proctor_opened(p_proctor_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.proctors
     set opened_at = now(),
         opened_count = opened_count + 1
   where id = p_proctor_id;
$$;

revoke all on function public.increment_proctor_opened(uuid) from anon;
grant execute on function public.increment_proctor_opened(uuid) to authenticated;

-- auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'مستخدم')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Installs from earlier versions may still carry an unused role column.
alter table public.profiles drop column if exists role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: users can only ever touch their own data
alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.proctors enable row level security;

create policy "select own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "select own lists" on public.lists
  for select using (auth.uid() = owner_id);

create policy "insert own lists" on public.lists
  for insert with check (auth.uid() = owner_id);

create policy "update own lists" on public.lists
  for update using (auth.uid() = owner_id);

create policy "delete own lists" on public.lists
  for delete using (auth.uid() = owner_id);

create policy "select proctors of own lists" on public.proctors
  for select using (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  );

create policy "insert proctors to own lists" on public.proctors
  for insert with check (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  );

create policy "update proctors in own lists" on public.proctors
  for update using (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  );

create policy "delete proctors in own lists" on public.proctors
  for delete using (
    exists (select 1 from public.lists l where l.id = list_id and l.owner_id = auth.uid())
  );
