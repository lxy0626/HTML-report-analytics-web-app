import { useEffect, useRef, useState } from 'react'
import { clearSavedHandle, hasReadPermission, loadSavedHandle, requestReadPermission, type HandleSlot } from './fileWatcher'

export type FileHandleStatus = 'loading' | 'no-handle' | 'needs-permission' | 'ready'

/** Manages the load-from-IndexedDB / permission-check / choose / grant / forget lifecycle for a
 *  single named FileSystemFileHandle slot (see fileWatcher.ts's HandleSlot). Shared by both the
 *  report-file and script-file pickers in AutoUploadCard so that lifecycle only lives once.
 *  Exposes a ref (not just state) so callers reading the handle from inside a setInterval polling
 *  closure always see the latest value, not one captured at interval-creation time. */
export function useFileHandle(slot: HandleSlot, pickFile: () => Promise<FileSystemFileHandle>) {
  const [status, setStatus] = useState<FileHandleStatus>('loading')
  const [handle, setHandleState] = useState<FileSystemFileHandle | null>(null)
  const handleRef = useRef<FileSystemFileHandle | null>(null)

  function setHandle(h: FileSystemFileHandle | null) {
    handleRef.current = h
    setHandleState(h)
  }

  useEffect(() => {
    loadSavedHandle(slot)
      .then(async (saved) => {
        if (!saved) {
          setStatus('no-handle')
          return
        }
        setHandle(saved)
        setStatus((await hasReadPermission(saved)) ? 'ready' : 'needs-permission')
      })
      .catch(() => setStatus('no-handle'))
  }, [slot])

  async function choose() {
    try {
      const picked = await pickFile()
      setHandle(picked)
      setStatus('ready')
    } catch {
      // user cancelled the file picker
    }
  }

  async function grant() {
    if (!handleRef.current) return
    setStatus((await requestReadPermission(handleRef.current)) ? 'ready' : 'needs-permission')
  }

  async function forget() {
    await clearSavedHandle(slot)
    setHandle(null)
    setStatus('no-handle')
  }

  return { status, handle, handleRef, choose, grant, forget }
}
