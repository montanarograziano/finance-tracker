export type AccountType = 'checking' | 'cash' | 'investment' | 'other'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  currency: string
  initial_balance: number
  created_at: string
}

export type CategoryType = 'expense' | 'income'

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  color: string
  icon: string
  parent_id: string | null
  created_at: string
}

export type TransactionType = 'expense' | 'income' | 'transfer'

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  date: string // ISO YYYY-MM-DD
  description: string
  notes: string | null
  tags: string[]
  transfer_to_account_id: string | null
  recurring_rule_id: string | null
  created_at: string
}

export interface AccountWithBalance extends Account {
  balance: number
}

export interface Investment {
  id: string
  user_id: string
  account_id: string
  name: string
  ticker: string | null
  isin: string | null
  quantity: number
  cost_basis: number
  current_value: number
  updated_at: string
  created_at: string
}

export type RecurringFrequency = 'monthly' | 'yearly'
export type RecurringExceptionAction = 'skip' | 'modified'

export interface RecurringRule {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  type: TransactionType
  transfer_to_account_id: string | null
  amount: number
  description: string
  frequency: RecurringFrequency
  day_of_month: number // 1–28
  month_of_year: number | null // 1–12, yearly only
  start_date: string // ISO YYYY-MM-DD
  end_date: string | null
  active: boolean
  last_generated_date: string | null
  created_at: string
}

export interface RecurringException {
  id: string
  user_id: string
  rule_id: string
  occurrence_date: string // ISO YYYY-MM-DD
  action: RecurringExceptionAction
  created_at: string
}
