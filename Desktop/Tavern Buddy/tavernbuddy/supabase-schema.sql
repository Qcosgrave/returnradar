-- ============================================================
-- Tavernbuddy Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  bar_name text,
  location text,
  timezone text default 'America/New_York',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text default 'none' check (plan in ('none', 'starter', 'pro')),
  subscription_status text default 'none',
  square_connected boolean default false,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

-- RLS
alter table public.users enable row level security;

create policy "Users can view own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own data"
  on public.users for insert
  with check (auth.uid() = id);

-- Auto-create user record on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SQUARE CONNECTIONS TABLE
-- ============================================================
create table if not exists public.square_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text not null,
  merchant_id text not null,
  location_id text,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table public.square_connections enable row level security;

create policy "Users can view own Square connection"
  on public.square_connections for select
  using (auth.uid() = user_id);

-- ============================================================
-- EMPLOYEES TABLE
-- ============================================================
create table if not exists public.employees (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  square_employee_id text not null,
  name text not null,
  unique(square_employee_id)
);

alter table public.employees enable row level security;

create policy "Users can view own employees"
  on public.employees for select
  using (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  square_transaction_id text not null unique,
  date date not null,
  hour integer not null default 0,
  total_amount bigint not null default 0, -- stored in cents
  item_count integer not null default 0,
  employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists transactions_user_id_date_idx on public.transactions(user_id, date);
create index if not exists transactions_square_id_idx on public.transactions(square_transaction_id);

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

-- ============================================================
-- TRANSACTION ITEMS TABLE
-- ============================================================
create table if not exists public.transaction_items (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  item_name text not null,
  category text,
  quantity integer not null default 1,
  gross_amount bigint not null default 0, -- stored in cents
  unique(transaction_id, item_name)
);

create index if not exists transaction_items_transaction_id_idx on public.transaction_items(transaction_id);

alter table public.transaction_items enable row level security;

create policy "Users can view own transaction items"
  on public.transaction_items for select
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_items.transaction_id
      and t.user_id = auth.uid()
    )
  );

-- ============================================================
-- WEEKLY REPORTS TABLE
-- ============================================================
create table if not exists public.weekly_reports (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  week_start date not null,
  week_end date not null,
  report_html text not null,
  report_text text,
  generated_at timestamptz default now()
);

create index if not exists weekly_reports_user_id_idx on public.weekly_reports(user_id);

alter table public.weekly_reports enable row level security;

create policy "Users can view own reports"
  on public.weekly_reports for select
  using (auth.uid() = user_id);

-- ============================================================
-- CHAT MESSAGES TABLE
-- ============================================================
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists chat_messages_user_id_idx on public.chat_messages(user_id);

alter table public.chat_messages enable row level security;

create policy "Users can view own messages"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own messages"
  on public.chat_messages for delete
  using (auth.uid() = user_id);

-- ============================================================
-- SERVICE ROLE BYPASS (for server-side operations)
-- The admin client uses service_role key which bypasses RLS
-- ============================================================
