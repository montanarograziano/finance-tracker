import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ReportData {
  title: string
  summary: { label: string; value: string }[]
  byCategory: { name: string; total: string }[]
  /** Rows of [date, description, category, account, amount] */
  transactions: string[][]
}

export function downloadReportPdf(data: ReportData, filename: string): void {
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text(data.title, 14, 18)

  autoTable(doc, {
    startY: 26,
    theme: 'plain',
    body: data.summary.map((s) => [s.label, s.value]),
  })

  autoTable(doc, {
    head: [['Categoria', 'Totale']],
    body: data.byCategory.map((c) => [c.name, c.total]),
  })

  autoTable(doc, {
    head: [['Data', 'Descrizione', 'Categoria', 'Conto', 'Importo']],
    body: data.transactions,
  })

  doc.save(filename)
}
