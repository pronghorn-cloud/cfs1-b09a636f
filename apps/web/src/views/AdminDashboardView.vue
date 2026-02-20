<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">Admin Dashboard</h1>
        <p class="page-subtitle">All submitted applications across organizations</p>
      </div>
    </div>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
      <p>Loading applications...</p>
    </div>

    <!-- Error -->
    <goa-callout v-else-if="error" type="emergency" heading="Error">
      <p>{{ error }}</p>
    </goa-callout>

    <!-- Content -->
    <template v-else>
      <!-- Filters -->
      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label" for="admin-status-filter">Status</label>
          <goa-dropdown id="admin-status-filter" :value="statusFilter" @_change="handleStatusFilter" width="220px">
            <goa-dropdown-item value="All" label="All statuses"></goa-dropdown-item>
            <goa-dropdown-item value="Submitted" label="Submitted"></goa-dropdown-item>
            <goa-dropdown-item value="UnderReview" label="Under Review"></goa-dropdown-item>
            <goa-dropdown-item value="MoreInfoRequired" label="More Info Required"></goa-dropdown-item>
            <goa-dropdown-item value="Approved" label="Approved"></goa-dropdown-item>
            <goa-dropdown-item value="Declined" label="Declined"></goa-dropdown-item>
          </goa-dropdown>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="admin-search">Search organization</label>
          <GoabInput
            id="admin-search"
            type="text"
            name="admin-search"
            :value="searchInput"
            placeholder="Type to search..."
            width="280px"
            @_change="handleSearchInput"
          />
        </div>

        <p class="filter-count">
          Showing {{ filteredApplications.length }} of {{ applications.length }} application{{ applications.length !== 1 ? 's' : '' }}
        </p>
      </div>

      <goa-spacer vspacing="m"></goa-spacer>

      <!-- Empty state -->
      <goa-callout v-if="applications.length === 0" type="information" heading="No Submitted Applications">
        <p>No applications have been submitted yet.</p>
      </goa-callout>

      <!-- No filter results -->
      <goa-callout v-else-if="filteredApplications.length === 0" type="information" heading="No Matching Applications">
        <p>No applications match the selected filters. Please adjust your filters.</p>
      </goa-callout>

      <!-- Applications table -->
      <div v-else class="applications-list">
        <table width="100%">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Organization</th>
              <th>Type</th>
              <th>Program</th>
              <th>Status</th>
              <th>Funding Requested</th>
              <th class="sortable-header" @click="toggleSort">
                Submitted
                <span class="sort-icon">{{ sortAsc ? '▲' : '▼' }}</span>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="app in sortedApplications" :key="app.id">
              <td><strong>{{ app.reference_number }}</strong></td>
              <td>{{ app.organization_name }}</td>
              <td>{{ formatType(app.application_type) }}</td>
              <td>{{ app.program_name || '—' }}</td>
              <td>
                <goa-badge :type="statusBadgeType(app.status_code)" :content="app.status_code"></goa-badge>
              </td>
              <td>{{ formatCurrency(app.total_funding_requested) }}</td>
              <td>{{ app.submitted_at ? formatDate(app.submitted_at) : '—' }}</td>
              <td>
                <GoabButton type="tertiary" size="compact" @click="router.push(`/admin/applications/${app.id}`)">
                  Review
                </GoabButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GoabButton, GoabInput } from '../components/goa'
import {
  fetchAdminApplications,
  type AdminApplicationRow
} from '../services/api.service'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const applications = ref<AdminApplicationRow[]>([])
const statusFilter = ref('All')
const searchInput = ref('')
const sortAsc = ref(false)

const filteredApplications = computed(() => {
  let list = applications.value

  if (statusFilter.value !== 'All') {
    list = list.filter(a => a.status_code === statusFilter.value)
  }

  if (searchInput.value.trim()) {
    const q = searchInput.value.trim().toLowerCase()
    list = list.filter(a =>
      a.organization_name.toLowerCase().includes(q) ||
      a.reference_number.toLowerCase().includes(q)
    )
  }

  return list
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

function handleSearchInput(e: Event) {
  searchInput.value = (e as CustomEvent).detail?.value || ''
}

function toggleSort() {
  sortAsc.value = !sortAsc.value
}

onMounted(async () => {
  try {
    applications.value = await fetchAdminApplications()
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to load applications'
  } finally {
    loading.value = false
  }
})

function formatType(type: string | null): string {
  if (!type) return '—'
  switch (type) {
    case 'PART_A_BASE_RENEWAL': return 'Part A'
    case 'PART_B_NEW_OR_EXPANSION': return 'Part B'
    default: return type
  }
}

function statusBadgeType(status: string): string {
  switch (status) {
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
.admin-dashboard {
  max-width: 1100px;
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
  align-items: flex-end;
  gap: var(--goa-space-l);
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
