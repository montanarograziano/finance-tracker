-- Prevent duplicate recurring occurrences during concurrent/retried generation.
alter table public.transactions
  add constraint transactions_recurring_rule_date_key unique (recurring_rule_id, date);

-- A child row must reference records owned by the same user. RLS protects rows
-- directly, while these composite foreign keys protect cross-table references.
alter table public.accounts
  add constraint accounts_id_user_id_key unique (id, user_id);
alter table public.categories
  add constraint categories_id_user_id_key unique (id, user_id);
alter table public.recurring_rules
  add constraint recurring_rules_id_user_id_key unique (id, user_id);

alter table public.categories
  drop constraint categories_parent_id_fkey,
  add constraint categories_parent_owner_fkey
    foreign key (parent_id, user_id) references public.categories (id, user_id)
    on delete set null (parent_id);

alter table public.transactions
  drop constraint transactions_account_id_fkey,
  drop constraint transactions_category_id_fkey,
  drop constraint transactions_transfer_to_account_id_fkey,
  drop constraint transactions_recurring_rule_fk,
  add constraint transactions_account_owner_fkey
    foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  add constraint transactions_category_owner_fkey
    foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete set null (category_id),
  add constraint transactions_transfer_owner_fkey
    foreign key (transfer_to_account_id, user_id) references public.accounts (id, user_id)
    on delete cascade,
  add constraint transactions_recurring_rule_owner_fkey
    foreign key (recurring_rule_id, user_id) references public.recurring_rules (id, user_id)
    on delete set null (recurring_rule_id);

alter table public.investments
  drop constraint investments_account_id_fkey,
  add constraint investments_account_owner_fkey
    foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade;

alter table public.recurring_rules
  drop constraint recurring_rules_account_id_fkey,
  drop constraint recurring_rules_category_id_fkey,
  drop constraint recurring_rules_transfer_to_account_id_fkey,
  add constraint recurring_rules_account_owner_fkey
    foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  add constraint recurring_rules_category_owner_fkey
    foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete set null (category_id),
  add constraint recurring_rules_transfer_owner_fkey
    foreign key (transfer_to_account_id, user_id) references public.accounts (id, user_id)
    on delete cascade;

alter table public.recurring_exceptions
  drop constraint recurring_exceptions_rule_id_fkey,
  add constraint recurring_exceptions_rule_owner_fkey
    foreign key (rule_id, user_id) references public.recurring_rules (id, user_id) on delete cascade;
