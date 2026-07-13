/** A closed trade row from the trade-by-trade table (rows with a Balance value). */
export interface Trade {
  seq: number
  time: string | null
  type: string | null
  order: number | null
  size: number | null
  price: number | null
  sl: number | null
  tp: number | null
  profit: number
  balance: number
}

/** Fields extracted from an uploaded MT4 Strategy Tester .htm report. */
export interface ParsedReport {
  eaName: string | null
  broker: string | null
  build: string | null
  symbol: string | null
  timeframe: string | null
  model: string | null
  testStart: string | null
  testEnd: string | null
  initialDeposit: number | null
  spread: string | null

  parametersRaw: string | null
  parameters: Record<string, string>

  netProfit: number | null
  grossProfit: number | null
  grossLoss: number | null
  profitFactor: number | null
  expectedPayoff: number | null
  absoluteDrawdown: number | null
  maxDrawdown: number | null
  maxDrawdownPct: number | null
  relativeDrawdownPct: number | null
  relativeDrawdown: number | null

  totalTrades: number | null
  shortTrades: number | null
  shortWinPct: number | null
  longTrades: number | null
  longWinPct: number | null
  profitTrades: number | null
  profitTradesPct: number | null
  lossTrades: number | null
  lossTradesPct: number | null

  largestProfitTrade: number | null
  largestLossTrade: number | null
  averageProfitTrade: number | null
  averageLossTrade: number | null

  maxConsecutiveWins: number | null
  maxConsecutiveWinsMoney: number | null
  maxConsecutiveLosses: number | null
  maxConsecutiveLossesMoney: number | null
  avgConsecutiveWins: number | null
  avgConsecutiveLosses: number | null

  trades: Trade[]

  warnings: string[]
}

/** A saved report row as stored in / read from Supabase (`public.reports`). */
export interface Report {
  id: string
  user_id: string
  uploaded_at: string
  file_name: string
  storage_path: string
  tag: string | null
  notes: string | null

  ea_name: string | null
  broker: string | null
  build: string | null
  symbol: string | null
  timeframe: string | null
  model: string | null
  test_start: string | null
  test_end: string | null
  initial_deposit: number | null
  spread: string | null

  parameters_raw: string | null
  parameters: Record<string, string> | null

  net_profit: number | null
  gross_profit: number | null
  gross_loss: number | null
  profit_factor: number | null
  expected_payoff: number | null
  absolute_drawdown: number | null
  max_drawdown: number | null
  max_drawdown_pct: number | null
  relative_drawdown_pct: number | null
  relative_drawdown: number | null

  total_trades: number | null
  short_trades: number | null
  short_win_pct: number | null
  long_trades: number | null
  long_win_pct: number | null
  profit_trades: number | null
  profit_trades_pct: number | null
  loss_trades: number | null
  loss_trades_pct: number | null

  largest_profit_trade: number | null
  largest_loss_trade: number | null
  average_profit_trade: number | null
  average_loss_trade: number | null

  max_consecutive_wins: number | null
  max_consecutive_wins_money: number | null
  max_consecutive_losses: number | null
  max_consecutive_losses_money: number | null
  avg_consecutive_wins: number | null
  avg_consecutive_losses: number | null

  trades: Trade[]
}
