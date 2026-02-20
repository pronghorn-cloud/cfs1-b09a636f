/**
 * Applications Service
 *
 * Business logic for application lifecycle (UC-09+)
 */

import type { Pool } from 'pg'

export interface Application {
  id: string
  reference_number: string
  organization_id: string
  application_type: string | null
  fiscal_year_code: string | null
  status_code: string
  program_name: string | null
  service_description: string | null
  current_bed_count: number | null
  current_unit_count: number | null
  // Part B: Community Need Justification
  proposed_location: string | null
  target_population: string | null
  community_need_justification: string | null
  existing_resources_description: string | null
  dv_data_reference: string | null
  // Part B: Expansion Details
  expansion_type: string | null
  proposed_bed_count: number | null
  proposed_open_date: string | null
  // Part B: Federal Funding
  has_federal_funding: boolean | null
  federal_agency_name: string | null
  federal_funding_amount: number | null
  federal_funding_expiry_date: string | null
  // Common
  proposed_unit_count: number | null
  partnership_details: string | null
  total_funding_requested: number | null
  declaration_accepted: boolean
  submitted_at: string | null
  created_at: string
  updated_at: string
  budget_lines?: BudgetLineItem[]
}

export interface BudgetLineItem {
  id: string
  application_id: string
  category: string
  description: string | null
  annual_amount: number
  sort_order: number
  created_at: string
}

export interface StatusHistoryEntry {
  id: string
  application_id: string
  from_status: string | null
  to_status: string
  changed_by_user_id: string
  changed_by_role: string
  note: string | null
  changed_at: string
}

export interface PartADraftInput {
  program_name?: string | null
  service_description?: string | null
  current_bed_count?: number | null
  current_unit_count?: number | null
  cost_pressures_description?: string | null
  budget_lines?: Array<{
    category: string
    description?: string
    annual_amount: number
  }>
}

export interface PartBDraftInput {
  program_name?: string | null
  service_description?: string | null
  proposed_location?: string | null
  target_population?: string | null
  community_need_justification?: string | null
  existing_resources_description?: string | null
  dv_data_reference?: string | null
  expansion_type?: string | null
  proposed_bed_count?: number | null
  proposed_open_date?: string | null
  has_federal_funding?: boolean | null
  federal_agency_name?: string | null
  federal_funding_amount?: number | null
  federal_funding_expiry_date?: string | null
  budget_lines?: Array<{
    category: string
    description?: string
    annual_amount: number
  }>
}

const VALID_BUDGET_CATEGORIES = [
  'Salaries', 'Benefits', 'FacilityRental', 'Utilities',
  'ProgramSupplies', 'Transport', 'Administration', 'Other'
] as const

const VALID_PROGRAM_TYPES = ['WomensShelter', 'SecondStageShelter'] as const

const VALID_EXPANSION_TYPES = [
  'NewShelter', 'AdditionalBeds', 'SecondStageExpansion', 'IncreasedOperationalFunding'
] as const

/** All application columns for SELECT/RETURNING clauses */
const APP_COLUMNS = `id, reference_number, organization_id, application_type,
  fiscal_year_code, status_code, program_name, service_description,
  current_bed_count, current_unit_count, total_funding_requested,
  proposed_location, target_population, community_need_justification,
  existing_resources_description, dv_data_reference,
  expansion_type, proposed_bed_count, proposed_open_date,
  has_federal_funding, federal_agency_name, federal_funding_amount, federal_funding_expiry_date,
  proposed_unit_count, partnership_details,
  declaration_accepted, submitted_at, created_at, updated_at`

/**
 * Generate a unique reference number: WSP-YYYY-NNNN
 */
export async function generateReferenceNumber(pool: Pool): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `WSP-${year}-`

  // Find the highest existing sequence for this year
  const result = await pool.query(
    `SELECT reference_number FROM app.applications
     WHERE reference_number LIKE $1
     ORDER BY reference_number DESC LIMIT 1`,
    [`${prefix}%`]
  )

  let seq = 1
  if (result.rows.length > 0) {
    const last = result.rows[0].reference_number as string
    const lastSeq = parseInt(last.replace(prefix, ''), 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  return `${prefix}${String(seq).padStart(4, '0')}`
}

/**
 * Get the current fiscal year code
 */
export async function getCurrentFiscalYear(pool: Pool): Promise<string | null> {
  const result = await pool.query(
    `SELECT code FROM app.fiscal_years WHERE is_current = true LIMIT 1`
  )
  return result.rows[0]?.code || null
}

/**
 * Create a new application in Draft status (UC-09)
 */
export async function createApplication(
  pool: Pool,
  organizationId: string
): Promise<Application> {
  const referenceNumber = await generateReferenceNumber(pool)
  const fiscalYear = await getCurrentFiscalYear(pool)

  const result = await pool.query(
    `INSERT INTO app.applications (
       reference_number, organization_id, fiscal_year_code, status_code
     ) VALUES ($1, $2, $3, 'Draft')
     RETURNING ${APP_COLUMNS}`,
    [referenceNumber, organizationId, fiscalYear]
  )

  return result.rows[0]
}

/**
 * List applications for an organization
 */
export async function listApplicationsByOrganization(
  pool: Pool,
  organizationId: string
): Promise<Application[]> {
  const result = await pool.query(
    `SELECT a.*, s.name as status_name
     FROM app.applications a
     LEFT JOIN app.application_statuses s ON s.code = a.status_code
     WHERE a.organization_id = $1
     ORDER BY a.created_at DESC`,
    [organizationId]
  )
  return result.rows
}

const VALID_APPLICATION_TYPES = ['PART_A_BASE_RENEWAL', 'PART_B_NEW_OR_EXPANSION'] as const
export type ApplicationType = typeof VALID_APPLICATION_TYPES[number]

/**
 * Set or update the application type on a Draft application (UC-10)
 */
export async function setApplicationType(
  pool: Pool,
  applicationId: string,
  organizationId: string,
  applicationType: string
): Promise<Application | null> {
  if (!VALID_APPLICATION_TYPES.includes(applicationType as ApplicationType)) {
    throw Object.assign(
      new Error(`Invalid application type. Must be one of: ${VALID_APPLICATION_TYPES.join(', ')}`),
      { code: 'INVALID_TYPE' }
    )
  }

  // Update only if Draft and owned by the org
  const result = await pool.query(
    `UPDATE app.applications
     SET application_type = $1, updated_at = NOW()
     WHERE id = $2 AND organization_id = $3 AND status_code = 'Draft'
     RETURNING ${APP_COLUMNS}`,
    [applicationType, applicationId, organizationId]
  )

  return result.rows[0] || null
}

/**
 * Get a single application by ID (with org ownership check)
 */
export async function getApplicationById(
  pool: Pool,
  applicationId: string,
  organizationId: string
): Promise<Application | null> {
  const result = await pool.query(
    `SELECT a.*, s.name as status_name
     FROM app.applications a
     LEFT JOIN app.application_statuses s ON s.code = a.status_code
     WHERE a.id = $1 AND a.organization_id = $2`,
    [applicationId, organizationId]
  )
  return result.rows[0] || null
}

/**
 * Validate Part A draft fields (lenient for draft saving)
 */
export function validatePartADraft(data: PartADraftInput): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (data.program_name !== undefined && data.program_name !== null) {
    if (typeof data.program_name === 'string' && !VALID_PROGRAM_TYPES.includes(data.program_name as any)) {
      errors.program_name = `Program type must be one of: ${VALID_PROGRAM_TYPES.join(', ')}`
    }
  }

  if (data.service_description !== undefined && data.service_description !== null && data.service_description !== '') {
    if (data.service_description.length > 5000) {
      errors.service_description = 'Service description must be 5,000 characters or less'
    }
  }

  if (data.current_bed_count !== undefined && data.current_bed_count !== null) {
    const n = Number(data.current_bed_count)
    if (!Number.isInteger(n) || n < 0 || n > 500) {
      errors.current_bed_count = 'Bed count must be an integer between 0 and 500'
    }
  }

  if (data.current_unit_count !== undefined && data.current_unit_count !== null) {
    const n = Number(data.current_unit_count)
    if (!Number.isInteger(n) || n < 0 || n > 500) {
      errors.current_unit_count = 'Unit count must be an integer between 0 and 500'
    }
  }

  if (data.cost_pressures_description !== undefined && data.cost_pressures_description !== null) {
    if (data.cost_pressures_description.length > 3000) {
      errors.cost_pressures_description = 'Cost pressures description must be 3,000 characters or less'
    }
  }

  if (data.budget_lines !== undefined && data.budget_lines !== null) {
    if (!Array.isArray(data.budget_lines)) {
      errors.budget_lines = 'Budget lines must be an array'
    } else {
      for (let i = 0; i < data.budget_lines.length; i++) {
        const line = data.budget_lines[i]!
        if (!VALID_BUDGET_CATEGORIES.includes(line.category as any)) {
          errors[`budget_lines[${i}].category`] = `Invalid category. Must be one of: ${VALID_BUDGET_CATEGORIES.join(', ')}`
        }
        if (line.description && line.description.length > 200) {
          errors[`budget_lines[${i}].description`] = 'Description must be 200 characters or less'
        }
        if (typeof line.annual_amount !== 'number' || line.annual_amount < 0) {
          errors[`budget_lines[${i}].annual_amount`] = 'Annual amount must be greater than or equal to zero'
        }
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Save Part A draft fields + budget lines in a transaction (UC-11)
 */
export async function savePartADraft(
  pool: Pool,
  applicationId: string,
  organizationId: string,
  data: PartADraftInput
): Promise<Application | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Update application fields
    const appResult = await client.query(
      `UPDATE app.applications
       SET program_name = COALESCE($1, program_name),
           service_description = COALESCE($2, service_description),
           current_bed_count = COALESCE($3, current_bed_count),
           current_unit_count = COALESCE($4, current_unit_count),
           updated_at = NOW()
       WHERE id = $5 AND organization_id = $6 AND status_code = 'Draft'
         AND application_type = 'PART_A_BASE_RENEWAL'
       RETURNING ${APP_COLUMNS}`,
      [
        data.program_name ?? null,
        data.service_description ?? null,
        data.current_bed_count ?? null,
        data.current_unit_count ?? null,
        applicationId,
        organizationId
      ]
    )

    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    // Replace budget lines if provided
    if (data.budget_lines !== undefined) {
      await client.query(
        'DELETE FROM app.budget_line_items WHERE application_id = $1',
        [applicationId]
      )

      let total = 0
      for (let i = 0; i < data.budget_lines.length; i++) {
        const line = data.budget_lines[i]!
        await client.query(
          `INSERT INTO app.budget_line_items (application_id, category, description, annual_amount, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [applicationId, line.category, line.description || null, line.annual_amount, i]
        )
        total += line.annual_amount
      }

      // Update total_funding_requested
      await client.query(
        'UPDATE app.applications SET total_funding_requested = $1 WHERE id = $2',
        [total, applicationId]
      )
      appResult.rows[0].total_funding_requested = total
    }

    await client.query('COMMIT')

    // Fetch budget lines to include in response
    const budgetResult = await pool.query(
      'SELECT * FROM app.budget_line_items WHERE application_id = $1 ORDER BY sort_order',
      [applicationId]
    )
    appResult.rows[0].budget_lines = budgetResult.rows

    return appResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Validate Part B draft fields (lenient for draft saving)
 */
export function validatePartBDraft(data: PartBDraftInput): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (data.program_name !== undefined && data.program_name !== null) {
    if (typeof data.program_name === 'string' && !VALID_PROGRAM_TYPES.includes(data.program_name as any)) {
      errors.program_name = `Program type must be one of: ${VALID_PROGRAM_TYPES.join(', ')}`
    }
  }

  if (data.service_description !== undefined && data.service_description !== null && data.service_description !== '') {
    if (data.service_description.length > 5000) {
      errors.service_description = 'Service description must be 5,000 characters or less'
    }
  }

  // Community Need Justification fields
  if (data.proposed_location !== undefined && data.proposed_location !== null && data.proposed_location !== '') {
    if (data.proposed_location.length > 200) {
      errors.proposed_location = 'Geographic area must be 200 characters or less'
    }
  }

  if (data.target_population !== undefined && data.target_population !== null && data.target_population !== '') {
    if (data.target_population.length > 1000) {
      errors.target_population = 'Population served must be 1,000 characters or less'
    }
  }

  if (data.existing_resources_description !== undefined && data.existing_resources_description !== null && data.existing_resources_description !== '') {
    if (data.existing_resources_description.length > 2000) {
      errors.existing_resources_description = 'Existing resources description must be 2,000 characters or less'
    }
  }

  if (data.community_need_justification !== undefined && data.community_need_justification !== null && data.community_need_justification !== '') {
    if (data.community_need_justification.length < 100) {
      errors.community_need_justification = 'Need gap description must be between 100 and 3,000 characters'
    }
    if (data.community_need_justification.length > 3000) {
      errors.community_need_justification = 'Need gap description must be between 100 and 3,000 characters'
    }
  }

  if (data.dv_data_reference !== undefined && data.dv_data_reference !== null && data.dv_data_reference !== '') {
    if (data.dv_data_reference.length > 500) {
      errors.dv_data_reference = 'Domestic violence data reference must be 500 characters or less'
    }
  }

  // Expansion Details
  if (data.expansion_type !== undefined && data.expansion_type !== null && data.expansion_type !== '') {
    if (!VALID_EXPANSION_TYPES.includes(data.expansion_type as any)) {
      errors.expansion_type = `Expansion type must be one of: ${VALID_EXPANSION_TYPES.join(', ')}`
    }
  }

  if (data.proposed_bed_count !== undefined && data.proposed_bed_count !== null) {
    const n = Number(data.proposed_bed_count)
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      errors.proposed_bed_count = 'Requested bed count must be between 1 and 200'
    }
  }

  if (data.proposed_open_date !== undefined && data.proposed_open_date !== null && data.proposed_open_date !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.proposed_open_date)) {
      errors.proposed_open_date = 'Proposed open date must be a valid date (YYYY-MM-DD)'
    }
  }

  // Federal Funding
  if (data.federal_funding_amount !== undefined && data.federal_funding_amount !== null) {
    if (typeof data.federal_funding_amount !== 'number' || data.federal_funding_amount < 0) {
      errors.federal_funding_amount = 'Federal funding amount must be a non-negative number'
    }
  }

  if (data.federal_agency_name !== undefined && data.federal_agency_name !== null && data.federal_agency_name !== '') {
    if (data.federal_agency_name.length > 200) {
      errors.federal_agency_name = 'Federal agency name must be 200 characters or less'
    }
  }

  // Budget lines (same validation as Part A)
  if (data.budget_lines !== undefined && data.budget_lines !== null) {
    if (!Array.isArray(data.budget_lines)) {
      errors.budget_lines = 'Budget lines must be an array'
    } else {
      for (let i = 0; i < data.budget_lines.length; i++) {
        const line = data.budget_lines[i]!
        if (!VALID_BUDGET_CATEGORIES.includes(line.category as any)) {
          errors[`budget_lines[${i}].category`] = `Invalid category. Must be one of: ${VALID_BUDGET_CATEGORIES.join(', ')}`
        }
        if (line.description && line.description.length > 200) {
          errors[`budget_lines[${i}].description`] = 'Description must be 200 characters or less'
        }
        if (typeof line.annual_amount !== 'number' || line.annual_amount < 0) {
          errors[`budget_lines[${i}].annual_amount`] = 'Annual amount must be greater than or equal to zero'
        }
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Save Part B draft fields + budget lines in a transaction (UC-12)
 */
export async function savePartBDraft(
  pool: Pool,
  applicationId: string,
  organizationId: string,
  data: PartBDraftInput
): Promise<Application | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const appResult = await client.query(
      `UPDATE app.applications
       SET program_name = COALESCE($1, program_name),
           service_description = COALESCE($2, service_description),
           proposed_location = COALESCE($3, proposed_location),
           target_population = COALESCE($4, target_population),
           community_need_justification = COALESCE($5, community_need_justification),
           existing_resources_description = COALESCE($6, existing_resources_description),
           dv_data_reference = COALESCE($7, dv_data_reference),
           expansion_type = COALESCE($8, expansion_type),
           proposed_bed_count = COALESCE($9, proposed_bed_count),
           proposed_open_date = COALESCE($10, proposed_open_date),
           has_federal_funding = COALESCE($11, has_federal_funding),
           federal_agency_name = COALESCE($12, federal_agency_name),
           federal_funding_amount = COALESCE($13, federal_funding_amount),
           federal_funding_expiry_date = COALESCE($14, federal_funding_expiry_date),
           updated_at = NOW()
       WHERE id = $15 AND organization_id = $16 AND status_code = 'Draft'
         AND application_type = 'PART_B_NEW_OR_EXPANSION'
       RETURNING ${APP_COLUMNS}`,
      [
        data.program_name ?? null,
        data.service_description ?? null,
        data.proposed_location ?? null,
        data.target_population ?? null,
        data.community_need_justification ?? null,
        data.existing_resources_description ?? null,
        data.dv_data_reference ?? null,
        data.expansion_type ?? null,
        data.proposed_bed_count ?? null,
        data.proposed_open_date ?? null,
        data.has_federal_funding ?? null,
        data.federal_agency_name ?? null,
        data.federal_funding_amount ?? null,
        data.federal_funding_expiry_date ?? null,
        applicationId,
        organizationId
      ]
    )

    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    // Replace budget lines if provided
    if (data.budget_lines !== undefined) {
      await client.query(
        'DELETE FROM app.budget_line_items WHERE application_id = $1',
        [applicationId]
      )

      let total = 0
      for (let i = 0; i < data.budget_lines.length; i++) {
        const line = data.budget_lines[i]!
        await client.query(
          `INSERT INTO app.budget_line_items (application_id, category, description, annual_amount, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [applicationId, line.category, line.description || null, line.annual_amount, i]
        )
        total += line.annual_amount
      }

      await client.query(
        'UPDATE app.applications SET total_funding_requested = $1 WHERE id = $2',
        [total, applicationId]
      )
      appResult.rows[0].total_funding_requested = total
    }

    await client.query('COMMIT')

    // Fetch budget lines to include in response
    const budgetResult = await pool.query(
      'SELECT * FROM app.budget_line_items WHERE application_id = $1 ORDER BY sort_order',
      [applicationId]
    )
    appResult.rows[0].budget_lines = budgetResult.rows

    return appResult.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get budget line items for an application
 */
export async function getBudgetLineItems(
  pool: Pool,
  applicationId: string
): Promise<BudgetLineItem[]> {
  const result = await pool.query(
    'SELECT * FROM app.budget_line_items WHERE application_id = $1 ORDER BY sort_order',
    [applicationId]
  )
  return result.rows
}

/**
 * Get application with budget lines (for form loading)
 */
export async function getApplicationWithBudget(
  pool: Pool,
  applicationId: string,
  organizationId: string
): Promise<(Application & { budget_lines: BudgetLineItem[] }) | null> {
  const app = await getApplicationById(pool, applicationId, organizationId)
  if (!app) return null

  const budgetLines = await getBudgetLineItems(pool, applicationId)
  return { ...app, budget_lines: budgetLines }
}

/**
 * Get status history for an application (UC-18 audit trail)
 */
export async function getStatusHistory(
  pool: Pool,
  applicationId: string,
  organizationId: string
): Promise<StatusHistoryEntry[] | null> {
  // Verify ownership first
  const app = await getApplicationById(pool, applicationId, organizationId)
  if (!app) return null

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
 * Validate required fields for submission (strict — all required fields must be present)
 */
export function validateForSubmission(
  app: Application,
  budgetLines: BudgetLineItem[]
): { valid: boolean; missingFields: string[] } {
  const missing: string[] = []

  // Shared required fields
  if (!app.program_name) missing.push('program_name')
  if (!app.service_description) missing.push('service_description')

  if (app.application_type === 'PART_A_BASE_RENEWAL') {
    if (app.current_bed_count === null || app.current_bed_count === undefined) missing.push('current_bed_count')
    if (app.current_unit_count === null || app.current_unit_count === undefined) missing.push('current_unit_count')
  } else if (app.application_type === 'PART_B_NEW_OR_EXPANSION') {
    if (!app.proposed_location) missing.push('proposed_location')
    if (!app.target_population) missing.push('target_population')
    if (!app.community_need_justification) missing.push('community_need_justification')
    if (!app.expansion_type) missing.push('expansion_type')
    if (app.proposed_bed_count === null || app.proposed_bed_count === undefined) missing.push('proposed_bed_count')
  }

  // Budget lines required for all types
  if (budgetLines.length === 0) missing.push('budget_lines')

  return { valid: missing.length === 0, missingFields: missing }
}

/**
 * Submit an application: validate, transition Draft → Submitted, record audit (UC-16)
 */
export async function submitApplication(
  pool: Pool,
  applicationId: string,
  organizationId: string,
  userId: string
): Promise<Application> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Lock the row and verify ownership + Draft status
    const appResult = await client.query(
      `SELECT ${APP_COLUMNS} FROM app.applications
       WHERE id = $1 AND organization_id = $2 AND status_code = 'Draft'
       FOR UPDATE`,
      [applicationId, organizationId]
    )

    if (appResult.rows.length === 0) {
      await client.query('ROLLBACK')
      throw Object.assign(
        new Error('Application not found or not in Draft status'),
        { code: 'NOT_FOUND' }
      )
    }

    const app = appResult.rows[0] as Application

    // Validate required fields
    const budgetResult = await client.query(
      'SELECT * FROM app.budget_line_items WHERE application_id = $1',
      [applicationId]
    )
    const validation = validateForSubmission(app, budgetResult.rows)
    if (!validation.valid) {
      await client.query('ROLLBACK')
      throw Object.assign(
        new Error(`The following required fields are missing: ${validation.missingFields.join(', ')}`),
        { code: 'VALIDATION_ERROR', details: validation.missingFields }
      )
    }

    // Transition status + set declaration + submission timestamp
    const now = new Date().toISOString()
    const updated = await client.query(
      `UPDATE app.applications
       SET status_code = 'Submitted',
           declaration_accepted = TRUE,
           declaration_timestamp = $1,
           submitted_at = $1,
           updated_at = $1
       WHERE id = $2
       RETURNING ${APP_COLUMNS}`,
      [now, applicationId]
    )

    // Write audit entry to status_history
    await client.query(
      `INSERT INTO app.status_history
         (application_id, from_status, to_status, changed_by_user_id, changed_by_role, note)
       VALUES ($1, 'Draft', 'Submitted', $2, 'Applicant', 'Application submitted by applicant')`,
      [applicationId, userId]
    )

    await client.query('COMMIT')
    return updated.rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
