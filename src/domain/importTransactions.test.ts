import { describe, expect, it } from 'vitest'
import type { Account, Category, Transaction } from '../lib/types'
import {
  buildImportPlan,
  missingColumns,
  parseAmountValue,
  parseDateValue,
  type RawImportRow,
} from './importTransactions'

const account = (id: string, name: string): Account => ({
  id,
  user_id: 'u1',
  name,
  type: 'checking',
  currency: 'EUR',
  initial_balance: 0,
  created_at: '2026-01-01T00:00:00Z',
})

const category = (id: string, name: string, type: Category['type']): Category => ({
  id,
  user_id: 'u1',
  name,
  type,
  color: '#ef4444',
  icon: '🏠',
  parent_id: null,
  created_at: '2026-01-01T00:00:00Z',
})

const existingTx = (over: Partial<Transaction>): Transaction => ({
  id: 't1',
  user_id: 'u1',
  account_id: 'a1',
  category_id: 'c1',
  type: 'expense',
  amount: 10,
  date: '2026-01-15',
  description: 'Spesa',
  notes: null,
  tags: [],
  transfer_to_account_id: null,
  recurring_rule_id: null,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

const accounts = [account('a1', 'Conto corrente'), account('a2', 'Contanti')]
const categories = [category('c1', 'Casa', 'expense'), category('c2', 'Stipendio', 'income')]

const validRow = (over: Partial<RawImportRow> = {}): RawImportRow => ({
  date: '2026-02-01',
  type: 'expense',
  amount: 12.5,
  account: 'Conto corrente',
  to_account: '',
  category: 'Casa',
  description: 'Bolletta',
  notes: '',
  tags: '',
  ...over,
})

describe('parseDateValue', () => {
  it('accepts ISO strings', () => {
    expect(parseDateValue('2026-02-01')).toBe('2026-02-01')
  })

  it('accepts DD/MM/YYYY strings', () => {
    expect(parseDateValue('01/02/2026')).toBe('2026-02-01')
    expect(parseDateValue('1/2/2026')).toBe('2026-02-01')
  })

  it('accepts Date objects', () => {
    expect(parseDateValue(new Date(2026, 1, 1))).toBe('2026-02-01')
  })

  it('accepts Excel serial numbers', () => {
    expect(parseDateValue(44927)).toBe('2023-01-01')
  })

  it('rejects invalid values', () => {
    expect(parseDateValue('2026-13-01')).toBeNull()
    expect(parseDateValue('31/02/2026')).toBeNull()
    expect(parseDateValue('')).toBeNull()
    expect(parseDateValue('yesterday')).toBeNull()
  })
})

describe('parseAmountValue', () => {
  it('accepts numbers', () => {
    expect(parseAmountValue(12.5)).toBe(12.5)
  })

  it('parses Italian notation', () => {
    expect(parseAmountValue('1.234,56')).toBe(1234.56)
    expect(parseAmountValue('12,50')).toBe(12.5)
  })

  it('parses English notation', () => {
    expect(parseAmountValue('1,234.56')).toBe(1234.56)
    expect(parseAmountValue('1234.56')).toBe(1234.56)
  })

  it('strips euro symbol and spaces', () => {
    expect(parseAmountValue('€ 12,00')).toBe(12)
  })

  it('rejects zero, negatives, and garbage', () => {
    expect(parseAmountValue(0)).toBeNull()
    expect(parseAmountValue('-5')).toBeNull()
    expect(parseAmountValue('abc')).toBeNull()
    expect(parseAmountValue('')).toBeNull()
  })
})

describe('missingColumns', () => {
  it('reports missing required columns', () => {
    expect(missingColumns([{ date: '', amount: '' }])).toEqual(['type', 'account', 'description'])
  })

  it('is empty for complete rows', () => {
    expect(missingColumns([validRow()])).toEqual([])
  })
})

describe('buildImportPlan', () => {
  it('prepares a valid row with known account and category', () => {
    const plan = buildImportPlan([validRow()], accounts, categories, [])
    expect(plan.errors).toEqual([])
    expect(plan.newAccounts).toEqual([])
    expect(plan.newCategories).toEqual([])
    expect(plan.rows).toHaveLength(1)
    expect(plan.rows[0]).toMatchObject({
      date: '2026-02-01',
      type: 'expense',
      amount: 12.5,
      account: 'Conto corrente',
      category: 'Casa',
      description: 'Bolletta',
      isDuplicate: false,
    })
  })

  it('matches account and category names case-insensitively', () => {
    const plan = buildImportPlan(
      [validRow({ account: 'conto CORRENTE', category: 'casa' })],
      accounts,
      categories,
      [],
    )
    expect(plan.errors).toEqual([])
    expect(plan.newAccounts).toEqual([])
    expect(plan.newCategories).toEqual([])
  })

  it('collects unknown accounts and categories to create', () => {
    const plan = buildImportPlan(
      [
        validRow({ account: 'Nuovo conto', category: 'Palestra' }),
        validRow({ type: 'income', account: 'Nuovo conto', category: 'Bonus', amount: 100 }),
      ],
      accounts,
      categories,
      [],
    )
    expect(plan.errors).toEqual([])
    expect(plan.newAccounts).toEqual(['Nuovo conto'])
    expect(plan.newCategories).toEqual([
      { name: 'Palestra', type: 'expense' },
      { name: 'Bonus', type: 'income' },
    ])
  })

  it('rejects rows whose category exists with a different type', () => {
    const plan = buildImportPlan(
      [validRow({ type: 'income', category: 'Casa' })],
      accounts,
      categories,
      [],
    )
    expect(plan.rows).toEqual([])
    expect(plan.errors).toHaveLength(1)
    expect(plan.errors[0].message).toContain('Casa')
  })

  it('rejects conflicting types for a new category within one import', () => {
    const plan = buildImportPlan(
      [
        validRow({ category: 'Nuova', type: 'expense' }),
        validRow({ category: 'Nuova', type: 'income' }),
      ],
      accounts,
      categories,
      [],
    )
    expect(plan.rows).toHaveLength(1)
    expect(plan.errors[0].message).toContain('Nuova')
  })

  it('validates transfers', () => {
    const missing = buildImportPlan(
      [validRow({ type: 'transfer', category: '', to_account: '' })],
      accounts,
      categories,
      [],
    )
    expect(missing.errors[0].message).toContain('to_account')

    const same = buildImportPlan(
      [validRow({ type: 'transfer', category: '', to_account: 'Conto corrente' })],
      accounts,
      categories,
      [],
    )
    expect(same.errors).toHaveLength(1)

    const ok = buildImportPlan(
      [validRow({ type: 'transfer', category: '', to_account: 'Contanti' })],
      accounts,
      categories,
      [],
    )
    expect(ok.errors).toEqual([])
    expect(ok.rows[0]).toMatchObject({ toAccount: 'Contanti', category: null })
  })

  it('reports row-level errors with 1-based row numbers', () => {
    const plan = buildImportPlan(
      [validRow(), validRow({ amount: 'abc' }), validRow({ type: 'boh' })],
      accounts,
      categories,
      [],
    )
    expect(plan.rows).toHaveLength(1)
    expect(plan.errors.map((e) => e.row)).toEqual([2, 3])
  })

  it('requires a category for non-transfer rows', () => {
    const plan = buildImportPlan([validRow({ category: '' })], accounts, categories, [])
    expect(plan.errors[0].message).toContain('category')
  })

  it('flags duplicates against existing transactions', () => {
    const existing = [existingTx({ date: '2026-02-01', amount: 12.5, description: 'Bolletta' })]
    const plan = buildImportPlan([validRow()], accounts, categories, existing)
    expect(plan.rows[0].isDuplicate).toBe(true)

    const differentAmount = buildImportPlan(
      [validRow({ amount: 13 })],
      accounts,
      categories,
      existing,
    )
    expect(differentAmount.rows[0].isDuplicate).toBe(false)
  })

  it('splits tags on pipes and commas', () => {
    const plan = buildImportPlan(
      [validRow({ tags: 'casa|utenze, luce' })],
      accounts,
      categories,
      [],
    )
    expect(plan.rows[0].tags).toEqual(['casa', 'utenze', 'luce'])
  })
})
