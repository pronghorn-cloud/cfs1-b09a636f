<template>
  <div class="admin-detail-view">
    <!-- Header -->
    <div class="form-header">
      <div>
        <h1 class="page-title">Application Review</h1>
        <p class="page-subtitle" v-if="application">
          {{ application.reference_number }} &bull; {{ application.fiscal_year_code || 'N/A' }}
          <goa-badge :type="statusBadgeType(application.status_code)" :content="application.status_code" />
        </p>
      </div>
      <GoabButton type="tertiary" size="compact" @click="router.push('/admin')">
        Back to Admin Dashboard
      </GoabButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
      <p>Loading application...</p>
    </div>

    <!-- Error -->
    <goa-callout v-else-if="loadError" type="emergency" heading="Error">
      <p>{{ loadError }}</p>
    </goa-callout>

    <!-- Content -->
    <template v-else-if="application">
      <goa-spacer vspacing="l"></goa-spacer>

      <!-- Status Update (UC-22) -->
      <goa-container accent="thin" mb="l" v-if="validTransitions.length > 0">
        <h2 class="section-title">Update Status</h2>
        <p class="section-hint">
          Current status: <strong>{{ application.status_code }}</strong>.
          Select a new status and optionally add a note.
        </p>

        <div class="status-update-form">
          <goa-form-item label="New Status">
            <goa-dropdown
              name="new_status"
              :value="selectedStatus"
              @_change="selectedStatus = ($event as CustomEvent).detail?.value || ''"
              width="300px"
            >
              <goa-dropdown-item
                v-for="s in validTransitions"
                :key="s"
                :value="s"
                :label="s"
              ></goa-dropdown-item>
            </goa-dropdown>
          </goa-form-item>

          <goa-form-item label="Note (optional)">
            <goa-textarea
              name="status_note"
              :value="statusNote"
              @_change="statusNote = ($event as CustomEvent).detail?.value || ''"
              width="100%"
              rows="2"
              placeholder="Reason for status change..."
            ></goa-textarea>
          </goa-form-item>

          <div class="status-update-actions">
            <GoabButton type="primary" size="compact" @click="handleUpdateStatus" :disabled="updatingStatus || !selectedStatus">
              {{ updatingStatus ? 'Updating...' : 'Confirm Status Update' }}
            </GoabButton>
            <span v-if="statusUpdateSuccess" class="status-update-success">Status updated.</span>
          </div>

          <goa-callout v-if="statusUpdateError" type="emergency" heading="Update Failed" mt="m">
            <p>{{ statusUpdateError }}</p>
          </goa-callout>
        </div>
      </goa-container>

      <!-- Terminal status notice -->
      <goa-callout v-else-if="isTerminalStatus" type="information" heading="Terminal Status" mb="l">
        <p>This application is <strong>{{ application.status_code }}</strong> — no further status changes are permitted.</p>
      </goa-callout>

      <!-- 1. Organization Info -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">1. Organization Information</h2>
        <dl class="info-list">
          <div class="info-row">
            <dt>Organization</dt>
            <dd>{{ application.organization_name }}</dd>
          </div>
          <div class="info-row">
            <dt>Application Type</dt>
            <dd>{{ formatType(application.application_type) }}</dd>
          </div>
          <div class="info-row">
            <dt>Submitted</dt>
            <dd>{{ application.submitted_at ? formatDate(application.submitted_at) : '—' }}</dd>
          </div>
        </dl>
      </goa-container>

      <!-- 2. Program & Service -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">2. Program &amp; Service Delivery</h2>
        <dl class="info-list">
          <div class="info-row">
            <dt>Program Type</dt>
            <dd>{{ formatProgramName(application.program_name) }}</dd>
          </div>
          <div class="info-row">
            <dt>Service Description</dt>
            <dd class="readonly-text">{{ application.service_description || '—' }}</dd>
          </div>
          <template v-if="!isPartB">
            <div class="info-row">
              <dt>Current Bed Count</dt>
              <dd>{{ application.current_bed_count ?? '—' }}</dd>
            </div>
            <div class="info-row">
              <dt>Current Unit Count</dt>
              <dd>{{ application.current_unit_count ?? '—' }}</dd>
            </div>
          </template>
        </dl>
      </goa-container>

      <!-- 3. Part B: Community Need -->
      <template v-if="isPartB">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">3. Community Need Justification</h2>
          <dl class="info-list">
            <div class="info-row">
              <dt>Proposed Location</dt>
              <dd>{{ application.proposed_location || '—' }}</dd>
            </div>
            <div class="info-row">
              <dt>Target Population</dt>
              <dd>{{ application.target_population || '—' }}</dd>
            </div>
            <div class="info-row">
              <dt>Community Need</dt>
              <dd class="readonly-text">{{ application.community_need_justification || '—' }}</dd>
            </div>
            <div class="info-row">
              <dt>Existing Resources</dt>
              <dd class="readonly-text">{{ application.existing_resources_description || '—' }}</dd>
            </div>
            <div class="info-row" v-if="application.dv_data_reference">
              <dt>DV Data Reference</dt>
              <dd>{{ application.dv_data_reference }}</dd>
            </div>
          </dl>
        </goa-container>

        <!-- 4. Part B: Expansion Details -->
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">4. Expansion Details</h2>
          <dl class="info-list">
            <div class="info-row">
              <dt>Expansion Type</dt>
              <dd>{{ formatExpansionType(application.expansion_type) }}</dd>
            </div>
            <div class="info-row">
              <dt>Proposed Bed Count</dt>
              <dd>{{ application.proposed_bed_count ?? '—' }}</dd>
            </div>
            <div class="info-row">
              <dt>Proposed Open Date</dt>
              <dd>{{ application.proposed_open_date || '—' }}</dd>
            </div>
          </dl>
        </goa-container>
      </template>

      <!-- Budget -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">{{ isPartB ? '5' : '3' }}. Budget</h2>
        <div v-if="application.budget_lines && application.budget_lines.length > 0">
          <table class="budget-table">
            <thead>
              <tr><th>Category</th><th>Description</th><th class="budget-amount-cell">Amount</th></tr>
            </thead>
            <tbody>
              <tr v-for="line in application.budget_lines" :key="line.id || line.category">
                <td>{{ line.category }}</td>
                <td>{{ line.description || '—' }}</td>
                <td class="budget-amount-cell">{{ formatCurrency(line.annual_amount) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td colspan="2"><strong>Total Funding Requested</strong></td><td class="budget-amount-cell"><strong>{{ formatCurrency(application.total_funding_requested) }}</strong></td></tr>
            </tfoot>
          </table>
        </div>
        <p v-else class="section-hint">No budget lines submitted.</p>
      </goa-container>

      <!-- Part B: Federal Funding -->
      <template v-if="isPartB">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">6. Federal Funding</h2>
          <dl class="info-list">
            <div class="info-row">
              <dt>Federal Funding</dt>
              <dd>{{ application.has_federal_funding === true ? 'Yes' : application.has_federal_funding === false ? 'No' : '—' }}</dd>
            </div>
            <template v-if="application.has_federal_funding === true">
              <div class="info-row" v-if="application.federal_agency_name"><dt>Agency</dt><dd>{{ application.federal_agency_name }}</dd></div>
              <div class="info-row" v-if="application.federal_funding_amount"><dt>Amount</dt><dd>{{ formatCurrency(application.federal_funding_amount) }}</dd></div>
              <div class="info-row" v-if="application.federal_funding_expiry_date"><dt>Expiry Date</dt><dd>{{ application.federal_funding_expiry_date }}</dd></div>
            </template>
          </dl>
        </goa-container>
      </template>

      <!-- Documents -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">{{ isPartB ? '7' : '4' }}. Documents</h2>
        <div v-if="documents.length > 0">
          <table class="budget-table">
            <thead><tr><th>File Name</th><th>Type</th><th>Size</th><th>Uploaded</th></tr></thead>
            <tbody>
              <tr v-for="doc in documents" :key="doc.id">
                <td><a :href="getDownloadUrl(doc)" class="doc-link" target="_blank">{{ doc.file_name }}</a></td>
                <td>{{ doc.document_type_code || '—' }}</td>
                <td>{{ formatFileSize(doc.file_size_bytes) }}</td>
                <td>{{ formatDate(doc.uploaded_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="section-hint">No documents uploaded.</p>
      </goa-container>

      <!-- Status History -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">{{ isPartB ? '8' : '5' }}. Status History</h2>
        <div v-if="statusHistory.length > 0" class="status-timeline">
          <div v-for="entry in statusHistory" :key="entry.id" class="timeline-entry">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <goa-badge :type="statusBadgeType(entry.to_status)" :content="entry.to_status"></goa-badge>
                <span class="timeline-date">{{ formatDateTime(entry.changed_at) }}</span>
              </div>
              <p v-if="entry.from_status" class="timeline-detail">
                Changed from <strong>{{ entry.from_status }}</strong> to <strong>{{ entry.to_status }}</strong>
                <span v-if="entry.changed_by_role"> by {{ entry.changed_by_role }}</span>
              </p>
              <p v-else class="timeline-detail">Application created</p>
              <p v-if="entry.note" class="timeline-note">{{ entry.note }}</p>
            </div>
          </div>
        </div>
        <p v-else class="section-hint">No status history available.</p>
      </goa-container>

      <!-- Messages -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">{{ isPartB ? '9' : '6' }}. Messages</h2>
        <div v-if="messages.length > 0" class="message-thread">
          <div v-for="msg in messages" :key="msg.id" class="message-bubble" :class="{ 'message-applicant': msg.sender_role === 'Applicant', 'message-cfs': msg.sender_role !== 'Applicant' }">
            <div class="message-meta">
              <strong>{{ msg.sender_role === 'Applicant' ? 'Applicant' : 'CFS Staff' }}</strong>
              <span class="message-time">{{ formatDateTime(msg.sent_at) }}</span>
            </div>
            <p class="message-body">{{ msg.body }}</p>
          </div>
        </div>
        <p v-else class="section-hint">No messages yet.</p>

        <goa-spacer vspacing="m"></goa-spacer>
        <goa-form-item label="Send Message to Applicant" :error="messageError">
          <goa-textarea
            name="admin_message"
            :value="adminMessage"
            @_change="adminMessage = ($event as CustomEvent).detail?.value || ''"
            width="100%"
            rows="3"
            placeholder="Type your message to the applicant..."
            :maxcharcount="5000"
          ></goa-textarea>
        </goa-form-item>
        <goa-spacer vspacing="s"></goa-spacer>
        <div class="status-update-actions">
          <GoabButton type="primary" size="compact" @click="handleSendMessage" :disabled="sendingMessage || !adminMessage.trim()">
            {{ sendingMessage ? 'Sending...' : 'Send Message' }}
          </GoabButton>
          <span v-if="messageSent" class="message-sent-indicator">Message sent.</span>
        </div>
      </goa-container>

      <!-- Internal Notes (admin only) -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">{{ isPartB ? '10' : '7' }}. Internal Notes</h2>
        <p class="section-hint">Notes are only visible to CFS staff — not shared with applicants.</p>

        <div v-if="notes.length > 0" class="notes-list">
          <div v-for="note in notes" :key="note.id" class="note-card">
            <div class="note-meta">
              <span class="note-date">{{ formatDateTime(note.created_at) }}</span>
            </div>
            <p class="note-text">{{ note.note_text }}</p>
          </div>
        </div>
        <p v-else class="section-hint" style="margin-top: var(--goa-space-s);">No internal notes yet.</p>

        <goa-spacer vspacing="m"></goa-spacer>
        <goa-form-item label="Add Note" :error="noteError">
          <goa-textarea
            name="new_note"
            :value="newNote"
            @_change="newNote = ($event as CustomEvent).detail?.value || ''"
            width="100%"
            rows="3"
            placeholder="Add an internal note..."
            :maxcharcount="5000"
          ></goa-textarea>
        </goa-form-item>
        <goa-spacer vspacing="s"></goa-spacer>
        <GoabButton type="secondary" size="compact" @click="handleAddNote" :disabled="addingNote || !newNote.trim()">
          {{ addingNote ? 'Saving...' : 'Add Note' }}
        </GoabButton>
        <span v-if="noteSaved" class="note-saved-indicator">Note saved.</span>
      </goa-container>

      <!-- Actions -->
      <div class="form-actions">
        <GoabButton type="tertiary" @click="router.push('/admin')">
          Back to Admin Dashboard
        </GoabButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { GoabButton } from '../components/goa'
import {
  fetchAdminApplicationDetail,
  fetchAdminHistory,
  fetchAdminMessages,
  fetchDocuments,
  getDocumentDownloadUrl,
  fetchAdminNotes,
  addAdminNote,
  sendAdminMessage,
  updateAdminStatus,
  type AdminApplicationDetail,
  type StatusHistoryEntry,
  type MessageRecord,
  type DocumentRecord,
  type InternalNote
} from '../services/api.service'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const loadError = ref('')
const application = ref<AdminApplicationDetail | null>(null)
const statusHistory = ref<StatusHistoryEntry[]>([])
const messages = ref<MessageRecord[]>([])
const documents = ref<DocumentRecord[]>([])
const notes = ref<InternalNote[]>([])

const newNote = ref('')
const addingNote = ref(false)
const noteError = ref('')
const noteSaved = ref(false)

// Status update (UC-22)
const selectedStatus = ref('')
const statusNote = ref('')
const updatingStatus = ref(false)
const statusUpdateError = ref('')
const statusUpdateSuccess = ref(false)

// Admin messaging (UC-23)
const adminMessage = ref('')
const sendingMessage = ref(false)
const messageError = ref('')
const messageSent = ref(false)

const VALID_TRANSITIONS: Record<string, string[]> = {
  Submitted: ['UnderReview'],
  UnderReview: ['MoreInfoRequired', 'Approved', 'Declined'],
  MoreInfoRequired: ['UnderReview']
}

const isPartB = computed(() => application.value?.application_type === 'PART_B_NEW_OR_EXPANSION')

const validTransitions = computed(() => {
  if (!application.value) return []
  return VALID_TRANSITIONS[application.value.status_code] || []
})

const isTerminalStatus = computed(() => {
  if (!application.value) return false
  return ['Approved', 'Declined'].includes(application.value.status_code)
})

onMounted(async () => {
  const id = route.params.id as string
  try {
    const [app, hist, msgs, docs, notesList] = await Promise.all([
      fetchAdminApplicationDetail(id),
      fetchAdminHistory(id),
      fetchAdminMessages(id),
      fetchDocuments(id).catch(() => [] as DocumentRecord[]),
      fetchAdminNotes(id)
    ])
    application.value = app
    statusHistory.value = hist
    messages.value = msgs
    documents.value = docs
    notes.value = notesList
  } catch (err: any) {
    loadError.value = err.response?.data?.error?.message || 'Failed to load application'
  } finally {
    loading.value = false
  }
})

async function handleAddNote() {
  if (addingNote.value || !application.value || !newNote.value.trim()) return
  addingNote.value = true
  noteError.value = ''
  noteSaved.value = false

  try {
    const note = await addAdminNote(application.value.id, newNote.value.trim())
    notes.value.unshift(note)
    newNote.value = ''
    noteSaved.value = true
    setTimeout(() => { noteSaved.value = false }, 3000)
  } catch (err: any) {
    noteError.value = err.response?.data?.error?.message || 'Failed to add note'
  } finally {
    addingNote.value = false
  }
}

async function handleUpdateStatus() {
  if (updatingStatus.value || !application.value || !selectedStatus.value) return
  updatingStatus.value = true
  statusUpdateError.value = ''
  statusUpdateSuccess.value = false

  try {
    const id = application.value.id
    const updated = await updateAdminStatus(id, selectedStatus.value, statusNote.value.trim() || undefined)
    application.value = { ...application.value, ...updated }
    statusUpdateSuccess.value = true
    selectedStatus.value = ''
    statusNote.value = ''
    setTimeout(() => { statusUpdateSuccess.value = false }, 3000)

    // Refresh history to show new entry
    statusHistory.value = await fetchAdminHistory(id)
  } catch (err: any) {
    statusUpdateError.value = err.response?.data?.error?.message || 'Failed to update status'
  } finally {
    updatingStatus.value = false
  }
}

async function handleSendMessage() {
  if (sendingMessage.value || !application.value || !adminMessage.value.trim()) return
  sendingMessage.value = true
  messageError.value = ''
  messageSent.value = false

  try {
    const msg = await sendAdminMessage(application.value.id, adminMessage.value.trim())
    messages.value.push(msg)
    adminMessage.value = ''
    messageSent.value = true
    setTimeout(() => { messageSent.value = false }, 3000)
  } catch (err: any) {
    messageError.value = err.response?.data?.error?.message || 'Failed to send message'
  } finally {
    sendingMessage.value = false
  }
}

function getDownloadUrl(doc: DocumentRecord): string {
  return getDocumentDownloadUrl(application.value!.id, doc.id)
}

function formatType(type: string | null): string {
  if (!type) return '—'
  switch (type) {
    case 'PART_A_BASE_RENEWAL': return 'Part A — Base Funding Renewal'
    case 'PART_B_NEW_OR_EXPANSION': return 'Part B — New/Expansion Funding'
    default: return type
  }
}

function formatProgramName(name: string | null): string {
  if (!name) return '—'
  switch (name) {
    case 'WomensShelter': return "Women's Shelter"
    case 'SecondStageShelter': return 'Second-Stage Shelter'
    default: return name
  }
}

function formatExpansionType(type: string | null): string {
  if (!type) return '—'
  switch (type) {
    case 'NewFacility': return 'New Facility'
    case 'BedExpansion': return 'Bed Expansion'
    case 'ProgramExpansion': return 'Program Expansion'
    default: return type
  }
}

function statusBadgeType(status: string): string {
  switch (status) {
    case 'Draft': return 'information'
    case 'Submitted': return 'midtone'
    case 'UnderReview': return 'midtone'
    case 'MoreInfoRequired': return 'important'
    case 'Approved': return 'success'
    case 'Declined': return 'emergency'
    default: return 'information'
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return num.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<style scoped>
.admin-detail-view {
  max-width: 960px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--goa-space-m);
  flex-wrap: wrap;
}

.page-title {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-xs) 0;
}

.page-subtitle {
  color: var(--goa-color-greyscale-700);
  font-size: var(--goa-font-size-4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--goa-space-s);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--goa-space-m);
  padding: var(--goa-space-2xl) 0;
  color: var(--goa-color-greyscale-700);
}

.section-title {
  font-size: var(--goa-font-size-5);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-m) 0;
}

.section-hint {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  margin: 0 0 var(--goa-space-m) 0;
}

.info-list {
  display: grid;
  gap: var(--goa-space-m);
  margin: 0;
  padding: 0;
}

.info-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--goa-space-m);
}

.info-row dt {
  font-weight: 600;
  color: var(--goa-color-greyscale-700);
  font-size: var(--goa-font-size-3);
}

.info-row dd {
  margin: 0;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-black);
}

.readonly-text {
  white-space: pre-wrap;
  line-height: 1.6;
}

.budget-table {
  width: 100%;
  border-collapse: collapse;
}

.budget-table th, .budget-table td {
  padding: var(--goa-space-s) var(--goa-space-m);
  text-align: left;
  border-bottom: 1px solid var(--goa-color-greyscale-200);
  font-size: var(--goa-font-size-3);
}

.budget-table th {
  font-weight: 600;
  color: var(--goa-color-greyscale-700);
  background: var(--goa-color-greyscale-100);
}

.budget-table tfoot td {
  border-top: 2px solid var(--goa-color-greyscale-400);
  font-weight: 600;
}

.budget-amount-cell {
  text-align: right;
}

.doc-link {
  color: var(--goa-color-interactive-default);
  text-decoration: underline;
}

/* Status Update */
.status-update-form {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-m);
}

.status-update-actions {
  display: flex;
  align-items: center;
  gap: var(--goa-space-m);
}

.status-update-success,
.message-sent-indicator {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-status-success);
  font-weight: 600;
}

/* Status History Timeline */
.status-timeline {
  position: relative;
  padding-left: var(--goa-space-l);
}

.status-timeline::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--goa-color-greyscale-300);
}

.timeline-entry {
  position: relative;
  padding-bottom: var(--goa-space-m);
}

.timeline-entry:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: calc(-1 * var(--goa-space-l) + 2px);
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--goa-color-interactive-default);
  border: 2px solid white;
}

.timeline-content {
  padding-left: var(--goa-space-xs);
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: var(--goa-space-m);
  margin-bottom: var(--goa-space-2xs);
}

.timeline-date {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-greyscale-500);
}

.timeline-detail {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  margin: 0;
}

.timeline-note {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-greyscale-500);
  font-style: italic;
  margin: var(--goa-space-2xs) 0 0;
}

/* Messages */
.message-thread {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-m);
}

.message-bubble {
  padding: var(--goa-space-m);
  border-radius: 8px;
  max-width: 80%;
}

.message-applicant {
  background: var(--goa-color-greyscale-100);
  color: var(--goa-color-greyscale-black);
  align-self: flex-start;
}

.message-cfs {
  background: var(--goa-color-interactive-default);
  color: white;
  align-self: flex-end;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--goa-space-m);
  margin-bottom: var(--goa-space-xs);
  font-size: var(--goa-font-size-2);
}

.message-cfs .message-meta {
  color: rgba(255, 255, 255, 0.85);
}

.message-time {
  font-size: var(--goa-font-size-1);
  opacity: 0.8;
}

.message-body {
  margin: 0;
  font-size: var(--goa-font-size-3);
  line-height: 1.5;
  white-space: pre-wrap;
}

/* Internal Notes */
.notes-list {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-m);
  margin-top: var(--goa-space-m);
}

.note-card {
  padding: var(--goa-space-m);
  background: var(--goa-color-greyscale-100);
  border-radius: 4px;
  border-left: 3px solid var(--goa-color-interactive-default);
}

.note-meta {
  margin-bottom: var(--goa-space-xs);
}

.note-date {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-greyscale-500);
}

.note-text {
  margin: 0;
  font-size: var(--goa-font-size-3);
  line-height: 1.5;
  white-space: pre-wrap;
}

.note-saved-indicator {
  margin-left: var(--goa-space-m);
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-status-success);
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--goa-space-m);
  padding: var(--goa-space-l) 0;
  margin-top: var(--goa-space-l);
  border-top: 1px solid var(--goa-color-greyscale-200);
}
</style>
