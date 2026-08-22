-- recurring_rules ---------------------------------------------------------------
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('expense', 'income', 'transfer')),
  transfer_to_account_id uuid references public.accounts (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  description text not null,
  frequency text not null check (frequency in ('monthly', 'yearly')),
  day_of_month int not null check (day_of_month between 1 and 28),
  month_of_year int check (month_of_year between 1 and 12),
  start_date date not null,
  end_date date,
  active boolean not null default true,
  last_generated_date date,
  created_at timestamptz not null default now(),
  constraint transfer_rule check (
    (type = 'transfer' and transfer_to_account_id is not null
      and transfer_to_account_id <> account_id)
    or (type <> 'transfer' and transfer_to_account_id is null)
  ),
  constraint category_rule check (type = 'transfer' or category_id is not null),
  constraint yearly_needs_month check (frequency = 'monthly' or month_of_year is not null)
);

-- recurring_exceptions ----------------------------------------------------------
create table public.recurring_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rule_id uuid not null references public.recurring_rules (id) on delete cascade,
  occurrence_date date not null,
  action text not null check (action in ('skip', 'modified')),
  created_at timestamptz not null default now(),
  unique (rule_id, occurrence_date)
);

-- Add FK from transactions to recurring_rules (column already exists as plain UUID) --
alter table public.transactions
  add constraint transactions_recurring_rule_fk
  foreign key (recurring_rule_id)
  references public.recurring_rules (id)
  on delete set null;

-- Indexes -----------------------------------------------------------------------
create index recurring_rules_user_idx on public.recurring_rules (user_id);
create index recurring_exceptions_rule_idx on public.recurring_exceptions (rule_id);

-- RLS ---------------------------------------------------------------------------
alter table public.recurring_rules enable row level security;
alter table public.recurring_exceptions enable row level security;

create policy "owner_all" on public.recurring_rules
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner_all" on public.recurring_exceptions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
