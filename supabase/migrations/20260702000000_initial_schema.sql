-- Accounts ------------------------------------------------------------------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'cash', 'investment', 'other')),
  currency text not null default 'EUR',
  initial_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Categories ----------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  color text not null default '#6b7280',
  icon text not null default '🏷️',
  parent_id uuid references public.categories (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Transactions ---------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount numeric(12,2) not null check (amount > 0),
  date date not null,
  description text not null,
  notes text,
  tags text[] not null default '{}',
  transfer_to_account_id uuid references public.accounts (id) on delete cascade,
  recurring_rule_id uuid,
  created_at timestamptz not null default now(),
  constraint transfer_target check (
    (type = 'transfer' and transfer_to_account_id is not null and transfer_to_account_id <> account_id)
    or (type <> 'transfer' and transfer_to_account_id is null)
  ),
  constraint category_required check (type = 'transfer' or category_id is not null)
);

-- Investments (schema only in v1; UI in Fase 2) -------------------------------
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  name text not null,
  ticker text,
  isin text,
  quantity numeric(18,6) not null,
  cost_basis numeric(12,2) not null,
  current_value numeric(12,2) not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_category_idx on public.transactions (category_id);

-- RLS: owner-only on every table ----------------------------------------------
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.investments enable row level security;

create policy "owner_all" on public.accounts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_all" on public.categories
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_all" on public.transactions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner_all" on public.investments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Default categories seeded for each new user ---------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, color, icon) values
    (new.id, 'Casa', 'expense', '#ef4444', '🏠'),
    (new.id, 'Cibo', 'expense', '#f97316', '🍽️'),
    (new.id, 'Trasporti', 'expense', '#eab308', '🚗'),
    (new.id, 'Salute', 'expense', '#22c55e', '❤️'),
    (new.id, 'Svago', 'expense', '#3b82f6', '🎮'),
    (new.id, 'Altro', 'expense', '#6b7280', '🏷️'),
    (new.id, 'Stipendio', 'income', '#10b981', '💰'),
    (new.id, 'Investimenti', 'income', '#8b5cf6', '📈'),
    (new.id, 'Altre entrate', 'income', '#14b8a6', '➕');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
