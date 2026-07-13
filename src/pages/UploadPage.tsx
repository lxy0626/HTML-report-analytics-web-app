import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../components/StatCard'
import { formatMoney, formatPct } from '../lib/format'
import { parseReport, ReportParseError, validateReportFile } from '../lib/parseReport'
import { saveReport } from '../lib/reportsApi'
import type { ParsedReport } from '../types/report'

export function UploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scriptInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedReport | null>(null)
  const [scriptFile, setScriptFile] = useState<File | null>(null)
  const [tag, setTag] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleFile(candidate: File) {
    setError(null)
    setParsed(null)
    try {
      validateReportFile(candidate)
      const text = await candidate.text()
      const result = parseReport(text)
      setFile(candidate)
      setParsed(result)
    } catch (err) {
      setFile(null)
      setError(err instanceof ReportParseError ? err.message : 'Could not read this file.')
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) void handleFile(dropped)
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) void handleFile(picked)
  }

  async function handleSave() {
    if (!file || !parsed) return
    setSaving(true)
    setError(null)
    try {
      const scriptSource = scriptFile ? await scriptFile.text() : null
      const report = await saveReport({
        file,
        parsed,
        tag: tag.trim() || null,
        notes: notes.trim() || null,
        scriptSource,
      })
      navigate(`/reports/${report.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the report.')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Upload a Strategy Tester report</h1>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
            : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900'
        }`}
      >
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Drop your <code>StrategyTester.htm</code> here, or click to choose a file
        </p>
        <p className="mt-1 text-xs text-slate-400">Only .htm / .html MT4 tester reports, up to 5MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".htm,.html"
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {parsed && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-semibold">{parsed.eaName ?? 'Unknown EA'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {parsed.symbol} · {parsed.timeframe} · {parsed.testStart} → {parsed.testEnd}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Net profit"
              value={formatMoney(parsed.netProfit)}
              tone={(parsed.netProfit ?? 0) >= 0 ? 'positive' : 'negative'}
            />
            <StatCard label="Profit factor" value={parsed.profitFactor?.toFixed(2) ?? '—'} />
            <StatCard label="Max drawdown" value={formatPct(parsed.maxDrawdownPct)} tone="negative" />
            <StatCard label="Total trades" value={String(parsed.totalTrades ?? '—')} />
          </div>

          {parsed.warnings.length > 0 && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <p className="font-medium">Parsed with warnings:</p>
              <ul className="ml-4 list-disc">
                {parsed.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              EA script <span className="font-normal text-slate-400">(optional — enables script diffing between runs)</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scriptInputRef.current?.click()}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Attach .mq4 / .mq5
              </button>
              {scriptFile && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{scriptFile.name}</span>
              )}
              <input
                ref={scriptInputRef}
                type="file"
                accept=".mq4,.mq5"
                className="hidden"
                onChange={(e) => setScriptFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tag <span className="font-normal text-slate-400">(optional — e.g. "v12, tightened SL")</span>
            </label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save report'}
          </button>
        </div>
      )}
    </div>
  )
}
