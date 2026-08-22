import * as XLSX from 'xlsx'
import type { Account, Category, CategoryType, Transaction, TransactionType } from '../lib/types'

/**
 * Import of transactions from spreadsheet files (.xlsx / .csv).
 *
 * Expected columns mirror the CSV/XLSX export format (TRANSACTION_COLUMNS):
 *   date, type, amount, account, to_account, category, description, notes, tags
 * Required: date, type, amount, account, description (+ category for
 * expense/income rows, to_account for transfer rows).
 */

export type RawImportRow = Record<string, unknown>

export interface ImportRowError {
  /** 1-based data row number (header excluded). */
  row: number
  message: string
}

export interface PreparedImportRow {
  row: number
  date: string
  type: TransactionType
  amount: number
  account: string
  toAccount: string | null
  category: string | null
  description: string
  notes: string | null
  tags: string[]
  /** Matches an existing transaction (date + amount + description + account). */
  isDuplicate: boolean
}

export interface ImportPlan {
  rows: PreparedImportRow[]
  errors: ImportRowError[]
  /** Account names referenced in the file but not present in the DB. */
  newAccounts: string[]
  /** Category names (with inferred type) not present in the DB. */
  newCategories: { name: string; type: CategoryType }[]
}

const REQUIRED_COLUMNS = ['date', 'type', 'amount', 'account', 'description'] as const
const TYPES: TransactionType[] = ['expense', 'income', 'transfer']

/** Reads the first sheet of an .xlsx or .csv file into raw row objects. */
export function parseSpreadsheet(data: ArrayBuffer): RawImportRow[] {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  return XLSX.utils.sheet_to_json<RawImportRow>(workbook.Sheets[sheetName], {
    raw: true,
    defval: '',
  })
}

/** Returns the required columns missing from the parsed rows, if any. */
export function missingColumns(rows: RawImportRow[]): string[] {
  if (rows.length === 0) return [...REQUIRED_COLUMNS]
  const keys = new Set(Object.keys(rows[0]).map((k) => k.trim().toLowerCase()))
  return REQUIRED_COLUMNS.filter((c) => !keys.has(c))
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * Accepts: Date objects (xlsx cellDates), Excel serial numbers,
 * 'YYYY-MM-DD' and 'DD/MM/YYYY' strings. Returns ISO date or null.
 */
export function parseDateValue(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toIsoDate(value)
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    // Excel serial date: days since 1899-12-30 (UTC to avoid TZ drift).
    const ms = Math.round((value - 25569) * 86400 * 1000)
    const d = new Date(ms)
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
  }
  if (typeof value === 'string') {
    const s = value.trim()
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    if (m) {
      const [, y, mo, d] = m.map(Number)
      if (isValidYmd(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`
      return null
    }
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
    if (m) {
      const d = Number(m[1])
      const mo = Number(m[2])
      const y = Number(m[3])
      if (isValidYmd(y, mo, d)) return `${y}-${pad2(mo)}-${pad2(d)}`
    }
  }
  return null
}

function isValidYmd(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12 || d < 1) return false
  return d <= new Date(y, mo, 0).getDate()
}

/**
 * Accepts numbers and strings in Italian ("1.234,56") or English
 * ("1,234.56" / "1234.56") notation, optionally with a € prefix/suffix.
 * Returns a positive number or null.
 */
export function parseAmountValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? round2(value) : null
  }
  if (typeof value !== 'string') return null
  let s = value.trim().replace(/[€\s]/g, '')
  if (s === '') return null
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    // The last separator is the decimal one.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replaceAll('.', '').replace(',', '.')
    } else {
      s = s.replaceAll(',', '')
    }
  } else if (hasComma) {
    s = s.replace(',', '.')
  }
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? round2(n) : null
}

const round2 = (n: number): number => Math.round(n * 100) / 100

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim())

function duplicateKey(date: string, amount: number, description: string, account: string): string {
  return `${date}|${amount.toFixed(2)}|${description.toLowerCase()}|${account.toLowerCase()}`
}

/**
 * Validates raw rows against the DB state and produces an import plan:
 * valid rows (with duplicate flags), per-row errors, and the accounts and
 * categories that would need to be created.
 */
export function buildImportPlan(
  rawRows: RawImportRow[],
  accounts: Account[],
  categories: Category[],
  existing: Transaction[],
): ImportPlan {
  const accountByName = new Map(accounts.map((a) => [a.name.trim().toLowerCase(), a]))
  const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]))
  const accountName = new Map(accounts.map((a) => [a.id, a.name]))

  const existingKeys = new Set(
    existing.map((tx) =>
      duplicateKey(tx.date, tx.amount, tx.description, accountName.get(tx.account_id) ?? ''),
    ),
  )

  const rows: PreparedImportRow[] = []
  const errors: ImportRowError[] = []
  const newAccounts = new Map<string, string>()
  const newCategories = new Map<string, { name: string; type: CategoryType }>()

  rawRows.forEach((raw, i) => {
    const row = i + 1
    const fail = (message: string) => errors.push({ row, message })

    const date = parseDateValue(raw.date)
    if (!date) return fail(`invalid date "${str(raw.date)}"`)

    const typeStr = str(raw.type).toLowerCase()
    const type = TYPES.find((t) => t === typeStr)
    if (!type) return fail(`invalid type "${str(raw.type)}"`)

    const amount = parseAmountValue(raw.amount)
    if (amount === null) return fail(`invalid amount "${str(raw.amount)}"`)

    const description = str(raw.description)
    if (!description) return fail('missing description')

    const account = str(raw.account)
    if (!account) return fail('missing account')

    const toAccount = str(raw.to_account)
    const category = str(raw.category)

    if (type === 'transfer') {
      if (!toAccount) return fail('transfer requires to_account')
      if (toAccount.toLowerCase() === account.toLowerCase())
        return fail('transfer to_account must differ from account')
    } else if (!category) {
      return fail('missing category')
    }

    for (const name of [account, ...(type === 'transfer' && toAccount ? [toAccount] : [])]) {
      const key = name.toLowerCase()
      if (!accountByName.has(key) && !newAccounts.has(key)) newAccounts.set(key, name)
    }
    if (type !== 'transfer') {
      const key = category.toLowerCase()
      const known = categoryByName.get(key) ?? newCategories.get(key)
      if (known && known.type !== type)
        return fail(`category "${category}" is of type ${known.type}, row is ${type}`)
      if (!known) newCategories.set(key, { name: category, type })
    }

    const tags = str(raw.tags)
      .split(/[|,]/)
      .map((t) => t.trim())
      .filter(Boolean)

    rows.push({
      row,
      date,
      type,
      amount,
      account,
      toAccount: type === 'transfer' ? toAccount : null,
      category: type === 'transfer' ? null : category,
      description,
      notes: str(raw.notes) || null,
      tags,
      isDuplicate: existingKeys.has(duplicateKey(date, amount, description, account)),
    })
  })

  return {
    rows,
    errors,
    newAccounts: [...newAccounts.values()],
    newCategories: [...newCategories.values()],
  }
}
