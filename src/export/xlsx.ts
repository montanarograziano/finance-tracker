import * as XLSX from 'xlsx'
import { sanitizeSpreadsheetString } from './csv'

export interface Sheet {
  name: string
  // object[] (not Record<string, unknown>[]) so typed interfaces like Account[] are assignable
  rows: object[]
}

export function downloadXlsx(sheets: Sheet[], filename: string): void {
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const sanitizedRows = sheet.rows.map((row) => {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        out[k] = typeof v === 'string' ? sanitizeSpreadsheetString(v) : v
      }
      return out
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizedRows), sheet.name)
  }
  XLSX.writeFile(wb, filename)
}
