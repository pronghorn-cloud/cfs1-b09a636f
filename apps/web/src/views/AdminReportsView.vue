<template>
  <div class="admin-reports-view">
    <!-- Header -->
    <div class="form-header">
      <div>
        <h1 class="page-title">Reports</h1>
        <p class="page-subtitle">Generate and export formal reports across all submitted applications (BR-004: excludes Draft).</p>
      </div>
      <GoabButton type="tertiary" size="compact" @click="router.push('/admin')">
        Back to Admin Dashboard
      </GoabButton>
    </div>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Report Type + Filters -->
    <goa-container accent="thin" mb="l">
      <h2 class="section-title">Report Configuration</h2>

      <goa-form-item label="Report Type" mb="l">
        <goa-dropdown
          name="report_type"
          :value="reportType"
          @_change="onReportTypeChange(($event as CustomEvent).detail?.value || 'cost-pressure')"
          width="360px"
        >
          <goa-dropdown-item value="cost-pressure" label="Cost Pressure Report"></goa-dropdown-item>
          <goa-dropdown-item value="regional" label="Regional Funding Distribution Report"></goa-dropdown-item>
          <goa-dropdown-item value="fiscal-year" label="Fiscal Year Summary Report"></goa-dropdown-item>
        </goa-dropdown>
      </goa-form-item>

      <h3 class="filter-heading">Filters</h3>
      <div class="filter-grid">
        <goa-form-item label="Application Type">
          <goa-dropdown
            name="app_type_filter"
            :value="filterType"
            @_change="filterType = ($event as CustomEvent).detail?.value || ''"
            width="280px"
          >
            <goa-dropdown-item value="" label="All Types"></goa-dropdown-item>
            <goa-dropdown-item value="PART_A_BASE_RENEWAL" label="Part A — Base Renewal"></goa-dropdown-item>
            <goa-dropdown-item value="PART_B_NEW_OR_EXPANSION" label="Part B — New/Expansion"></goa-dropdown-item>
          </goa-dropdown>
        </goa-form-item>

        <goa-form-item label="Zone">
          <goa-dropdown
            name="zone_filter"
            :value="filterZone"
            @_change="filterZone = ($event as CustomEvent).detail?.value || ''"
            width="280px"
          >
            <goa-dropdown-item value="" label="All Zones"></goa-dropdown-item>
            <goa-dropdown-item v-for="z in zones" :key="z.code" :value="z.code" :label="z.name"></goa-dropdown-item>
          </goa-dropdown>
        </goa-form-item>

        <goa-form-item label="Date From">
          <goa-input
            type="date"
            name="date_from"
            :value="filterDateFrom"
            @_change="filterDateFrom = ($event as CustomEvent).detail?.value || ''"
            width="200px"
          ></goa-input>
        </goa-form-item>

        <goa-form-item label="Date To">
          <goa-input
            type="date"
            name="date_to"
            :value="filterDateTo"
            @_change="filterDateTo = ($event as CustomEvent).detail?.value || ''"
            width="200px"
          ></goa-input>
        </goa-form-item>
      </div>

      <goa-spacer vspacing="m"></goa-spacer>
      <div class="filter-actions">
        <GoabButton type="primary" size="compact" @click="generateReport" :disabled="loading">
          {{ loading ? 'Generating...' : 'Generate Report' }}
        </GoabButton>
        <GoabButton type="secondary" size="compact" @click="clearFilters">
          Clear Filters
        </GoabButton>
        <a v-if="hasReport" :href="csvUrl" class="csv-link" target="_blank">
          <GoabButton type="tertiary" size="compact">
            Export as CSV
          </GoabButton>
        </a>
      </div>
    </goa-container>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
      <p>Generating report...</p>
    </div>

    <!-- Error -->
    <goa-callout v-if="loadError" type="emergency" heading="Error" mb="l">
      <p>{{ loadError }}</p>
    </goa-callout>

    <!-- ========= COST PRESSURE REPORT ========= -->
    <template v-if="reportType === 'cost-pressure' && costPressureReport && !loading">
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Summary</h2>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-value">{{ costPressureReport.total_applications }}</div>
            <div class="summary-label">Total Applications</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">{{ formatCurrency(costPressureReport.total_funding_requested) }}</div>
            <div class="summary-label">Total Funding Requested</div>
          </div>
        </div>
      </goa-container>

      <goa-container accent="thin" mb="l">
        <h2 class="section-title">By Application Type</h2>
        <table v-if="costPressureReport.by_type.length > 0" class="report-table">
          <thead>
            <tr><th>Application Type</th><th class="num-cell">Count</th><th class="num-cell">Total Requested</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in costPressureReport.by_type" :key="row.application_type">
              <td>{{ formatType(row.application_type) }}</td>
              <td class="num-cell">{{ row.count }}</td>
              <td class="num-cell">{{ formatCurrency(row.total_requested) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="section-hint">No data for current filters.</p>
      </goa-container>

      <goa-container accent="thin" mb="l">
        <h2 class="section-title">By Zone</h2>
        <table v-if="costPressureReport.by_zone.length > 0" class="report-table">
          <thead>
            <tr><th>Zone</th><th class="num-cell">Count</th><th class="num-cell">Total Requested</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in costPressureReport.by_zone" :key="row.zone_code">
              <td>{{ row.zone_name }}</td>
              <td class="num-cell">{{ row.count }}</td>
              <td class="num-cell">{{ formatCurrency(row.total_requested) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="section-hint">No data for current filters.</p>
      </goa-container>

      <goa-container accent="thin" mb="l">
        <h2 class="section-title">By Fiscal Year</h2>
        <table v-if="costPressureReport.by_fiscal_year.length > 0" class="report-table">
          <thead>
            <tr><th>Fiscal Year</th><th class="num-cell">Count</th><th class="num-cell">Total Requested</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in costPressureReport.by_fiscal_year" :key="row.fiscal_year_code">
              <td>{{ row.fiscal_year_code }}</td>
              <td class="num-cell">{{ row.count }}</td>
              <td class="num-cell">{{ formatCurrency(row.total_requested) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="section-hint">No data for current filters.</p>
      </goa-container>

      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Cost Pressure Analysis</h2>
        <p class="section-hint">Compares total funding requested against budget allocations. Positive pressure indicates requests exceed allocations.</p>
        <table v-if="costPressureReport.cost_pressure.length > 0" class="report-table">
          <thead>
            <tr>
              <th>Fiscal Year</th>
              <th>Zone</th>
              <th>Type</th>
              <th class="num-cell">Requested</th>
              <th class="num-cell">Allocated</th>
              <th class="num-cell">Pressure</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in costPressureReport.cost_pressure" :key="i" :class="{ 'pressure-positive': row.pressure > 0, 'pressure-negative': row.pressure < 0 }">
              <td>{{ row.fiscal_year_code }}</td>
              <td>{{ row.zone_code }}</td>
              <td>{{ formatType(row.application_type) }}</td>
              <td class="num-cell">{{ formatCurrency(row.total_requested) }}</td>
              <td class="num-cell">{{ formatCurrency(row.allocated_amount) }}</td>
              <td class="num-cell pressure-cell">{{ row.pressure > 0 ? '+' : '' }}{{ formatCurrency(row.pressure) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="section-hint">No cost pressure data available (applications may not have zone or fiscal year assigned).</p>
      </goa-container>

      <goa-callout v-if="costPressureReport.total_applications === 0" type="information" heading="No Matching Applications" mb="l">
        <p>No applications match the selected report parameters. Please adjust the date range or filters.</p>
      </goa-callout>
    </template>

    <!-- ========= REGIONAL DISTRIBUTION REPORT ========= -->
    <template v-if="reportType === 'regional' && regionalReport && !loading">
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Summary</h2>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-value">{{ regionalReport.total_applications }}</div>
            <div class="summary-label">Total Applications</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">{{ formatCurrency(regionalReport.total_funding_requested) }}</div>
            <div class="summary-label">Total Funding Requested</div>
          </div>
        </div>
      </goa-container>

      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Regional Funding Distribution</h2>
        <table v-if="regionalReport.zones.length > 0" class="report-table">
          <thead>
            <tr>
              <th>Zone</th>
              <th class="num-cell">Applications</th>
              <th class="num-cell">Total Requested</th>
              <th class="num-cell">Approved</th>
              <th class="num-cell">Declined</th>
              <th class="num-cell">Approval Rate</th>
              <th class="num-cell">Avg Request</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in regionalReport.zones" :key="row.zone_code">
              <td>{{ row.zone_name }}</td>
              <td class="num-cell">{{ row.count }}</td>
              <td class="num-cell">{{ formatCurrency(row.total_requested) }}</td>
              <td class="num-cell">{{ row.approved_count }}</td>
              <td class="num-cell">{{ row.declined_count }}</td>
              <td class="num-cell">{{ row.approval_rate }}%</td>
              <td class="num-cell">{{ formatCurrency(row.avg_request_amount) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="section-hint">No regional data for current filters.</p>
      </goa-container>

      <goa-callout v-if="regionalReport.total_applications === 0" type="information" heading="No Matching Applications" mb="l">
        <p>No applications match the selected criteria. Adjust your filter parameters and try again.</p>
      </goa-callout>
    </template>

    <!-- ========= FISCAL YEAR SUMMARY REPORT ========= -->
    <template v-if="reportType === 'fiscal-year' && fiscalYearReport && !loading">
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Summary</h2>
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-value">{{ fiscalYearReport.total_applications }}</div>
            <div class="summary-label">Total Applications</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">{{ formatCurrency(fiscalYearReport.total_funding_requested) }}</div>
            <div class="summary-label">Total Funding Requested</div>
          </div>
        </div>
      </goa-container>

      <goa-container accent="thin" mb="l">
        <h2 class="section-title">Fiscal Year Summary</h2>
        <table v-if="fiscalYearReport.fiscal_years.length > 0" class="report-table">
          <thead>
            <tr>
              <th>Fiscal Year</th>
              <th class="num-cell">Applications</th>
              <th class="num-cell">Total Requested</th>
              <th class="num-cell">Approved</th>
              <th class="num-cell">Declined</th>
              <th class="num-cell">Approval Rate</th>
              <th class="num-cell">Approved Funding</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in fiscalYearReport.fiscal_years" :key="row.fiscal_year_code">
              <td>{{ row.fiscal_year_code }}</td>
              <td class="num-cell">{{ row.count }}</td>
              <td class="num-cell">{{ formatCurrency(row.total_requested) }}</td>
              <td class="num-cell">{{ row.approved_count }}</td>
              <td class="num-cell">{{ row.declined_count }}</td>
              <td class="num-cell">{{ row.approval_rate }}%</td>
              <td class="num-cell">{{ formatCurrency(row.total_approved_funding) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="section-hint">No fiscal year data for current filters.</p>
      </goa-container>

      <goa-callout v-if="fiscalYearReport.total_applications === 0" type="information" heading="No Matching Applications" mb="l">
        <p>No applications match the selected criteria. Adjust your filter parameters and try again.</p>
      </goa-callout>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GoabButton } from '../components/goa'
import {
  fetchCostPressureReport,
  getCostPressureCsvUrl,
  fetchRegionalReport,
  getRegionalCsvUrl,
  fetchFiscalYearReport,
  getFiscalYearCsvUrl,
  fetchZones,
  type CostPressureReport,
  type RegionalReport,
  type FiscalYearReport,
  type Zone
} from '../services/api.service'

const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const reportType = ref('cost-pressure')
const zones = ref<Zone[]>([])

// Report data (one ref per type)
const costPressureReport = ref<CostPressureReport | null>(null)
const regionalReport = ref<RegionalReport | null>(null)
const fiscalYearReport = ref<FiscalYearReport | null>(null)

// Filters
const filterType = ref('')
const filterZone = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

const filterParams = computed(() => ({
  application_type: filterType.value || undefined,
  zone: filterZone.value || undefined,
  date_from: filterDateFrom.value || undefined,
  date_to: filterDateTo.value || undefined
}))

const hasReport = computed(() => {
  if (reportType.value === 'cost-pressure') return !!costPressureReport.value
  if (reportType.value === 'regional') return !!regionalReport.value
  if (reportType.value === 'fiscal-year') return !!fiscalYearReport.value
  return false
})

const csvUrl = computed(() => {
  const p = filterParams.value
  if (reportType.value === 'regional') return getRegionalCsvUrl(p)
  if (reportType.value === 'fiscal-year') return getFiscalYearCsvUrl(p)
  return getCostPressureCsvUrl(p)
})

onMounted(async () => {
  try {
    zones.value = await fetchZones()
  } catch {
    // Zones are optional
  }
  await generateReport()
})

function onReportTypeChange(value: string) {
  reportType.value = value
  // Clear previous results so stale data doesn't show
  costPressureReport.value = null
  regionalReport.value = null
  fiscalYearReport.value = null
}

async function generateReport() {
  loading.value = true
  loadError.value = ''

  try {
    const p = filterParams.value
    if (reportType.value === 'cost-pressure') {
      costPressureReport.value = await fetchCostPressureReport(p)
    } else if (reportType.value === 'regional') {
      regionalReport.value = await fetchRegionalReport(p)
    } else if (reportType.value === 'fiscal-year') {
      fiscalYearReport.value = await fetchFiscalYearReport(p)
    }
  } catch (err: any) {
    loadError.value = err.response?.data?.error?.message || 'Failed to generate report'
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filterType.value = ''
  filterZone.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

function formatType(type: string): string {
  switch (type) {
    case 'PART_A_BASE_RENEWAL': return 'Part A — Base Renewal'
    case 'PART_B_NEW_OR_EXPANSION': return 'Part B — New/Expansion'
    default: return type
  }
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>

<style scoped>
.admin-reports-view {
  max-width: 1100px;
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
  font-size: var(--goa-font-size-3);
  margin: 0;
}

.section-title {
  font-size: var(--goa-font-size-5);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-m) 0;
}

.filter-heading {
  font-size: var(--goa-font-size-4);
  font-weight: 600;
  color: var(--goa-color-greyscale-700);
  margin: 0 0 var(--goa-space-s) 0;
}

.section-hint {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  margin: 0 0 var(--goa-space-m) 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--goa-space-m);
  padding: var(--goa-space-2xl) 0;
  color: var(--goa-color-greyscale-700);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--goa-space-m);
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: var(--goa-space-m);
  flex-wrap: wrap;
}

.csv-link {
  text-decoration: none;
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

.summary-label {
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

.pressure-positive .pressure-cell {
  color: var(--goa-color-status-emergency);
  font-weight: 600;
}

.pressure-negative .pressure-cell {
  color: var(--goa-color-status-success);
  font-weight: 600;
}
</style>
