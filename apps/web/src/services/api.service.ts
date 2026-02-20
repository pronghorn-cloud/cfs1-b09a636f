import axios from 'axios'

// In production with separate deploys, VITE_API_URL points to the external API service.
// In development (Vite proxy), falls back to relative '/api/v1'.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
})

export interface FundedShelter {
  id: string
  shelter_name: string
  city: string
  zone_code: string
  zone_name: string
  service_type_code: string
  service_type_name: string
  bed_count: number | null
  unit_count: number | null
  is_active: boolean
}

export interface Zone {
  code: string
  name: string
}

export async function fetchFundedShelters(params?: {
  search?: string
  zone?: string
}): Promise<FundedShelter[]> {
  const response = await api.get('/funded-shelters', { params })
  return response.data.data.shelters
}

export async function fetchZones(): Promise<Zone[]> {
  const response = await api.get('/zones')
  return response.data.data.zones
}

export interface Faq {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
}

export async function fetchFaqs(): Promise<Faq[]> {
  const response = await api.get('/faqs')
  return response.data.data.faqs
}

export interface ContactFormData {
  sender_name: string
  sender_email: string
  subject: string
  message: string
}

export async function fetchCsrfToken(): Promise<string> {
  const response = await api.get('/csrf-token')
  return response.data.data.csrfToken
}

export async function submitContactForm(data: ContactFormData): Promise<string> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.post('/contact', data, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.message
}

export interface OrganizationProfile {
  id: string
  myalberta_account_id: string
  legal_name: string
  organization_type: string
  society_registration_number: string | null
  registration_date: string | null
  service_address_street: string
  service_address_city: string
  service_address_province: string
  service_address_postal_code: string
  mailing_address_street: string
  mailing_address_city: string
  mailing_address_province: string
  mailing_address_postal_code: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
  created_at: string
  updated_at: string
}

export interface OrganizationFormData {
  legal_name: string
  organization_type: string
  society_registration_number?: string
  registration_date?: string
  service_address_street: string
  service_address_city: string
  service_address_province: string
  service_address_postal_code: string
  mailing_address_street: string
  mailing_address_city: string
  mailing_address_province: string
  mailing_address_postal_code: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
}

export async function fetchMyOrganization(): Promise<OrganizationProfile | null> {
  const response = await api.get('/organizations/me')
  return response.data.data.organization
}

export async function registerOrganization(data: OrganizationFormData): Promise<{ organization: OrganizationProfile; message: string }> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.post('/organizations', data, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data
}

// --- Applications (UC-09+) ---

export interface BudgetLine {
  id?: string
  category: string
  description: string
  annual_amount: number
}

export interface ApplicationSummary {
  id: string
  reference_number: string
  organization_id: string
  application_type: string | null
  fiscal_year_code: string | null
  status_code: string
  status_name?: string
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
  total_funding_requested: number | null
  declaration_accepted: boolean
  submitted_at: string | null
  created_at: string
  updated_at: string
  budget_lines?: BudgetLine[]
}

export async function fetchApplications(): Promise<ApplicationSummary[]> {
  const response = await api.get('/applications')
  return response.data.data.applications
}

export async function fetchApplication(id: string): Promise<ApplicationSummary> {
  const response = await api.get(`/applications/${id}`)
  return response.data.data.application
}

export async function startNewApplication(): Promise<{ application: ApplicationSummary; message: string }> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.post('/applications', {}, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return { application: response.data.data.application, message: response.data.message }
}

export async function fetchApplicationFull(id: string): Promise<ApplicationSummary> {
  const response = await api.get(`/applications/${id}/full`)
  return response.data.data.application
}

export interface PartADraftData {
  program_name?: string | null
  service_description?: string | null
  current_bed_count?: number | null
  current_unit_count?: number | null
  budget_lines?: Array<{ category: string; description: string; annual_amount: number }>
}

export interface PartBDraftData {
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
  budget_lines?: Array<{ category: string; description: string; annual_amount: number }>
}

export async function saveApplicationDraft(id: string, data: PartADraftData | PartBDraftData): Promise<ApplicationSummary> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.patch(`/applications/${id}`, data, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.application
}

export async function setApplicationType(
  id: string,
  applicationType: 'PART_A_BASE_RENEWAL' | 'PART_B_NEW_OR_EXPANSION'
): Promise<ApplicationSummary> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.patch(`/applications/${id}/type`, {
    application_type: applicationType
  }, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.application
}

export async function submitApplicationApi(
  id: string
): Promise<{ application: ApplicationSummary; message: string }> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.post(`/applications/${id}/submit`, {
    declaration_accepted: true
  }, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return { application: response.data.data.application, message: response.data.message }
}

// --- Status History (UC-18) ---

export interface StatusHistoryEntry {
  id: string
  application_id: string
  from_status: string | null
  to_status: string
  changed_by_role: string
  note: string | null
  changed_at: string
}

export async function fetchStatusHistory(applicationId: string): Promise<StatusHistoryEntry[]> {
  const response = await api.get(`/applications/${applicationId}/history`)
  return response.data.data.history
}

// --- Messages (UC-19) ---

export interface MessageRecord {
  id: string
  application_id: string
  sender_user_id: string
  sender_role: string
  subject: string | null
  body: string
  is_read: boolean
  sent_at: string
}

export async function fetchMessages(applicationId: string): Promise<MessageRecord[]> {
  const response = await api.get(`/applications/${applicationId}/messages`)
  return response.data.data.messages
}

export async function sendMessageApi(applicationId: string, body: string): Promise<MessageRecord> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.post(`/applications/${applicationId}/messages`, { body }, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.message
}

// --- Documents (UC-13) ---

export interface DocumentRecord {
  id: string
  application_id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  document_type_code: string | null
  uploaded_by_user_id: string
  uploaded_at: string
}

export const DOCUMENT_TYPE_OPTIONS = [
  { code: 'WCB_CERTIFICATE', label: 'WCB Coverage Certificate' },
  { code: 'REGISTRATION_PROOF', label: 'Proof of Non-Profit/Society Registration' },
  { code: 'FINANCIAL_STATEMENT', label: 'Financial Statement' },
  { code: 'PROGRAM_REPORT', label: 'Program Report' },
  { code: 'COMMUNITY_NEED_EVIDENCE', label: 'Community Need Evidence' },
  { code: 'PHOTOS', label: 'Facility Photos' },
  { code: 'OTHER', label: 'Other Supporting Document' }
] as const

export async function fetchDocuments(applicationId: string): Promise<DocumentRecord[]> {
  const response = await api.get(`/applications/${applicationId}/documents`)
  return response.data.data.documents
}

export async function uploadDocument(
  applicationId: string,
  file: File,
  documentTypeCode: string
): Promise<DocumentRecord> {
  const csrfToken = await fetchCsrfToken()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type_code', documentTypeCode)

  const response = await api.post(`/applications/${applicationId}/documents`, formData, {
    headers: {
      'X-CSRF-Token': csrfToken,
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data.data.document
}

export async function deleteDocument(applicationId: string, documentId: string): Promise<void> {
  const csrfToken = await fetchCsrfToken()
  await api.delete(`/applications/${applicationId}/documents/${documentId}`, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
}

export function getDocumentDownloadUrl(applicationId: string, documentId: string): string {
  return `${API_BASE_URL}/applications/${applicationId}/documents/${documentId}/download`
}

// --- Admin (UC-20+) ---

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

export async function fetchAdminApplications(params?: {
  status?: string
  search?: string
}): Promise<AdminApplicationRow[]> {
  const response = await api.get('/admin/applications', { params })
  return response.data.data.applications
}

export interface AdminApplicationDetail extends ApplicationSummary {
  organization_name: string
}

export async function fetchAdminApplicationDetail(id: string): Promise<AdminApplicationDetail> {
  const response = await api.get(`/admin/applications/${id}`)
  return response.data.data.application
}

export async function fetchAdminHistory(id: string): Promise<StatusHistoryEntry[]> {
  const response = await api.get(`/admin/applications/${id}/history`)
  return response.data.data.history
}

export async function fetchAdminMessages(id: string): Promise<MessageRecord[]> {
  const response = await api.get(`/admin/applications/${id}/messages`)
  return response.data.data.messages
}

export interface InternalNote {
  id: string
  application_id: string
  author_user_id: string
  note_text: string
  created_at: string
}

export async function fetchAdminNotes(id: string): Promise<InternalNote[]> {
  const response = await api.get(`/admin/applications/${id}/notes`)
  return response.data.data.notes
}

export async function addAdminNote(id: string, noteText: string): Promise<InternalNote> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.post(`/admin/applications/${id}/notes`, { note_text: noteText }, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.note
}

export async function sendAdminMessage(id: string, body: string): Promise<MessageRecord> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.post(`/admin/applications/${id}/messages`, { body }, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.message
}

// --- Reports (UC-24) ---

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

export async function fetchCostPressureReport(params?: {
  application_type?: string
  zone?: string
  date_from?: string
  date_to?: string
}): Promise<CostPressureReport> {
  const response = await api.get('/admin/reports/cost-pressure', { params })
  return response.data.data.report
}

export function getCostPressureCsvUrl(params?: {
  application_type?: string
  zone?: string
  date_from?: string
  date_to?: string
}): string {
  const query = new URLSearchParams()
  if (params?.application_type) query.set('application_type', params.application_type)
  if (params?.zone) query.set('zone', params.zone)
  if (params?.date_from) query.set('date_from', params.date_from)
  if (params?.date_to) query.set('date_to', params.date_to)
  const qs = query.toString()
  return `${API_BASE_URL}/admin/reports/cost-pressure/csv${qs ? '?' + qs : ''}`
}

// --- Regional Distribution Report (UC-27) ---

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

export async function fetchRegionalReport(params?: {
  application_type?: string
  zone?: string
  date_from?: string
  date_to?: string
}): Promise<RegionalReport> {
  const response = await api.get('/admin/reports/regional', { params })
  return response.data.data.report
}

export function getRegionalCsvUrl(params?: {
  application_type?: string
  zone?: string
  date_from?: string
  date_to?: string
}): string {
  const query = new URLSearchParams()
  if (params?.application_type) query.set('application_type', params.application_type)
  if (params?.zone) query.set('zone', params.zone)
  if (params?.date_from) query.set('date_from', params.date_from)
  if (params?.date_to) query.set('date_to', params.date_to)
  const qs = query.toString()
  return `${API_BASE_URL}/admin/reports/regional/csv${qs ? '?' + qs : ''}`
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

export async function fetchFiscalYearReport(params?: {
  application_type?: string
  zone?: string
  date_from?: string
  date_to?: string
}): Promise<FiscalYearReport> {
  const response = await api.get('/admin/reports/fiscal-year', { params })
  return response.data.data.report
}

export function getFiscalYearCsvUrl(params?: {
  application_type?: string
  zone?: string
  date_from?: string
  date_to?: string
}): string {
  const query = new URLSearchParams()
  if (params?.application_type) query.set('application_type', params.application_type)
  if (params?.zone) query.set('zone', params.zone)
  if (params?.date_from) query.set('date_from', params.date_from)
  if (params?.date_to) query.set('date_to', params.date_to)
  const qs = query.toString()
  return `${API_BASE_URL}/admin/reports/fiscal-year/csv${qs ? '?' + qs : ''}`
}

export async function updateAdminStatus(
  id: string,
  newStatus: string,
  note?: string
): Promise<AdminApplicationDetail> {
  const csrfToken = await fetchCsrfToken()
  const body: Record<string, string> = { new_status: newStatus }
  if (note) body.note = note
  const response = await api.patch(`/admin/applications/${id}/status`, body, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.application
}

// --- Admin Dashboard (UC-26) ---

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

export async function fetchDashboard(): Promise<DashboardData> {
  const response = await api.get('/admin/dashboard')
  return response.data.data.dashboard
}

// --- Admin Funded Shelters (UC-25) ---

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

export interface FundedShelterFormData {
  shelter_name: string
  city: string
  zone_code: string
  service_type_code: string
  bed_count?: number | null
  unit_count?: number | null
  funding_amount?: number | null
  is_active?: boolean
}

export async function fetchAdminShelters(): Promise<AdminFundedShelter[]> {
  const response = await api.get('/admin/funded-shelters')
  return response.data.data.shelters
}

export async function fetchAdminShelter(id: string): Promise<AdminFundedShelter> {
  const response = await api.get(`/admin/funded-shelters/${id}`)
  return response.data.data.shelter
}

export async function createAdminShelter(data: FundedShelterFormData): Promise<AdminFundedShelter> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.post('/admin/funded-shelters', data, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.shelter
}

export async function updateAdminShelter(id: string, data: Partial<FundedShelterFormData>): Promise<AdminFundedShelter> {
  const csrfToken = await fetchCsrfToken()
  const response = await api.patch(`/admin/funded-shelters/${id}`, data, {
    headers: { 'X-CSRF-Token': csrfToken }
  })
  return response.data.data.shelter
}

export default api
