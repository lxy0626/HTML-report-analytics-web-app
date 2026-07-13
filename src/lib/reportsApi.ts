import type { ParsedReport, Report } from '../types/report'
import { REPORTS_BUCKET, supabase } from './supabaseClient'

export async function listReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('uploaded_at', { ascending: true })
  if (error) throw error
  return data as Report[]
}

export async function getReport(id: string): Promise<Report> {
  const { data, error } = await supabase.from('reports').select('*').eq('id', id).single()
  if (error) throw error
  return data as Report
}

export async function deleteReport(report: Report): Promise<void> {
  await supabase.storage.from(REPORTS_BUCKET).remove([report.storage_path])
  const { error } = await supabase.from('reports').delete().eq('id', report.id)
  if (error) throw error
}

/** Short-lived signed URL for viewing/downloading the original uploaded file. */
export async function getSignedReportUrl(report: Report): Promise<string> {
  const { data, error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(report.storage_path, 60)
  if (error) throw error
  return data.signedUrl
}

export interface SaveReportInput {
  file: File
  parsed: ParsedReport
  tag: string | null
  notes: string | null
}

export async function saveReport({ file, parsed, tag, notes }: SaveReportInput): Promise<Report> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Not signed in.')

  const reportId = crypto.randomUUID()
  const storagePath = `${user.id}/${reportId}.htm`

  const { error: uploadError } = await supabase.storage.from(REPORTS_BUCKET).upload(storagePath, file, {
    contentType: 'text/html',
    upsert: false,
  })
  if (uploadError) throw uploadError

  const row = {
    id: reportId,
    user_id: user.id,
    file_name: file.name,
    storage_path: storagePath,
    tag,
    notes,
    ea_name: parsed.eaName,
    broker: parsed.broker,
    build: parsed.build,
    symbol: parsed.symbol,
    timeframe: parsed.timeframe,
    model: parsed.model,
    test_start: parsed.testStart,
    test_end: parsed.testEnd,
    initial_deposit: parsed.initialDeposit,
    spread: parsed.spread,
    parameters_raw: parsed.parametersRaw,
    parameters: parsed.parameters,
    net_profit: parsed.netProfit,
    gross_profit: parsed.grossProfit,
    gross_loss: parsed.grossLoss,
    profit_factor: parsed.profitFactor,
    expected_payoff: parsed.expectedPayoff,
    absolute_drawdown: parsed.absoluteDrawdown,
    max_drawdown: parsed.maxDrawdown,
    max_drawdown_pct: parsed.maxDrawdownPct,
    relative_drawdown_pct: parsed.relativeDrawdownPct,
    relative_drawdown: parsed.relativeDrawdown,
    total_trades: parsed.totalTrades,
    short_trades: parsed.shortTrades,
    short_win_pct: parsed.shortWinPct,
    long_trades: parsed.longTrades,
    long_win_pct: parsed.longWinPct,
    profit_trades: parsed.profitTrades,
    profit_trades_pct: parsed.profitTradesPct,
    loss_trades: parsed.lossTrades,
    loss_trades_pct: parsed.lossTradesPct,
    largest_profit_trade: parsed.largestProfitTrade,
    largest_loss_trade: parsed.largestLossTrade,
    average_profit_trade: parsed.averageProfitTrade,
    average_loss_trade: parsed.averageLossTrade,
    max_consecutive_wins: parsed.maxConsecutiveWins,
    max_consecutive_wins_money: parsed.maxConsecutiveWinsMoney,
    max_consecutive_losses: parsed.maxConsecutiveLosses,
    max_consecutive_losses_money: parsed.maxConsecutiveLossesMoney,
    avg_consecutive_wins: parsed.avgConsecutiveWins,
    avg_consecutive_losses: parsed.avgConsecutiveLosses,
    trades: parsed.trades,
  }

  const { data, error } = await supabase.from('reports').insert(row).select().single()
  if (error) {
    await supabase.storage.from(REPORTS_BUCKET).remove([storagePath])
    throw error
  }
  return data as Report
}
