import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getLastUploadedMtime,
  isFileSystemAccessSupported,
  pickReportFile,
  pickScriptFile,
  setLastUploadedMtime,
} from '../lib/fileWatcher'
import { errorMessage } from '../lib/format'
import { parseReport, ReportParseError } from '../lib/parseReport'
import { saveReport } from '../lib/reportsApi'
import { useFileHandle } from '../lib/useFileHandle'

const POLL_MS = 3000

export function AutoUploadCard({ onUploaded }: { onUploaded?: () => void }) {
  const supported = isFileSystemAccessSupported()
  const report = useFileHandle('report', pickReportFile)
  const script = useFileHandle('script', pickScriptFile)

  const [watching, setWatching] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const lastMtimeRef = useRef<number | null>(getLastUploadedMtime())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopWatching() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setWatching(false)
  }

  async function handleForgetReport() {
    stopWatching()
    await report.forget()
    setMessage(null)
  }

  async function checkOnce() {
    const handle = report.handleRef.current
    if (!handle) return
    try {
      const file = await handle.getFile()
      setLastChecked(new Date())
      if (lastMtimeRef.current === file.lastModified) return

      const html = await file.text()
      if (!/<\/html>\s*$/i.test(html.trim())) return // still being written; try again next poll

      const parsed = parseReport(html)
      lastMtimeRef.current = file.lastModified
      setLastUploadedMtime(file.lastModified)

      let scriptSource: string | null = null
      if (script.handleRef.current) {
        try {
          scriptSource = await (await script.handleRef.current.getFile()).text()
        } catch {
          // script read failed (e.g. permission revoked) — still upload the report without it
        }
      }

      await saveReport({
        file,
        parsed,
        tag: null,
        notes: 'Auto-uploaded from browser watcher',
        scriptSource,
      })
      setMessage(
        `Uploaded new report at ${new Date().toLocaleTimeString()} — net profit ${parsed.netProfit ?? '—'}, profit factor ${parsed.profitFactor ?? '—'}${scriptSource ? ' (with script snapshot)' : ''}`,
      )
      onUploaded?.()
    } catch (err) {
      if (err instanceof ReportParseError) return // probably mid-write; try again next poll
      setMessage(`Error: ${errorMessage(err, 'Unexpected error while checking the file.')}`)
    }
  }

  function handleStart() {
    setWatching(true)
    void checkOnce()
    intervalRef.current = setInterval(() => void checkOnce(), POLL_MS)
  }

  if (!supported) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Auto-upload
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your browser doesn't support watching local files (this needs Chrome or Edge). Use the{' '}
          <Link to="/upload" className="text-indigo-600 underline dark:text-indigo-400">
            Upload
          </Link>{' '}
          page instead.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Auto-upload
      </p>

      {report.status === 'loading' && <p className="text-sm text-slate-400">Loading…</p>}

      {report.status === 'no-handle' && (
        <div>
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Pick your <code>StrategyTester.htm</code> once, and this page will watch it for changes and
            upload automatically while this tab is open.
          </p>
          <button
            onClick={() => void report.choose()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            Choose report file
          </button>
        </div>
      )}

      {report.status === 'needs-permission' && (
        <div>
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Previously selected <span className="font-medium">{report.handle?.name}</span>. Re-grant access
            to resume watching it.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => void report.grant()}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Grant access
            </button>
            <button
              onClick={() => void handleForgetReport()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Choose a different file
            </button>
          </div>
        </div>
      )}

      {report.status === 'ready' && (
        <div>
          <p className="mb-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">File: </span>
            <span className="font-medium">{report.handle?.name}</span>
          </p>
          <div className="mb-2 flex gap-2">
            {!watching ? (
              <button
                onClick={handleStart}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                Start watching
              </button>
            ) : (
              <button
                onClick={stopWatching}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Stop watching
              </button>
            )}
            <button
              onClick={() => void handleForgetReport()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Forget file
            </button>
          </div>
          {watching && (
            <p className="text-xs text-slate-400">
              Watching — checked {lastChecked ? lastChecked.toLocaleTimeString() : 'never yet'}. Leave this
              tab open while you test; closing it stops watching.
            </p>
          )}
        </div>
      )}

      {message && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{message}</p>}

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
          EA script <span className="text-slate-400 dark:text-slate-500">(optional — enables script diffing between runs)</span>
        </p>
        {script.status === 'no-handle' && (
          <button
            onClick={() => void script.choose()}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Attach .mq4 / .mq5
          </button>
        )}
        {script.status === 'needs-permission' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{script.handle?.name}</span>
            <button
              onClick={() => void script.grant()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Re-grant access
            </button>
          </div>
        )}
        {script.status === 'ready' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Attached: <span className="font-medium">{script.handle?.name}</span>
            </span>
            <button
              onClick={() => void script.forget()}
              className="text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
