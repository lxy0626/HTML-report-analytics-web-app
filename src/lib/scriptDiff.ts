import { diffLines } from 'diff'

export interface DiffLine {
  text: string
  kind: 'added' | 'removed' | 'context'
}

/** Line-level diff between two script snapshots, flattened to one entry per line
 *  (rather than one per diffLines hunk) so the UI can render/scroll line-by-line. */
export function computeScriptDiff(before: string, after: string): DiffLine[] {
  const changes = diffLines(before, after)
  const lines: DiffLine[] = []
  for (const change of changes) {
    const kind = change.added ? 'added' : change.removed ? 'removed' : 'context'
    const chunkLines = change.value.split('\n')
    if (chunkLines[chunkLines.length - 1] === '') chunkLines.pop() // trailing newline artifact
    for (const text of chunkLines) lines.push({ text, kind })
  }
  return lines
}

/** Whether two scripts actually differ (used to skip rendering a diff for identical snapshots). */
export function scriptsDiffer(before: string, after: string): boolean {
  return before !== after
}

/** Renders the diff as a compact +/- text block, cheaper to send to the AI summary endpoint
 *  than the full before+after source. */
export function diffToText(before: string, after: string): string {
  return computeScriptDiff(before, after)
    .map((l) => `${l.kind === 'added' ? '+' : l.kind === 'removed' ? '-' : ' '} ${l.text}`)
    .join('\n')
}
