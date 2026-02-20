<template>
  <div class="admin-data-dashboard-view">
    <!-- Header -->
    <div class="form-header">
      <div>
        <h1 class="page-title">Data Dashboard</h1>
        <p class="page-subtitle">Summary metrics, status distribution, regional breakdown, trends, and KPIs.</p>
      </div>
      <div class="header-actions">
        <GoabButton type="secondary" size="compact" @click="refreshDashboard" :disabled="loading">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </GoabButton>
        <GoabButton type="tertiary" size="compact" @click="router.push('/admin/reports')">
          Generate Report
        </GoabButton>
        <GoabButton type="tertiary" size="compact" @click="router.push('/admin')">
          Back to Admin
        </GoabButton>
      </div>
    </div>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
      <p>Loading dashboard data...</p>
    </div>

    <!-- Error -->
    <goa-callout v-if="loadError" type="emergency" heading="Error" mb="l">
      <p>{{ loadError }}</p>
    </goa-callout>

    <template v-if="dashboard && !loading">
      <!-- Summary Metrics -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Summary</h2>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-value">{{ dashboard.summary.total_applications }}</div>
            <div class="summary-label">Total Applications</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">{{ formatCurrency(dashboard.summary.total_funding_requested) }}</div>
            <div class="summary-label">Total Funding Requested</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">{{ formatCurrency(dashboard.summary.average_request_amount) }}</div>
            <div class="summary-label">Average Request Amount</div>
          </div>
        </div>
      </goa-container>

      <!-- Status Distribution -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Status Distribution</h2>
        <div v-if="dashboard.status_distribution.length > 0" class="status-bars">
          <div v-for="item in dashboard.status_distribution" :key="item.status" class="status-bar-row">
            <div class="status-bar-label">
              <goa-badge :type="statusBadgeType(item.status)" :content="item.status"></goa-badge>
            </div>
            <div class="status-bar-track">
              <div
                class="status-bar-fill"
                :style="{ width: statusBarWidth(item.count) + '%' }"
              ></div>
            </div>
            <div class="status-bar-count">{{ item.count }}</div>
          </div>
        </div>
        <p v-else class="section-hint">No application data available.</p>
      </goa-container>

      <!-- Regional Distribution -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Regional Distribution</h2>
        <table v-if="dashboard.regional_distribution.length > 0" class="report-table">
          <thead>
            <tr>
              <th>Zone</th>
              <th class="num-cell">Applications</th>
              <th class="num-cell">Total Requested</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dashboard.regional_distribution" :key="row.zone_code">
              <td>{{ row.zone_name }}</td>
              <td class="num-cell">{{ row.count }}</td>
              <td class="num-cell">{{ formatCurrency(row.total_requested) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="section-hint">No regional data available.</p>
      </goa-container>

      <!-- Fiscal Year Trends -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Fiscal Year Trends</h2>
        <table v-if="dashboard.fiscal_year_trends.length > 0" class="report-table">
          <thead>
            <tr>
              <th>Fiscal Year</th>
              <th class="num-cell">Applications</th>
              <th class="num-cell">Total Requested</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dashboard.fiscal_year_trends" :key="row.fiscal_year_code">
              <td>{{ row.fiscal_year_code }}</td>
              <td class="num-cell">{{ row.count }}</td>
              <td class="num-cell">{{ formatCurrency(row.total_requested) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="section-hint">No fiscal year data available.</p>
      </goa-container>

      <!-- KPIs -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Key Performance Indicators</h2>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-value kpi-value">{{ dashboard.kpis.approval_rate }}%</div>
            <div class="summary-label">Approval Rate</div>
          </div>
          <div class="summary-card">
            <div class="summary-value kpi-value">{{ formatCurrency(dashboard.kpis.total_approved_funding) }}</div>
            <div class="summary-label">Total Approved Funding</div>
          </div>
          <div class="summary-card">
            <div class="summary-value kpi-value">
              {{ dashboard.kpis.avg_processing_days !== null ? dashboard.kpis.avg_processing_days + ' days' : 'N/A' }}
            </div>
            <div class="summary-label">Avg. Processing Time</div>
          </div>
        </div>
      </goa-container>

      <!-- No data message -->
      <goa-callout v-if="dashboard.summary.total_applications === 0" type="information" heading="No Data" mb="l">
        <p>No applications have been submitted yet. Dashboard metrics will populate as applications are processed.</p>
      </goa-callout>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GoabButton } from '../components/goa'
import { fetchDashboard, type DashboardData } from '../services/api.service'

const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const dashboard = ref<DashboardData | null>(null)

const maxStatusCount = computed(() => {
  if (!dashboard.value) return 1
  return Math.max(...dashboard.value.status_distribution.map(s => s.count), 1)
})

onMounted(async () => {
  await refreshDashboard()
})

async function refreshDashboard() {
  loading.value = true
  loadError.value = ''

  try {
    dashboard.value = await fetchDashboard()
  } catch (err: any) {
    loadError.value = err.response?.data?.error?.message || 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

function statusBadgeType(status: string): string {
  switch (status) {
    case 'Approved': return 'success'
    case 'Declined': return 'emergency'
    case 'UnderReview': return 'information'
    case 'Submitted': return 'midtone'
    case 'Draft': return 'dark'
    default: return 'midtone'
  }
}

function statusBarWidth(count: number): number {
  return Math.round((count / maxStatusCount.value) * 100)
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '$0'
  return amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>

<style scoped>
.admin-data-dashboard-view {
  max-width: 1100px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--goa-space-m);
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: var(--goa-space-s);
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
  font-size: var(--goa-font-size-3);
  margin: 0;
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

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--goa-space-l);
}

.summary-card {
  padding: var(--goa-space-l);
  background: var(--goa-color-greyscale-100);
  border-radius: 4px;
  text-align: center;
}

.summary-value {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-interactive-default);
  margin-bottom: var(--goa-space-xs);
}

.kpi-value {
  color: var(--goa-color-status-success);
}

.summary-label {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
}

/* Status Distribution Bars */
.status-bars {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-m);
}

.status-bar-row {
  display: flex;
  align-items: center;
  gap: var(--goa-space-m);
}

.status-bar-label {
  width: 130px;
  flex-shrink: 0;
}

.status-bar-track {
  flex: 1;
  height: 24px;
  background: var(--goa-color-greyscale-100);
  border-radius: 4px;
  overflow: hidden;
}

.status-bar-fill {
  height: 100%;
  background: var(--goa-color-interactive-default);
  border-radius: 4px;
  transition: width 0.3s ease;
  min-width: 4px;
}

.status-bar-count {
  width: 48px;
  text-align: right;
  font-weight: 600;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
}

/* Report Tables */
.report-table {
  width: 100%;
  border-collapse: collapse;
}

.report-table th,
.report-table td {
  padding: var(--goa-space-s) var(--goa-space-m);
  text-align: left;
  border-bottom: 1px solid var(--goa-color-greyscale-200);
  font-size: var(--goa-font-size-3);
}

.report-table th {
  font-weight: 600;
  color: var(--goa-color-greyscale-700);
  background: var(--goa-color-greyscale-100);
}

.num-cell {
  text-align: right;
}
</style>
