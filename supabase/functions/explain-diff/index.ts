// Supabase Edge Function: given a script diff and the before/after backtest metrics, asks an LLM
// for a short plausible-explanation narrative. Requires a valid Supabase JWT (default verify_jwt
// behavior — only signed-in users of this project can call it); that JWT check is the actual
// access control. The only secret this function touches is NIM_API_KEY, set via
// `supabase secrets set`; it never touches the database, so it needs no service_role key.
//
// Uses NVIDIA NIM's free API catalog (build.nvidia.com) — an OpenAI-compatible endpoint serving
// open models (including Chinese-developed ones like Qwen/DeepSeek) at no cost under generous
// rate limits. NVIDIA's catalog changes over time, so the model is a secret too (NIM_MODEL) —
// override it with `supabase secrets set NIM_MODEL=...` without redeploying if the default below
// is ever retired.
import type { DiffMetrics } from '../_shared/diffMetrics.ts'

const MAX_DIFF_CHARS = 8000
const NIM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const DEFAULT_MODEL = 'qwen/qwen2.5-7b-instruct'

// CORS is defense-in-depth, not the access control (the JWT check above that job) — restricting
// it to known origins just means a browser won't hand a stolen/misdirected response to a page
// that has no business seeing it. Override/add to this via the ALLOWED_ORIGINS secret (comma
// separated) without redeploying, e.g. if this app is ever deployed to a different URL.
const DEFAULT_ALLOWED_ORIGINS = ['https://lxy0626.github.io', 'http://localhost:5173']

function getAllowedOrigins(): string[] {
  const fromEnv = Deno.env.get('ALLOWED_ORIGINS')
  return fromEnv ? fromEnv.split(',').map((o) => o.trim()) : DEFAULT_ALLOWED_ORIGINS
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowed = getAllowedOrigins().includes(origin) ? origin : DEFAULT_ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

interface RequestBody {
  eaName: string | null
  diff: string
  before: DiffMetrics
  after: DiffMetrics
}

function formatMetrics(m: DiffMetrics): string {
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

Write a short (150-250 word) plain-English explanation of which specific code change(s) most plausibly caused the metric changes above. Be concrete — reference the actual lines that changed, not generic trading advice. Explicitly hedge: this is a plausible correlation from one before/after pair, not a verified causal claim, and other factors (market conditions during each test period, randomness in trade selection) could also explain the difference. If the diff doesn't contain anything that plausibly explains the metric change, say so directly instead of guessing. Answer directly with the explanation only — no preamble, no chain-of-thought, no <think> tags.`
}

/** Some free/open reasoning models emit a <think>...</think> block before the real answer even
 *  when asked not to — strip it defensively so the UI never shows raw reasoning traces. */
function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  const cors = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, cors)

  try {
    const apiKey = Deno.env.get('NIM_API_KEY')
    if (!apiKey) return jsonResponse({ error: 'Server missing NIM_API_KEY.' }, 500, cors)
    const model = Deno.env.get('NIM_MODEL') || DEFAULT_MODEL

    const body = (await req.json()) as RequestBody
    if (!body.diff) return jsonResponse({ error: 'Missing diff in request body.' }, 400, cors)

    const nimRes = await fetch(NIM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.3,
        messages: [{ role: 'user', content: buildPrompt(body) }],
      }),
    })

    if (!nimRes.ok) {
      // Deliberately not forwarding NVIDIA's raw response body to the client — avoids leaking
      // upstream infra details, and Edge Function logs (Supabase dashboard) already capture it
      // for debugging.
      console.error('NVIDIA NIM API error:', nimRes.status, await nimRes.text())
      return jsonResponse({ error: 'The AI provider request failed. Check the function logs.' }, 502, cors)
    }

    const data = await nimRes.json()
    const raw: string = data.choices?.[0]?.message?.content ?? ''
    const summary = stripThinking(raw)

    return jsonResponse({ summary }, 200, cors)
  } catch (err) {
    console.error('explain-diff error:', err)
    return jsonResponse({ error: 'Unexpected server error. Check the function logs.' }, 500, cors)
  }
})
