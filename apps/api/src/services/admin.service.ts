/**
 * Admin Service (UC-20+)
 *
 * Queries for CFS administrative staff — cross-organization views.
 */

import type { Pool } from 'pg'

export interface AdminApplicationRow {
  id: string
  reference_number: string
  organization_id: string
  organization_name: string
  application_type: string | null
  fiscal_year_code: string | null
  status_code: string
  program_name: string | null
  total_funding_requested: number | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

/**
 * List all non-Draft applications (admin view).
 * Joins with organizations to include org legal_name.
 * Supports optional filters: status, search (org name).
 */
export async function listAllApplications(
  pool: Pool,
  filters?: { status?: string; search?: string }
): Promise<AdminApplicationRow[]> {
  const conditions: string[] = ["a.status_code <> 'Draft'"]
  const params: any[] = []
  let idx = 1

  if (filters?.status) {
    conditions.push(`a.status_code = $${idx}`)
    params.push(filters.status)
    idx++
  }

  if (filters?.search) {
    conditions.push(`o.legal_name ILIKE $${idx}`)
    params.push(`%${filters.search}%`)
    idx++
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await pool.query(
    `SELECT a.id, a.reference_number, a.organization_id,
            o.legal_name AS organization_name,
            a.application_type, a.fiscal_year_code, a.status_code,
            a.program_name, a.total_funding_requested,
            a.submitted_at, a.created_at, a.updated_at
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     ${where}
     ORDER BY a.submitted_at DESC NULLS LAST, a.created_at DESC`,
    params
  )
  return result.rows
}

/**
 * Get full application detail for admin (UC-21).
 * No organization scoping — admin can view any non-Draft app.
 * Returns application with budget lines and org name.
 */
export async function getAdminApplicationDetail(
  pool: Pool,
  applicationId: string
): Promise<any | null> {
  const appResult = await pool.query(
    `SELECT a.*, o.legal_name AS organization_name
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     WHERE a.id = $1 AND a.status_code <> 'Draft'`,
    [applicationId]
  )
  if (appResult.rows.length === 0) return null

  const app = appResult.rows[0]

  const budgetResult = await pool.query(
    `SELECT id, category, description, annual_amount
     FROM app.budget_line_items
     WHERE application_id = $1
     ORDER BY sort_order, created_at`,
    [applicationId]
  )
  app.budget_lines = budgetResult.rows

  return app
}

/**
 * Get status history for an application (admin — no org scoping).
 */
export async function getAdminStatusHistory(
  pool: Pool,
  applicationId: string
): Promise<any[] | null> {
  const appCheck = await pool.query(
    "SELECT id FROM app.applications WHERE id = $1 AND status_code <> 'Draft'",
    [applicationId]
  )
  if (appCheck.rows.length === 0) return null

  const result = await pool.query(
    `SELECT id, application_id, from_status, to_status,
            changed_by_user_id, changed_by_role, note, changed_at
     FROM app.status_history
     WHERE application_id = $1
     ORDER BY changed_at ASC`,
    [applicationId]
  )
  return result.rows
}

/**
 * Get messages for an application (admin — no org scoping).
 */
export async function getAdminMessages(
  pool: Pool,
  applicationId: string
): Promise<any[] | null> {
  const appCheck = await pool.query(
    "SELECT id FROM app.applications WHERE id = $1 AND status_code <> 'Draft'",
    [applicationId]
  )
  if (appCheck.rows.length === 0) return null

  const result = await pool.query(
    `SELECT id, application_id, sender_user_id, sender_role, subject, body, is_read, sent_at
     FROM app.messages
     WHERE application_id = $1
     ORDER BY sent_at ASC`,
    [applicationId]
  )
  return result.rows
}

// --- Internal Notes (UC-21) ---

export interface InternalNote {
  id: string
  application_id: string
  author_user_id: string
  note_text: string
  created_at: string
}

/**
 * List internal notes for an application (admin only).
 */
export async function listInternalNotes(
  pool: Pool,
  applicationId: string
): Promise<InternalNote[] | null> {
  const appCheck = await pool.query(
    "SELECT id FROM app.applications WHERE id = $1",
    [applicationId]
  )
  if (appCheck.rows.length === 0) return null

  const result = await pool.query(
    `SELECT id, application_id, author_user_id, note_text, created_at
     FROM app.internal_notes
     WHERE application_id = $1
     ORDER BY created_at DESC`,
    [applicationId]
  )
  return result.rows
}

/**
 * Add an internal note to an application (admin only).
 */
export async function addInternalNote(
  pool: Pool,
  applicationId: string,
  authorUserId: string,
  noteText: string
): Promise<InternalNote | null> {
  const appCheck = await pool.query(
    "SELECT id FROM app.applications WHERE id = $1",
    [applicationId]
  )
  if (appCheck.rows.length === 0) return null

  const result = await pool.query(
    `INSERT INTO app.internal_notes (application_id, author_user_id, note_text)
     VALUES ($1, $2, $3)
     RETURNING id, application_id, author_user_id, note_text, created_at`,
    [applicationId, authorUserId, noteText]
  )
  return result.rows[0]
}

// --- Status Update (UC-22) ---

/**
 * BR-007 state machine: valid transitions keyed by current status.
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  Submitted: ['UnderReview'],
  UnderReview: ['MoreInfoRequired', 'Approved', 'Declined'],
  MoreInfoRequired: ['UnderReview']
  // Approved and Declined are terminal — no transitions allowed
}

/**
 * Update an application's status (admin only, BR-007 enforced).
 * Returns the updated application row or throws coded errors.
 */
export async function updateApplicationStatus(
  pool: Pool,
  applicationId: string,
  newStatus: string,
  adminUserId: string,
  note?: string
): Promise<any> {
  const appResult = await pool.query(
    "SELECT id, status_code FROM app.applications WHERE id = $1",
    [applicationId]
  )
  if (appResult.rows.length === 0) {
    const err = new Error('Application not found') as any
    err.code = 'NOT_FOUND'
    throw err
  }

  const currentStatus = appResult.rows[0].status_code
  const allowed = VALID_TRANSITIONS[currentStatus]

  if (!allowed || !allowed.includes(newStatus)) {
    const validList = allowed ? allowed.join(', ') : 'none (terminal status)'
    const err = new Error(
      `The status transition from ${currentStatus} to ${newStatus} is not permitted. Valid transitions from ${currentStatus} are: ${validList}.`
    ) as any
    err.code = 'INVALID_TRANSITION'
    throw err
  }

  // Update status
  await pool.query(
    "UPDATE app.applications SET status_code = $1, updated_at = NOW() WHERE id = $2",
    [newStatus, applicationId]
  )

  // Record in status_history
  await pool.query(
    `INSERT INTO app.status_history
       (application_id, from_status, to_status, changed_by_user_id, changed_by_role, note)
     VALUES ($1, $2, $3, $4, 'CFSAdmin', $5)`,
    [applicationId, currentStatus, newStatus, adminUserId, note || null]
  )

  // Return updated application
  const updated = await pool.query(
    `SELECT a.*, o.legal_name AS organization_name
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     WHERE a.id = $1`,
    [applicationId]
  )
  return updated.rows[0]
}

// --- Admin Messaging (UC-23) ---

/**
 * Send a message from admin to applicant (CFSAdmin role).
 * Returns the new message row or throws coded errors.
 */
export async function sendAdminMessage(
  pool: Pool,
  applicationId: string,
  adminUserId: string,
  body: string
): Promise<any> {
  const appCheck = await pool.query(
    "SELECT id, status_code FROM app.applications WHERE id = $1",
    [applicationId]
  )
  if (appCheck.rows.length === 0) {
    const err = new Error('Application not found') as any
    err.code = 'NOT_FOUND'
    throw err
  }

  if (appCheck.rows[0].status_code === 'Draft') {
    const err = new Error('Messages can only be sent on submitted applications.') as any
    err.code = 'DRAFT_STATUS'
    throw err
  }

  const result = await pool.query(
    `INSERT INTO app.messages (application_id, sender_user_id, sender_role, body)
     VALUES ($1, $2, 'CFSAdmin', $3)
     RETURNING id, application_id, sender_user_id, sender_role, subject, body, is_read, sent_at`,
    [applicationId, adminUserId, body]
  )
  return result.rows[0]
}

// --- Cost Pressure Report (UC-24) ---

export interface ReportFilters {
  application_type?: string
  zone?: string
  date_from?: string
  date_to?: string
}

export interface CostPressureReport {
  total_applications: number
  total_funding_requested: number
  by_type: Array<{ application_type: string; count: number; total_requested: number }>
  by_zone: Array<{ zone_code: string; zone_name: string; count: number; total_requested: number }>
  by_fiscal_year: Array<{ fiscal_year_code: string; count: number; total_requested: number }>
  cost_pressure: Array<{
    fiscal_year_code: string
    zone_code: string
    application_type: string
    total_requested: number
    allocated_amount: number
    pressure: number
  }>
}

/**
 * Generate cost pressure report (UC-24, BR-004: excludes Draft).
 */
export async function generateCostPressureReport(
  pool: Pool,
  filters: ReportFilters
): Promise<CostPressureReport> {
  const conditions: string[] = ["a.status_code <> 'Draft'"]
  const params: any[] = []
  let idx = 1

  if (filters.application_type) {
    conditions.push(`a.application_type = $${idx}`)
    params.push(filters.application_type)
    idx++
  }
  if (filters.zone) {
    conditions.push(`o.zone_code = $${idx}`)
    params.push(filters.zone)
    idx++
  }
  if (filters.date_from) {
    conditions.push(`a.submitted_at >= $${idx}`)
    params.push(filters.date_from)
    idx++
  }
  if (filters.date_to) {
    conditions.push(`a.submitted_at <= $${idx}`)
    params.push(filters.date_to)
    idx++
  }

  const where = conditions.join(' AND ')

  // By type
  const byTypeResult = await pool.query(
    `SELECT a.application_type,
            COUNT(*)::int AS count,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_requested
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     WHERE ${where}
     GROUP BY a.application_type
     ORDER BY a.application_type`,
    params
  )

  // By zone
  const byZoneResult = await pool.query(
    `SELECT COALESCE(o.zone_code, 'Unknown') AS zone_code,
            COALESCE(z.name, 'Unknown') AS zone_name,
            COUNT(*)::int AS count,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_requested
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     LEFT JOIN app.zones z ON z.code = o.zone_code
     WHERE ${where}
     GROUP BY o.zone_code, z.name
     ORDER BY z.name NULLS LAST`,
    params
  )

  // By fiscal year
  const byFyResult = await pool.query(
    `SELECT COALESCE(a.fiscal_year_code, 'N/A') AS fiscal_year_code,
            COUNT(*)::int AS count,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_requested
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     WHERE ${where}
     GROUP BY a.fiscal_year_code
     ORDER BY a.fiscal_year_code NULLS LAST`,
    params
  )

  // Cost pressure: requested vs allocated (by FY + zone + type)
  const pressureResult = await pool.query(
    `SELECT a.fiscal_year_code,
            COALESCE(o.zone_code, 'Unknown') AS zone_code,
            a.application_type,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_requested,
            COALESCE(ba.allocated_amount, 0) AS allocated_amount,
            COALESCE(SUM(a.total_funding_requested), 0) - COALESCE(ba.allocated_amount, 0) AS pressure
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     LEFT JOIN app.budget_allocations ba
       ON ba.fiscal_year_code = a.fiscal_year_code
       AND ba.zone_code = o.zone_code
       AND ba.application_type = a.application_type
     WHERE ${where} AND a.fiscal_year_code IS NOT NULL
     GROUP BY a.fiscal_year_code, o.zone_code, a.application_type, ba.allocated_amount
     ORDER BY a.fiscal_year_code, o.zone_code, a.application_type`,
    params
  )

  // Totals
  const totalApps = byTypeResult.rows.reduce((s: number, r: any) => s + r.count, 0)
  const totalFunding = byTypeResult.rows.reduce(
    (s: number, r: any) => s + parseFloat(r.total_requested || '0'), 0
  )

  return {
    total_applications: totalApps,
    total_funding_requested: totalFunding,
    by_type: byTypeResult.rows.map((r: any) => ({
      application_type: r.application_type,
      count: r.count,
      total_requested: parseFloat(r.total_requested)
    })),
    by_zone: byZoneResult.rows.map((r: any) => ({
      zone_code: r.zone_code,
      zone_name: r.zone_name,
      count: r.count,
      total_requested: parseFloat(r.total_requested)
    })),
    by_fiscal_year: byFyResult.rows.map((r: any) => ({
      fiscal_year_code: r.fiscal_year_code,
      count: r.count,
      total_requested: parseFloat(r.total_requested)
    })),
    cost_pressure: pressureResult.rows.map((r: any) => ({
      fiscal_year_code: r.fiscal_year_code,
      zone_code: r.zone_code,
      application_type: r.application_type,
      total_requested: parseFloat(r.total_requested),
      allocated_amount: parseFloat(r.allocated_amount),
      pressure: parseFloat(r.pressure)
    }))
  }
}

// --- Regional Funding Distribution Report (UC-27) ---

export interface RegionalReportRow {
  zone_code: string
  zone_name: string
  count: number
  total_requested: number
  approved_count: number
  declined_count: number
  approval_rate: number
  avg_request_amount: number
}

export interface RegionalReport {
  total_applications: number
  total_funding_requested: number
  zones: RegionalReportRow[]
}

/**
 * Generate regional funding distribution report (UC-27).
 * Per-zone: count, total requested, approval rate, avg request amount.
 */
export async function generateRegionalReport(
  pool: Pool,
  filters: ReportFilters
): Promise<RegionalReport> {
  const conditions: string[] = ["a.status_code <> 'Draft'"]
  const params: any[] = []
  let idx = 1

  if (filters.application_type) {
    conditions.push(`a.application_type = $${idx}`)
    params.push(filters.application_type)
    idx++
  }
  if (filters.zone) {
    conditions.push(`o.zone_code = $${idx}`)
    params.push(filters.zone)
    idx++
  }
  if (filters.date_from) {
    conditions.push(`a.submitted_at >= $${idx}`)
    params.push(filters.date_from)
    idx++
  }
  if (filters.date_to) {
    conditions.push(`a.submitted_at <= $${idx}`)
    params.push(filters.date_to)
    idx++
  }

  const where = conditions.join(' AND ')

  const result = await pool.query(
    `SELECT COALESCE(o.zone_code, 'Unknown') AS zone_code,
            COALESCE(z.name, 'Unknown') AS zone_name,
            COUNT(*)::int AS count,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_requested,
            COUNT(*) FILTER (WHERE a.status_code = 'Approved')::int AS approved_count,
            COUNT(*) FILTER (WHERE a.status_code = 'Declined')::int AS declined_count
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     LEFT JOIN app.zones z ON z.code = o.zone_code
     WHERE ${where}
     GROUP BY o.zone_code, z.name
     ORDER BY z.name NULLS LAST`,
    params
  )

  const zones: RegionalReportRow[] = result.rows.map((r: any) => {
    const count = r.count
    const totalReq = parseFloat(r.total_requested)
    const approved = r.approved_count
    const declined = r.declined_count
    const decided = approved + declined
    return {
      zone_code: r.zone_code,
      zone_name: r.zone_name,
      count,
      total_requested: totalReq,
      approved_count: approved,
      declined_count: declined,
      approval_rate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
      avg_request_amount: count > 0 ? Math.round(totalReq / count) : 0
    }
  })

  const totalApps = zones.reduce((s, r) => s + r.count, 0)
  const totalFunding = zones.reduce((s, r) => s + r.total_requested, 0)

  return { total_applications: totalApps, total_funding_requested: totalFunding, zones }
}

export function regionalReportToCsv(report: RegionalReport): string {
  const lines: string[] = []
  lines.push('Regional Funding Distribution Report')
  lines.push(`Total Applications,${report.total_applications}`)
  lines.push(`Total Funding Requested,${report.total_funding_requested}`)
  lines.push('')
  lines.push('Zone,Count,Total Requested,Approved,Declined,Approval Rate (%),Avg Request Amount')
  for (const row of report.zones) {
    lines.push(`"${row.zone_name}",${row.count},${row.total_requested},${row.approved_count},${row.declined_count},${row.approval_rate},${row.avg_request_amount}`)
  }
  return lines.join('\n')
}

// --- Fiscal Year Summary Report (UC-27) ---

export interface FiscalYearReportRow {
  fiscal_year_code: string
  count: number
  total_requested: number
  approved_count: number
  declined_count: number
  approval_rate: number
  total_approved_funding: number
}

export interface FiscalYearReport {
  total_applications: number
  total_funding_requested: number
  fiscal_years: FiscalYearReportRow[]
}

/**
 * Generate fiscal year summary report (UC-27).
 * Per fiscal year: count, total requested, approved/declined, approval rate, approved funding.
 */
export async function generateFiscalYearReport(
  pool: Pool,
  filters: ReportFilters
): Promise<FiscalYearReport> {
  const conditions: string[] = ["a.status_code <> 'Draft'"]
  const params: any[] = []
  let idx = 1

  if (filters.application_type) {
    conditions.push(`a.application_type = $${idx}`)
    params.push(filters.application_type)
    idx++
  }
  if (filters.zone) {
    conditions.push(`o.zone_code = $${idx}`)
    params.push(filters.zone)
    idx++
  }
  if (filters.date_from) {
    conditions.push(`a.submitted_at >= $${idx}`)
    params.push(filters.date_from)
    idx++
  }
  if (filters.date_to) {
    conditions.push(`a.submitted_at <= $${idx}`)
    params.push(filters.date_to)
    idx++
  }

  const where = conditions.join(' AND ')

  const result = await pool.query(
    `SELECT COALESCE(a.fiscal_year_code, 'N/A') AS fiscal_year_code,
            COUNT(*)::int AS count,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_requested,
            COUNT(*) FILTER (WHERE a.status_code = 'Approved')::int AS approved_count,
            COUNT(*) FILTER (WHERE a.status_code = 'Declined')::int AS declined_count,
            COALESCE(SUM(a.total_funding_requested) FILTER (WHERE a.status_code = 'Approved'), 0) AS total_approved_funding
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     WHERE ${where}
     GROUP BY a.fiscal_year_code
     ORDER BY a.fiscal_year_code NULLS LAST`,
    params
  )

  const fiscalYears: FiscalYearReportRow[] = result.rows.map((r: any) => {
    const approved = r.approved_count
    const declined = r.declined_count
    const decided = approved + declined
    return {
      fiscal_year_code: r.fiscal_year_code,
      count: r.count,
      total_requested: parseFloat(r.total_requested),
      approved_count: approved,
      declined_count: declined,
      approval_rate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
      total_approved_funding: parseFloat(r.total_approved_funding)
    }
  })

  const totalApps = fiscalYears.reduce((s, r) => s + r.count, 0)
  const totalFunding = fiscalYears.reduce((s, r) => s + r.total_requested, 0)

  return { total_applications: totalApps, total_funding_requested: totalFunding, fiscal_years: fiscalYears }
}

export function fiscalYearReportToCsv(report: FiscalYearReport): string {
  const lines: string[] = []
  lines.push('Fiscal Year Summary Report')
  lines.push(`Total Applications,${report.total_applications}`)
  lines.push(`Total Funding Requested,${report.total_funding_requested}`)
  lines.push('')
  lines.push('Fiscal Year,Count,Total Requested,Approved,Declined,Approval Rate (%),Approved Funding')
  for (const row of report.fiscal_years) {
    lines.push(`${row.fiscal_year_code},${row.count},${row.total_requested},${row.approved_count},${row.declined_count},${row.approval_rate},${row.total_approved_funding}`)
  }
  return lines.join('\n')
}

// --- Funded Shelters CRUD (UC-25) ---

export interface AdminFundedShelter {
  id: string
  shelter_name: string
  city: string
  zone_code: string
  zone_name: string
  service_type_code: string
  service_type_name: string
  bed_count: number | null
  unit_count: number | null
  funding_amount: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * List all funded shelters (admin view — includes funding_amount).
 */
export async function listFundedSheltersAdmin(pool: Pool): Promise<AdminFundedShelter[]> {
  const result = await pool.query(
    `SELECT fs.id, fs.shelter_name, fs.city, fs.zone_code,
            z.name AS zone_name,
            fs.service_type_code, st.name AS service_type_name,
            fs.bed_count, fs.unit_count, fs.funding_amount,
            fs.is_active, fs.created_at, fs.updated_at
     FROM app.funded_shelters fs
     JOIN app.zones z ON z.code = fs.zone_code
     JOIN app.service_types st ON st.code = fs.service_type_code
     ORDER BY fs.shelter_name`
  )
  return result.rows.map((r: any) => ({
    ...r,
    funding_amount: r.funding_amount ? parseFloat(r.funding_amount) : null
  }))
}

/**
 * Get a single funded shelter by ID (admin view).
 */
export async function getFundedShelterAdmin(pool: Pool, id: string): Promise<AdminFundedShelter | null> {
  const result = await pool.query(
    `SELECT fs.id, fs.shelter_name, fs.city, fs.zone_code,
            z.name AS zone_name,
            fs.service_type_code, st.name AS service_type_name,
            fs.bed_count, fs.unit_count, fs.funding_amount,
            fs.is_active, fs.created_at, fs.updated_at
     FROM app.funded_shelters fs
     JOIN app.zones z ON z.code = fs.zone_code
     JOIN app.service_types st ON st.code = fs.service_type_code
     WHERE fs.id = $1`,
    [id]
  )
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return { ...r, funding_amount: r.funding_amount ? parseFloat(r.funding_amount) : null }
}

export interface CreateFundedShelterData {
  shelter_name: string
  city: string
  zone_code: string
  service_type_code: string
  bed_count?: number | null
  unit_count?: number | null
  funding_amount?: number | null
  is_active?: boolean
}

/**
 * Create a funded shelter (admin only).
 */
export async function createFundedShelter(pool: Pool, data: CreateFundedShelterData): Promise<AdminFundedShelter> {
  const result = await pool.query(
    `INSERT INTO app.funded_shelters
       (shelter_name, city, zone_code, service_type_code, bed_count, unit_count, funding_amount, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      data.shelter_name,
      data.city,
      data.zone_code,
      data.service_type_code,
      data.bed_count ?? null,
      data.unit_count ?? null,
      data.funding_amount ?? null,
      data.is_active !== false
    ]
  )
  return (await getFundedShelterAdmin(pool, result.rows[0].id))!
}

/**
 * Update a funded shelter (admin only). Partial update.
 */
export async function updateFundedShelter(
  pool: Pool,
  id: string,
  data: Partial<CreateFundedShelterData>
): Promise<AdminFundedShelter | null> {
  // Check exists
  const existing = await pool.query('SELECT id FROM app.funded_shelters WHERE id = $1', [id])
  if (existing.rows.length === 0) return null

  const fields: string[] = []
  const params: any[] = []
  let idx = 1

  const allowedFields: Array<keyof CreateFundedShelterData> = [
    'shelter_name', 'city', 'zone_code', 'service_type_code',
    'bed_count', 'unit_count', 'funding_amount', 'is_active'
  ]

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx}`)
      params.push(data[field])
      idx++
    }
  }

  if (fields.length > 0) {
    fields.push(`updated_at = NOW()`)
    params.push(id)
    await pool.query(
      `UPDATE app.funded_shelters SET ${fields.join(', ')} WHERE id = $${idx}`,
      params
    )
  }

  return getFundedShelterAdmin(pool, id)
}

// --- Data Dashboard (UC-26) ---

export interface DashboardData {
  summary: {
    total_applications: number
    total_funding_requested: number
    applications_by_status: Array<{ status: string; count: number }>
    average_request_amount: number
  }
  status_distribution: Array<{ status: string; count: number }>
  regional_distribution: Array<{ zone_code: string; zone_name: string; count: number; total_requested: number }>
  fiscal_year_trends: Array<{ fiscal_year_code: string; count: number; total_requested: number }>
  kpis: {
    avg_processing_days: number | null
    approval_rate: number
    total_approved_funding: number
  }
}

/**
 * Generate dashboard analytics data (UC-26).
 * Excludes Draft applications (BR-004).
 */
export async function generateDashboardData(pool: Pool): Promise<DashboardData> {
  const baseWhere = "a.status_code <> 'Draft'"

  // Summary: total apps, total funding, by status, average
  const summaryResult = await pool.query(
    `SELECT COUNT(*)::int AS total_applications,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_funding_requested,
            CASE WHEN COUNT(*) > 0
              THEN COALESCE(SUM(a.total_funding_requested), 0) / COUNT(*)
              ELSE 0
            END AS average_request_amount
     FROM app.applications a
     WHERE ${baseWhere}`
  )
  const summary = summaryResult.rows[0]

  // Status distribution
  const statusResult = await pool.query(
    `SELECT a.status_code AS status, COUNT(*)::int AS count
     FROM app.applications a
     WHERE ${baseWhere}
     GROUP BY a.status_code
     ORDER BY a.status_code`
  )

  // Regional distribution
  const regionalResult = await pool.query(
    `SELECT COALESCE(o.zone_code, 'Unknown') AS zone_code,
            COALESCE(z.name, 'Unknown') AS zone_name,
            COUNT(*)::int AS count,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_requested
     FROM app.applications a
     JOIN app.organizations o ON o.id = a.organization_id
     LEFT JOIN app.zones z ON z.code = o.zone_code
     WHERE ${baseWhere}
     GROUP BY o.zone_code, z.name
     ORDER BY z.name NULLS LAST`
  )

  // Fiscal year trends
  const trendsResult = await pool.query(
    `SELECT COALESCE(a.fiscal_year_code, 'N/A') AS fiscal_year_code,
            COUNT(*)::int AS count,
            COALESCE(SUM(a.total_funding_requested), 0) AS total_requested
     FROM app.applications a
     WHERE ${baseWhere}
     GROUP BY a.fiscal_year_code
     ORDER BY a.fiscal_year_code NULLS LAST`
  )

  // KPIs: approval rate + total approved funding
  const kpiResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE a.status_code = 'Approved')::int AS approved_count,
       COUNT(*) FILTER (WHERE a.status_code IN ('Approved', 'Declined'))::int AS decided_count,
       COALESCE(SUM(a.total_funding_requested) FILTER (WHERE a.status_code = 'Approved'), 0) AS total_approved_funding
     FROM app.applications a
     WHERE ${baseWhere}`
  )
  const kpi = kpiResult.rows[0]
  const approvalRate = kpi.decided_count > 0
    ? Math.round((kpi.approved_count / kpi.decided_count) * 100)
    : 0

  // KPI: average processing time (days from submitted_at to latest status change for decided apps)
  const processingResult = await pool.query(
    `SELECT AVG(
       EXTRACT(EPOCH FROM (sh.changed_at - a.submitted_at)) / 86400
     ) AS avg_days
     FROM app.applications a
     JOIN app.status_history sh ON sh.application_id = a.id
       AND sh.to_status IN ('Approved', 'Declined')
     WHERE a.submitted_at IS NOT NULL`
  )
  const avgDays = processingResult.rows[0]?.avg_days
    ? Math.round(parseFloat(processingResult.rows[0].avg_days) * 10) / 10
    : null

  return {
    summary: {
      total_applications: summary.total_applications,
      total_funding_requested: parseFloat(summary.total_funding_requested),
      applications_by_status: statusResult.rows,
      average_request_amount: parseFloat(summary.average_request_amount)
    },
    status_distribution: statusResult.rows,
    regional_distribution: regionalResult.rows.map((r: any) => ({
      zone_code: r.zone_code,
      zone_name: r.zone_name,
      count: r.count,
      total_requested: parseFloat(r.total_requested)
    })),
    fiscal_year_trends: trendsResult.rows.map((r: any) => ({
      fiscal_year_code: r.fiscal_year_code,
      count: r.count,
      total_requested: parseFloat(r.total_requested)
    })),
    kpis: {
      avg_processing_days: avgDays,
      approval_rate: approvalRate,
      total_approved_funding: parseFloat(kpi.total_approved_funding)
    }
  }
}

export function costPressureReportToCsv(report: CostPressureReport): string {
  const lines: string[] = []

  // Summary
  lines.push('Cost Pressure Report')
  lines.push(`Total Applications,${report.total_applications}`)
  lines.push(`Total Funding Requested,${report.total_funding_requested}`)
  lines.push('')

  // By type
  lines.push('Application Type,Count,Total Requested')
  for (const row of report.by_type) {
    lines.push(`${row.application_type},${row.count},${row.total_requested}`)
  }
  lines.push('')

  // By zone
  lines.push('Zone,Count,Total Requested')
  for (const row of report.by_zone) {
    lines.push(`"${row.zone_name}",${row.count},${row.total_requested}`)
  }
  lines.push('')

  // By fiscal year
  lines.push('Fiscal Year,Count,Total Requested')
  for (const row of report.by_fiscal_year) {
    lines.push(`${row.fiscal_year_code},${row.count},${row.total_requested}`)
  }
  lines.push('')

  // Cost pressure detail
  lines.push('Fiscal Year,Zone,Application Type,Total Requested,Allocated,Pressure')
  for (const row of report.cost_pressure) {
    lines.push(`${row.fiscal_year_code},${row.zone_code},${row.application_type},${row.total_requested},${row.allocated_amount},${row.pressure}`)
  }

  return lines.join('\n')
}
