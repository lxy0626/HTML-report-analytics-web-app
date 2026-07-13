import type { ParsedReport } from '../types/report'

export interface BuildReportRowInput {
  id: string
  userId: string
  fileName: string
  storagePath: string
  tag: string | null
  notes: string | null
  parsed: ParsedReport
}

/** Maps a ParsedReport into a `reports` table row. Pure — no Supabase client, no
 *  environment access — so both the browser app and the Node upload watcher
 *  (scripts/watchAndUpload.ts) can share the exact same mapping. */
export function buildReportRow({ id, userId, fileName, storagePath, tag, notes, parsed }: BuildReportRowInput) {
  return {
    id,
    user_id: userId,
    file_name: fileName,
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
}
