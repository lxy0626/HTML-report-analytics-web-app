const DB_NAME = 'mt4-report-tracker'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'reportFileHandle'

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Persists the file handle across page reloads (IndexedDB can store handles; localStorage can't). */
export async function saveHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadSavedHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
    req.onsuccess = () => resolve((req.result as FileSystemFileHandle | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function clearSavedHandle(): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Opens the native file picker (requires a user gesture) and remembers the choice. */
export async function pickReportFile(): Promise<FileSystemFileHandle> {
  const [handle] = await window.showOpenFilePicker!({
    types: [{ description: 'MT4 Strategy Tester report', accept: { 'text/html': ['.htm', '.html'] } }],
    excludeAcceptAllOption: false,
    multiple: false,
  })
  await saveHandle(handle)
  return handle
}

export async function hasReadPermission(handle: FileSystemFileHandle): Promise<boolean> {
  return (await handle.queryPermission({ mode: 'read' })) === 'granted'
}

/** Must be called from a user gesture (e.g. a button click) or the browser will reject it. */
export async function requestReadPermission(handle: FileSystemFileHandle): Promise<boolean> {
  return (await handle.requestPermission({ mode: 'read' })) === 'granted'
}

const LAST_UPLOADED_MTIME_KEY = 'mt4-report-tracker:lastUploadedMtime'

/** Persisted across sessions so re-opening the tab doesn't re-upload an unchanged file. */
export function getLastUploadedMtime(): number | null {
  const raw = localStorage.getItem(LAST_UPLOADED_MTIME_KEY)
  return raw ? Number(raw) : null
}

export function setLastUploadedMtime(mtime: number): void {
  localStorage.setItem(LAST_UPLOADED_MTIME_KEY, String(mtime))
}
