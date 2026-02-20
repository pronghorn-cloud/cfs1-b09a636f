<template>
  <div class="dashboard-view">
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">Application Dashboard</h1>
        <p class="page-subtitle">Manage your funding applications</p>
      </div>
      <GoabButton type="primary" size="compact" @click="handleNewApplication">
        {{ creating ? 'Creating...' : 'New Application' }}
      </GoabButton>
    </div>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
      <p>Loading your applications...</p>
    </div>

    <!-- Error -->
    <goa-callout v-else-if="error" type="emergency" heading="Error">
      <p>{{ error }}</p>
    </goa-callout>

    <!-- No org registered -->
    <goa-callout v-else-if="noOrg" type="important" heading="Organization Registration Required">
      <p>You must register your organization before creating funding applications.</p>
      <goa-spacer vspacing="m"></goa-spacer>
      <GoabButton type="primary" size="compact" @click="router.push('/register-organization')">
        Register Your Organization
      </GoabButton>
    </goa-callout>

    <!-- Applications list -->
    <template v-else>
      <!-- Empty state -->
      <goa-callout v-if="applications.length === 0" type="information" heading="No Applications Yet">
        <p>You haven't started any funding applications. Click <strong>New Application</strong> to begin.</p>
      </goa-callout>

      <!-- Filter + table -->
      <template v-else>
        <!-- Status filter -->
        <div class="filter-bar">
          <div class="filter-group">
            <label class="filter-label" for="status-filter">Filter by status</label>
            <goa-dropdown id="status-filter" :value="statusFilter" @_change="handleStatusFilter" width="220px">
              <goa-dropdown-item value="All" label="All statuses"></goa-dropdown-item>
              <goa-dropdown-item value="Draft" label="Draft"></goa-dropdown-item>
              <goa-dropdown-item value="Submitted" label="Submitted"></goa-dropdown-item>
              <goa-dropdown-item value="UnderReview" label="Under Review"></goa-dropdown-item>
              <goa-dropdown-item value="MoreInfoRequired" label="More Info Required"></goa-dropdown-item>
              <goa-dropdown-item value="Approved" label="Approved"></goa-dropdown-item>
              <goa-dropdown-item value="Declined" label="Declined"></goa-dropdown-item>
            </goa-dropdown>
          </div>
          <p class="filter-count">
            Showing {{ filteredApplications.length }} of {{ applications.length }} application{{ applications.length !== 1 ? 's' : '' }}
          </p>
        </div>

        <goa-spacer vspacing="m"></goa-spacer>

        <!-- No results after filter -->
        <goa-callout v-if="filteredApplications.length === 0" type="information" heading="No Matching Applications">
          <p>No applications match the selected status filter. Try selecting a different status or "All statuses".</p>
        </goa-callout>

        <!-- Applications table -->
        <div v-else class="applications-list">
          <table width="100%">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Program</th>
                <th>Type</th>
                <th>Status</th>
                <th>Funding Requested</th>
                <th class="sortable-header" @click="toggleSort">
                  Date
                  <span class="sort-icon">{{ sortAsc ? '▲' : '▼' }}</span>
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="app in sortedApplications" :key="app.id">
                <td><strong>{{ app.reference_number }}</strong></td>
                <td>{{ app.program_name || '—' }}</td>
                <td>{{ formatType(app.application_type) }}</td>
                <td>
                  <goa-badge :type="statusBadgeType(app.status_code)" :content="app.status_name || app.status_code"></goa-badge>
                </td>
                <td>{{ formatCurrency(app.total_funding_requested) }}</td>
                <td>{{ formatDate(app.submitted_at || app.updated_at) }}</td>
                <td>
                  <GoabButton type="tertiary" size="compact" @click="openApplication(app)">
                    {{ app.status_code === 'Draft' ? 'Continue' : 'View' }}
                  </GoabButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GoabButton } from '../components/goa'
import {
  fetchApplications,
  fetchMyOrganization,
  startNewApplication,
  type ApplicationSummary
} from '../services/api.service'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const noOrg = ref(false)
const creating = ref(false)
const applications = ref<ApplicationSummary[]>([])
const statusFilter = ref('All')
const sortAsc = ref(false) // newest first by default

const filteredApplications = computed(() => {
  if (statusFilter.value === 'All') return applications.value
  return applications.value.filter(a => a.status_code === statusFilter.value)
})

const sortedApplications = computed(() => {
  const list = [...filteredApplications.value]
  list.sort((a, b) => {
    const dateA = new Date(a.submitted_at || a.updated_at).getTime()
    const dateB = new Date(b.submitted_at || b.updated_at).getTime()
    return sortAsc.value ? dateA - dateB : dateB - dateA
  })
  return list
})

function handleStatusFilter(e: Event) {
  statusFilter.value = (e as CustomEvent).detail?.value || 'All'
}

function toggleSort() {
  sortAsc.value = !sortAsc.value
}

onMounted(async () => {
  try {
    // Check org exists first
    const org = await fetchMyOrganization()
    if (!org) {
      noOrg.value = true
      return
    }

    // Load applications
    applications.value = await fetchApplications()
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to load applications'
  } finally {
    loading.value = false
  }
})

async function handleNewApplication() {
  if (creating.value) return
  try {
    creating.value = true
    error.value = ''
    const { application } = await startNewApplication()
    // Navigate to application type selection (UC-10)
    router.push(`/applications/${application.id}/type`)
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.error?.code === 'ORG_NOT_REGISTERED') {
      noOrg.value = true
    } else {
      error.value = err.response?.data?.error?.message || 'Failed to create application'
    }
  } finally {
    creating.value = false
  }
}

function openApplication(app: ApplicationSummary) {
  if (app.status_code === 'Draft' && !app.application_type) {
    // No type selected yet — go to type selection
    router.push(`/applications/${app.id}/type`)
  } else {
    // Go to application detail/form
    router.push(`/applications/${app.id}`)
  }
}

function formatType(type: string | null): string {
  if (!type) return 'Not selected'
  switch (type) {
    case 'PART_A_BASE_RENEWAL': return 'Part A — Base Renewal'
    case 'PART_B_NEW_OR_EXPANSION': return 'Part B — New / Expansion'
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

function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return num.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>

<style scoped>
.dashboard-view {
  max-width: 960px;
}

.dashboard-header {
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
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--goa-space-m);
  padding: var(--goa-space-2xl) 0;
  color: var(--goa-color-greyscale-700);
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--goa-space-m);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-xs);
}

.filter-label {
  font-size: var(--goa-font-size-3);
  font-weight: 400;
  color: var(--goa-color-greyscale-700);
}

.filter-count {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  margin: 0;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
}

.sortable-header:hover {
  color: var(--goa-color-interactive-default);
}

.sort-icon {
  font-size: 0.7em;
  margin-left: var(--goa-space-2xs);
}

.applications-list {
  overflow-x: auto;
}
</style>
