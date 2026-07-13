// Supabase Edge Function: given a script diff and the before/after backtest metrics, asks
// Claude for a short plausible-explanation narrative. Requires a valid Supabase JWT (default
// verify_jwt behavior — only signed-in users of this project can call it). The only secret this
// function touches is ANTHROPIC_API_KEY, set via `supabase secrets set`; it never touches the
// database, so it needs no service_role key.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_DIFF_CHARS = 8000
const MODEL = 'claude-haiku-4-5-20251001'

interface Metrics {
  netProfit: number | null
  profitFactor: number | null
  maxDrawdownPct: number | null
  winRatePct: number | null
  totalTrades: number | null
  expectedPayoff: number | null
}

interface RequestBody {
  eaName: string | null
  diff: string
  before: Metrics
  after: Metrics
}

function formatMetrics(m: Metrics): string {
  return [
    `net profit: ${m.netProfit ?? 'n/a'}`,
    `profit factor: ${m.profitFactor ?? 'n/a'}`,
    `max drawdown %: ${m.maxDrawdownPct ?? 'n/a'}`,
    `win rate %: ${m.winRatePct ?? 'n/a'}`,
    `total trades: ${m.totalTrades ?? 'n/a'}`,
    `expected payoff: ${m.expectedPayoff ?? 'n/a'}`,
  ].join(', ')
}

function buildPrompt(body: RequestBody): string {
  const diff =
    body.diff.length > MAX_DIFF_CHARS
      ? `${body.diff.slice(0, MAX_DIFF_CHARS)}\n... (diff truncated for length)`
      : body.diff

  return `You are analyzing two backtests of the same MetaTrader EA${body.eaName ? ` ("${body.eaName}")` : ''}, run before and after a source code change.

Metrics before: ${formatMetrics(body.before)}
Metrics after: ${formatMetrics(body.after)}

Source diff (unified, + is added / - is removed):
\`\`\`
${diff}
\`\`\`

Write a short (150-250 word) plain-English explanation of which specific code change(s) most plausibly caused the metric changes above. Be concrete — reference the actual lines that changed, not generic trading advice. Explicitly hedge: this is a plausible correlation from one before/after pair, not a verified causal claim, and other factors (market conditions during each test period, randomness in trade selection) could also explain the difference. If the diff doesn't contain anything that plausibly explains the metric change, say so directly instead of guessing.`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server missing ANTHROPIC_API_KEY.' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      })
    }

    const body = (await req.json()) as RequestBody
    if (!body.diff) {
      return new Response(JSON.stringify({ error: 'Missing diff in request body.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      })
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: buildPrompt(body) }],
      }),
    })

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text()
      return new Response(JSON.stringify({ error: `Anthropic API error: ${text}` }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      })
    }

    const data = await anthropicRes.json()
    const summary: string = data.content?.[0]?.text ?? ''

    return new Response(JSON.stringify({ summary }), {
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }
})
