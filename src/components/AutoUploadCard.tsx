import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  clearSavedHandle,
  getLastUploadedMtime,
  hasReadPermission,
  isFileSystemAccessSupported,
  loadSavedHandle,
  pickReportFile,
  requestReadPermission,
  setLastUploadedMtime,
} from '../lib/fileWatcher'
import { parseReport, ReportParseError } from '../lib/parseReport'
import { saveReport } from '../lib/reportsApi'

const POLL_MS = 3000

type Status = 'checking' | 'unsupported' | 'no-handle' | 'needs-permission' | 'idle' | 'watching'

export function AutoUploadCard({ onUploaded }: { onUploaded?: () => void }) {
  const [status, setStatus] = useState<Status>('checking')
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const lastMtimeRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isFileSystemAccessSupported()) {
      setStatus('unsupported')
      return
    }
    lastMtimeRef.current = getLastUploadedMtime()
    loadSavedHandle()
      .then(async (saved) => {
        if (!saved) {
          setStatus('no-handle')
          return
        }
        setHandle(saved)
        setStatus((await hasReadPermission(saved)) ? 'idle' : 'needs-permission')
      })
      .catch(() => setStatus('no-handle'))

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  function stopWatching() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  async function handleChoose() {
    try {
      const picked = await pickReportFile()
      setHandle(picked)
      setStatus('idle')
      setMessage(null)
    } catch {
      // user cancelled the file picker
    }
  }

  async function handleGrant() {
    if (!handle) return
    setStatus((await requestReadPermission(handle)) ? 'idle' : 'needs-permission')
  }

  async function handleForget() {
    stopWatching()
    await clearSavedHandle()
    setHandle(null)
    setMessage(null)
    setStatus('no-handle')
  }

  async function checkOnce() {
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

      await saveReport({ file, parsed, tag: null, notes: 'Auto-uploaded from browser watcher' })
      setMessage(
        `Uploaded new report at ${new Date().toLocaleTimeString()} — net profit ${parsed.netProfit ?? '—'}, profit factor ${parsed.profitFactor ?? '—'}`,
      )
      onUploaded?.()
    } catch (err) {
      if (err instanceof ReportParseError) return // probably mid-write; try again next poll
      setMessage(err instanceof Error ? `Error: ${err.message}` : 'Unexpected error while checking the file.')
    }
  }

  function handleStart() {
    setStatus('watching')
    void checkOnce()
    intervalRef.current = setInterval(() => void checkOnce(), POLL_MS)
  }

  function handleStop() {
    stopWatching()
    setStatus('idle')
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Auto-upload
      </p>

      {status === 'checking' && <p className="text-sm text-slate-400">Checking browser support…</p>}

      {status === 'unsupported' && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Your browser doesn't support watching local files (this needs Chrome or Edge). Use the{' '}
          <Link to="/upload" className="text-indigo-600 underline dark:text-indigo-400">
            Upload
          </Link>{' '}
          page instead.
        </p>
      )}

      {status === 'no-handle' && (
        <div>
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Pick your <code>StrategyTester.htm</code> once, and this page will watch it for changes and
            upload automatically while this tab is open.
          </p>
          <button
            onClick={() => void handleChoose()}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            Choose report file
          </button>
        </div>
      )}

      {status === 'needs-permission' && (
        <div>
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Previously selected <span className="font-medium">{handle?.name}</span>. Re-grant access to
            resume watching it.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => void handleGrant()}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Grant access
            </button>
            <button
              onClick={() => void handleForget()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Choose a different file
            </button>
          </div>
        </div>
      )}

      {(status === 'idle' || status === 'watching') && (
        <div>
          <p className="mb-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">File: </span>
            <span className="font-medium">{handle?.name}</span>
          </p>
          <div className="mb-2 flex gap-2">
            {status === 'idle' ? (
              <button
                onClick={handleStart}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                Start watching
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Stop watching
              </button>
            )}
            <button
              onClick={() => void handleForget()}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Forget file
            </button>
          </div>
          {status === 'watching' && (
            <p className="text-xs text-slate-400">
              Watching — checked {lastChecked ? lastChecked.toLocaleTimeString() : 'never yet'}. Leave this
              tab open while you test; closing it stops watching.
            </p>
          )}
        </div>
      )}

      {message && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
    </div>
  )
}
