import { describe, expect, it } from 'vitest'
import type { Account, Category, Transaction } from '../lib/types'
import { TRANSACTION_COLUMNS, toCsv, transactionsToRows } from './csv'

describe('formula injection', () => {
  it('prefixes risky leading characters in string fields', () => {
    expect(toCsv([{ v: '=HYPERLINK("http://evil")' }], ['v'])).toBe(
      `v\n"'=HYPERLINK(""http://evil"")"`,
    )
    expect(toCsv([{ v: '+39 333' }], ['v'])).toBe("v\n'+39 333")
    expect(toCsv([{ v: '@user' }], ['v'])).toBe("v\n'@user")
  })

  it('leaves numbers untouched', () => {
    expect(toCsv([{ v: -7 }], ['v'])).toBe('v\n-7')
  })
})

describe('toCsv', () => {
  it('renders header and rows in column order', () => {
    const csv = toCsv([{ a: 1, b: 'x' }], ['a', 'b'])
    expect(csv).toBe('a,b\n1,x')
  })

  it('escapes quotes, commas, and newlines', () => {
    const csv = toCsv([{ v: 'say "hi", ok\nbye' }], ['v'])
    expect(csv).toBe('v\n"say ""hi"", ok\nbye"')
  })

  it('serializes null and undefined as empty', () => {
    expect(toCsv([{ v: null }, { v: undefined }], ['v'])).toBe('v\n\n')
  })
})

describe('transactionsToRows', () => {
  const accounts = [
    { id: 'a1', name: 'Conto corrente' },
    { id: 'a2', name: 'Contanti' },
  ] as Account[]
  const categories = [{ id: 'c1', name: 'Cibo' }] as Category[]
  const tx: Transaction = {
    id: 't1',
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'c1',
    type: 'expense',
    amount: 12.5,
    date: '2026-06-15',
    description: 'Pranzo',
    notes: null,
    tags: ['lavoro', 'pranzo'],
    transfer_to_account_id: null,
    recurring_rule_id: null,
    created_at: '2026-06-15T00:00:00Z',
  }

  it('resolves names and joins tags', () => {
    expect(transactionsToRows([tx], accounts, categories)).toEqual([
      {
        date: '2026-06-15',
        type: 'expense',
        amount: 12.5,
        account: 'Conto corrente',
        to_account: '',
        category: 'Cibo',
        description: 'Pranzo',
        notes: '',
        tags: 'lavoro|pranzo',
      },
    ])
  })

  it('exposes columns matching row keys', () => {
    const row = transactionsToRows([tx], accounts, categories)[0]
    expect(Object.keys(row)).toEqual(TRANSACTION_COLUMNS)
  })
})
