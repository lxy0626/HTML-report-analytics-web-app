import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseReport, ReportParseError, validateReportFile } from '../parseReport'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtureHtml = readFileSync(join(__dirname, '../fixtures/sample-report.htm'), 'utf-8')

describe('parseReport', () => {
  const parsed = parseReport(fixtureHtml)

  it('extracts report identity fields', () => {
    expect(parsed.eaName).toBe('CustomEA_SupplyDemand_NewsAware')
    expect(parsed.broker).toBe('RoboForex-DemoPro')
    expect(parsed.build).toBe('Build 1473')
    expect(parsed.symbol).toBe('XAUUSD (Gold vs US Dollar)')
  })

  it('extracts the test period', () => {
    expect(parsed.timeframe).toBe('M15')
    expect(parsed.testStart).toBe('2020-01-01')
    expect(parsed.testEnd).toBe('2026-07-07')
  })

  it('parses the parameters string into a map', () => {
    expect(parsed.parameters.MagicNumber).toBe('882412')
    expect(parsed.parameters.Risk_Percent_Per_Trade).toBe('0.3')
    expect(parsed.parameters.RR2).toBe('4.5')
  })

  it('extracts core profitability metrics', () => {
    expect(parsed.netProfit).toBe(693.09)
    expect(parsed.grossProfit).toBe(5582.58)
    expect(parsed.grossLoss).toBe(-4889.49)
    expect(parsed.profitFactor).toBe(1.14)
    expect(parsed.expectedPayoff).toBe(3.19)
  })

  it('parses paired parenthetical values in either order', () => {
    expect(parsed.maxDrawdown).toBe(775.74)
    expect(parsed.maxDrawdownPct).toBe(7.54)
    expect(parsed.relativeDrawdownPct).toBe(7.54)
    expect(parsed.relativeDrawdown).toBe(775.74)
  })

  it('disambiguates reused row-prefix labels (Largest/Average/Maximum)', () => {
    expect(parsed.largestProfitTrade).toBe(177.32)
    expect(parsed.largestLossTrade).toBe(-65.7)
    expect(parsed.averageProfitTrade).toBe(111.65)
    expect(parsed.averageLossTrade).toBe(-29.28)
    expect(parsed.maxConsecutiveWins).toBe(4)
    expect(parsed.maxConsecutiveWinsMoney).toBe(393.06)
    expect(parsed.maxConsecutiveLosses).toBe(26)
    expect(parsed.maxConsecutiveLossesMoney).toBe(-587.09)
    expect(parsed.avgConsecutiveWins).toBe(1)
    expect(parsed.avgConsecutiveLosses).toBe(4)
  })

  it('extracts trade counts and win rates', () => {
    expect(parsed.totalTrades).toBe(217)
    expect(parsed.shortTrades).toBe(82)
    expect(parsed.shortWinPct).toBe(20.73)
    expect(parsed.longTrades).toBe(135)
    expect(parsed.longWinPct).toBe(24.44)
    expect(parsed.profitTrades).toBe(50)
    expect(parsed.profitTradesPct).toBe(23.04)
    expect(parsed.lossTrades).toBe(167)
    expect(parsed.lossTradesPct).toBe(76.96)
  })

  it('builds trade rows only from closed trades (rows with a balance)', () => {
    expect(parsed.trades).toHaveLength(2)
    expect(parsed.trades[0]).toEqual({
      seq: 2,
      time: '2020-01-03T03:45:00',
      type: 't/p',
      order: 1,
      size: 0.1,
      price: 1531.94,
      sl: 1517.39,
      tp: 1531.94,
      profit: 110.4,
      balance: 10110.4,
    })
    expect(parsed.trades[1].balance).toBe(10074.14)
  })

  it('has no warnings for a well-formed report', () => {
    expect(parsed.warnings).toEqual([])
  })

  it('rejects files that are not a Strategy Tester report', () => {
    expect(() => parseReport('<html><body>not a report</body></html>')).toThrow(ReportParseError)
  })
})

describe('validateReportFile', () => {
  it('accepts .htm and .html files', () => {
    expect(() => validateReportFile(new File(['x'], 'StrategyTester.htm'))).not.toThrow()
    expect(() => validateReportFile(new File(['x'], 'report.html'))).not.toThrow()
  })

  it('rejects other extensions', () => {
    expect(() => validateReportFile(new File(['x'], 'report.pdf'))).toThrow(ReportParseError)
  })

  it('rejects oversized files', () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'StrategyTester.htm')
    expect(() => validateReportFile(big)).toThrow(ReportParseError)
  })
})
