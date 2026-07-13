import { buildReportRow } from './reportRow'
import type { ParsedReport, Report } from '../types/report'
import { REPORTS_BUCKET, supabase } from './supabaseClient'

export async function listReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('uploaded_at', { ascending: true })
  if (error) throw error
  return data as Report[]
}

export async function getReport(id: string): Promise<Report> {
  const { data, error } = await supabase.from('reports').select('*').eq('id', id).single()
  if (error) throw error
  return data as Report
}

/** The chronologically previous report (by uploaded_at), if any — used for the "vs. previous
 *  run" script diff on the detail page. */
export async function getPreviousReport(report: Report): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .lt('uploaded_at', report.uploaded_at)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as Report | null) ?? null
}

export async function saveAiSummary(reportId: string, summary: string): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .update({ ai_summary: summary, ai_summary_generated_at: new Date().toISOString() })
    .eq('id', reportId)
  if (error) throw error
}

export async function deleteReport(report: Report): Promise<void> {
  await supabase.storage.from(REPORTS_BUCKET).remove([report.storage_path])
  const { error } = await supabase.from('reports').delete().eq('id', report.id)
  if (error) throw error
}

/** Short-lived signed URL for viewing/downloading the original uploaded file. */
export async function getSignedReportUrl(report: Report): Promise<string> {
  const { data, error } = await supabase.storage
    .from(REPORTS_BUCKET)
    .createSignedUrl(report.storage_path, 60)
  if (error) throw error
  return data.signedUrl
}

export interface SaveReportInput {
  file: File
  parsed: ParsedReport
  tag: string | null
  notes: string | null
  scriptSource?: string | null
}

export async function saveReport({ file, parsed, tag, notes, scriptSource = null }: SaveReportInput): Promise<Report> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Not signed in.')

  const reportId = crypto.randomUUID()
  const storagePath = `${user.id}/${reportId}.htm`

  const { error: uploadError } = await supabase.storage.from(REPORTS_BUCKET).upload(storagePath, file, {
    contentType: 'text/html',
    upsert: false,
  })
  if (uploadError) throw uploadError

  const row = buildReportRow({
    id: reportId,
    userId: user.id,
    fileName: file.name,
    storagePath,
    tag,
    notes,
    parsed,
    scriptSource,
  })

  const { data, error } = await supabase.from('reports').insert(row).select().single()
  if (error) {
    await supabase.storage.from(REPORTS_BUCKET).remove([storagePath])
    throw error
  }
  return data as Report
}
