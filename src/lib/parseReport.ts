import type { ParsedReport, Trade } from '../types/report'

export const MAX_REPORT_BYTES = 5 * 1024 * 1024 // 5MB — generous for a text report
const REPORT_MARKER = 'Strategy Tester Report'
const ROW_PREFIXES = new Set(['Largest', 'Average', 'Maximum', 'Maximal'])

export class ReportParseError extends Error {}

/** Validates a File before it's read/parsed — call this first on upload. */
export function validateReportFile(file: File): void {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.htm') && !name.endsWith('.html')) {
    throw new ReportParseError('Only .htm or .html files are accepted.')
  }
  if (file.size > MAX_REPORT_BYTES) {
    throw new ReportParseError('File is too large to be a Strategy Tester report.')
  }
}

function parseNum(raw: string | undefined | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Parses "775.74 (7.54%)" / "7.54% (775.74)" / "4 (393.06)" into its two numeric parts. */
function parseParenPair(raw: string | undefined): { outer: number | null; inner: number | null } {
  if (!raw) return { outer: null, inner: null }
  const m = raw.match(/^(-?[\d,.]+)%?\s*\((-?[\d,.]+)%?\)\s*$/)
  if (!m) return { outer: parseNum(raw), inner: null }
  return { outer: parseNum(m[1]), inner: parseNum(m[2]) }
}

function parseMT4DateTime(raw: string | undefined): string | null {
  if (!raw) return null
  const m = raw.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, y, mo, d, hh, mm] = m
  return `${y}-${mo}-${d}T${hh}:${mm}:00`
}

function parseMT4Date(raw: string | undefined): string | null {
  if (!raw) return null
  const m = raw.trim().match(/^(\d{4})\.(\d{2})\.(\d{2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  return `${y}-${mo}-${d}`
}

/** Builds a label -> value map from a summary <table>'s rows, handling MT4's
 *  reused row-prefix labels ("Largest"/"Average"/"Maximum"/"Maximal" apply to
 *  both column-pairs in that row). */
function buildLabelMap(table: HTMLTableElement): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of Array.from(table.rows)) {
    const cells = Array.from(row.cells)
      .map((c) => c.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter((t) => t.length > 0)
    if (cells.length === 0) continue

    if (cells.length % 2 === 1 && ROW_PREFIXES.has(cells[0])) {
      const prefix = cells[0]
      for (let i = 1; i + 1 < cells.length; i += 2) {
        map.set(`${prefix} ${cells[i]}`, cells[i + 1])
      }
      continue
    }
    for (let i = 0; i + 1 < cells.length; i += 2) {
      map.set(cells[i], cells[i + 1])
    }
  }
  return map
}

function parseParameters(raw: string | undefined): Record<string, string> {
  const params: Record<string, string> = {}
  if (!raw) return params
  const flat = raw.replace(/\s+/g, ' ').trim()
  for (const segment of flat.split(';')) {
    const trimmed = segment.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    if (key) params[key] = value
  }
  return params
}

function parsePeriod(raw: string | undefined): {
  timeframe: string | null
  testStart: string | null
  testEnd: string | null
} {
  if (!raw) return { timeframe: null, testStart: null, testEnd: null }
  const timeframeMatch = raw.match(/\(([A-Za-z0-9]+)\)/)
  const rangeMatch = raw.match(/\((\d{4}\.\d{2}\.\d{2})\s*-\s*(\d{4}\.\d{2}\.\d{2})\)\s*$/)
  return {
    timeframe: timeframeMatch ? timeframeMatch[1] : null,
    testStart: rangeMatch ? parseMT4Date(rangeMatch[1]) : null,
    testEnd: rangeMatch ? parseMT4Date(rangeMatch[2]) : null,
  }
}

function findTradesTable(tables: HTMLTableElement[]): HTMLTableElement | null {
  return (
    tables.find((t) => {
      const headerText = t.rows[0]?.textContent ?? ''
      return headerText.includes('Time') && headerText.includes('Balance')
    }) ?? tables[1] ?? null
  )
}

function buildTrades(tradesTable: HTMLTableElement | null): Trade[] {
  if (!tradesTable) return []
  const trades: Trade[] = []
  const rows = Array.from(tradesTable.rows).slice(1) // skip header row
  for (const row of rows) {
    const values = Array.from(row.cells).map((c) => c.textContent?.trim() ?? '')
    if (values.length < 10) continue // "open" row — no profit/balance yet, skip (closing row has the full picture)
    const seq = parseNum(values[0])
    const balance = parseNum(values[9])
    const profit = parseNum(values[8])
    if (seq === null || balance === null) continue
    trades.push({
      seq,
      time: parseMT4DateTime(values[1]),
      type: values[2] || null,
      order: parseNum(values[3]),
      size: parseNum(values[4]),
      price: parseNum(values[5]),
      sl: parseNum(values[6]),
      tp: parseNum(values[7]),
      profit: profit ?? 0,
      balance,
    })
  }
  return trades
}

/** Parses the contents of an MT4 Strategy Tester .htm report into structured data.
 *  Throws ReportParseError only if the file doesn't look like a tester report at all;
 *  individual missing/unexpected fields are recorded in `warnings` instead of throwing,
 *  so a slightly different report layout still saves (the raw file is kept regardless). */
export function parseReport(html: string): ParsedReport {
  if (!html.includes(REPORT_MARKER)) {
    throw new ReportParseError('This file does not look like an MT4 Strategy Tester report.')
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const warnings: string[] = []

  const titleMatch = doc.title.match(/Strategy Tester:\s*(.+)/)
  const eaName = titleMatch ? titleMatch[1].trim() : null
  const broker = doc.querySelector('meta[name="server"]')?.getAttribute('content') ?? null
  const build = doc.querySelector('meta[name="version"]')?.getAttribute('content') ?? null

  const tables = Array.from(doc.querySelectorAll('table')) as HTMLTableElement[]
  const tradesTable = findTradesTable(tables)
  const summaryTable = tables.find((t) => t !== tradesTable) ?? tables[0] ?? null

  if (!summaryTable) {
    warnings.push('Could not locate the summary table.')
  }
  const labels = summaryTable ? buildLabelMap(summaryTable) : new Map<string, string>()

  const period = parsePeriod(labels.get('Period'))
  const { outer: maxDrawdown, inner: maxDrawdownPct } = parseParenPair(labels.get('Maximal drawdown'))
  const { outer: relativeDrawdownPct, inner: relativeDrawdown } = parseParenPair(labels.get('Relative drawdown'))
  const { outer: shortTrades, inner: shortWinPct } = parseParenPair(labels.get('Short positions (won %)'))
  const { outer: longTrades, inner: longWinPct } = parseParenPair(labels.get('Long positions (won %)'))
  const { outer: profitTrades, inner: profitTradesPct } = parseParenPair(labels.get('Profit trades (% of total)'))
  const { outer: lossTrades, inner: lossTradesPct } = parseParenPair(labels.get('Loss trades (% of total)'))
  const { outer: maxConsecutiveWins, inner: maxConsecutiveWinsMoney } = parseParenPair(
    labels.get('Maximum consecutive wins (profit in money)'),
  )
  const { outer: maxConsecutiveLosses, inner: maxConsecutiveLossesMoney } = parseParenPair(
    labels.get('Maximum consecutive losses (loss in money)'),
  )

  for (const required of ['Symbol', 'Total trades', 'Total net profit']) {
    if (!labels.has(required)) warnings.push(`Missing expected field: "${required}".`)
  }

  const parametersRaw = labels.get('Parameters') ?? null

  return {
    eaName,
    broker,
    build,
    symbol: labels.get('Symbol') ?? null,
    timeframe: period.timeframe,
    model: labels.get('Model') ?? null,
    testStart: period.testStart,
    testEnd: period.testEnd,
    initialDeposit: parseNum(labels.get('Initial deposit')),
    spread: labels.get('Spread') ?? null,

    parametersRaw,
    parameters: parseParameters(parametersRaw ?? undefined),

    netProfit: parseNum(labels.get('Total net profit')),
    grossProfit: parseNum(labels.get('Gross profit')),
    grossLoss: parseNum(labels.get('Gross loss')),
    profitFactor: parseNum(labels.get('Profit factor')),
    expectedPayoff: parseNum(labels.get('Expected payoff')),
    absoluteDrawdown: parseNum(labels.get('Absolute drawdown')),
    maxDrawdown,
    maxDrawdownPct,
    relativeDrawdownPct,
    relativeDrawdown,

    totalTrades: parseNum(labels.get('Total trades')),
    shortTrades,
    shortWinPct,
    longTrades,
    longWinPct,
    profitTrades,
    profitTradesPct,
    lossTrades,
    lossTradesPct,

    largestProfitTrade: parseNum(labels.get('Largest profit trade')),
    largestLossTrade: parseNum(labels.get('Largest loss trade')),
    averageProfitTrade: parseNum(labels.get('Average profit trade')),
    averageLossTrade: parseNum(labels.get('Average loss trade')),

    maxConsecutiveWins,
    maxConsecutiveWinsMoney,
    maxConsecutiveLosses,
    maxConsecutiveLossesMoney,
    avgConsecutiveWins: parseNum(labels.get('Average consecutive wins')),
    avgConsecutiveLosses: parseNum(labels.get('Average consecutive losses')),

    trades: buildTrades(tradesTable),

    warnings,
  }
}
