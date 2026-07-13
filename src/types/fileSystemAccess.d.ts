// Minimal ambient types for the File System Access API (Chromium-only, not yet
// part of TypeScript's standard DOM lib). Only the surface this app uses.

interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemFileHandle {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<File>
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<'granted' | 'denied' | 'prompt'>
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<'granted' | 'denied' | 'prompt'>
  isSameEntry(other: FileSystemFileHandle): Promise<boolean>
}

interface OpenFilePickerOptions {
  types?: { description?: string; accept: Record<string, string[]> }[]
  excludeAcceptAllOption?: boolean
  multiple?: boolean
}

interface Window {
  showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>
}
