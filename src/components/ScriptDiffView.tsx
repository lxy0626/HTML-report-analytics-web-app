import { computeScriptDiff } from '../lib/scriptDiff'

const KIND_CLASSES: Record<string, string> = {
  added: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  removed: 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300',
  context: 'text-slate-500 dark:text-slate-400',
}

const KIND_PREFIX: Record<string, string> = {
  added: '+',
  removed: '-',
  context: ' ',
}

export function ScriptDiffView({ before, after }: { before: string; after: string }) {
  const lines = computeScriptDiff(before, after)

  if (lines.every((l) => l.kind === 'context')) {
    return <p className="text-sm text-slate-400">No changes between these two script versions.</p>
  }

  return (
    <div className="max-h-96 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 font-mono text-xs dark:border-slate-800 dark:bg-slate-950">
      {lines.map((line, i) => (
        <div key={i} className={`whitespace-pre px-2 py-0.5 ${KIND_CLASSES[line.kind]}`}>
          {KIND_PREFIX[line.kind]} {line.text}
        </div>
      ))}
    </div>
  )
}
