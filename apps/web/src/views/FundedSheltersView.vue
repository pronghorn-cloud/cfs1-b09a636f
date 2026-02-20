<template>
  <div class="funded-shelters-view">
    <h1 class="page-title">Funded Shelter Listing</h1>
    <p class="page-description">
      The following organizations currently receive Government of Alberta funding
      to provide women's shelter and second-stage shelter services across the province.
    </p>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Filters -->
    <goa-container accent="thin">
      <div class="filters">
        <goa-form-item label="Search by name">
          <goa-input
            name="search"
            type="search"
            placeholder="Enter shelter name..."
            :value="searchTerm"
            width="100%"
            @_change="handleSearchChange"
          ></goa-input>
        </goa-form-item>

        <goa-form-item label="Filter by zone">
          <goa-dropdown
            name="zone"
            placeholder="All zones"
            :value="selectedZone"
            @_change="handleZoneChange"
          >
            <goa-dropdown-item
              v-for="zone in zones"
              :key="zone.code"
              :value="zone.code"
              :label="zone.name"
            ></goa-dropdown-item>
          </goa-dropdown>
        </goa-form-item>

        <div class="filter-actions">
          <GoabButton
            v-if="searchTerm || selectedZone"
            type="tertiary"
            size="compact"
            @click="clearFilters"
          >
            Clear filters
          </GoabButton>
        </div>
      </div>
    </goa-container>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
    </div>

    <!-- Error State -->
    <goa-callout v-else-if="error" type="emergency" heading="Unable to load shelters">
      <p>{{ error }}</p>
      <goa-spacer vspacing="s"></goa-spacer>
      <GoabButton type="secondary" size="compact" @click="loadShelters">
        Try again
      </GoabButton>
    </goa-callout>

    <!-- No Results -->
    <goa-callout
      v-else-if="filteredShelters.length === 0"
      type="information"
      heading="No shelters found"
    >
      <p>No shelters found matching your search. Try clearing the filters or using different search terms.</p>
    </goa-callout>

    <!-- Shelters Table -->
    <div v-else>
      <p class="results-count">
        Showing <strong>{{ filteredShelters.length }}</strong> funded
        {{ filteredShelters.length === 1 ? 'shelter' : 'shelters' }}
      </p>

      <table class="shelters-table" width="100%">
        <thead>
          <tr>
            <th>Shelter Name</th>
            <th>City</th>
            <th>Zone</th>
            <th>Beds</th>
            <th>Units</th>
            <th>Service Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="shelter in filteredShelters" :key="shelter.id">
            <td><strong>{{ shelter.shelter_name }}</strong></td>
            <td>{{ shelter.city }}</td>
            <td>{{ shelter.zone_name }}</td>
            <td>{{ shelter.bed_count ?? '—' }}</td>
            <td>{{ shelter.unit_count ?? '—' }}</td>
            <td>
              <goa-badge
                :type="shelter.service_type_code === 'WOMENS_SHELTER' ? 'information' : 'success'"
                :content="shelter.service_type_name"
              ></goa-badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Data Portal Link (UC-06) -->
    <goa-callout type="information" heading="Monthly Reporting">
      <p>
        Currently funded shelters can access the Women's Shelter Data Portal
        for monthly data reporting and submissions.
      </p>
      <goa-spacer vspacing="s"></goa-spacer>
      <a
        href="https://womens-shelter-data.alberta.ca"
        target="_blank"
        rel="noopener noreferrer"
        class="data-portal-link"
      >
        Open Women's Shelter Data Portal
        <goa-icon type="open" size="small"></goa-icon>
      </a>
    </goa-callout>

    <goa-spacer vspacing="xl"></goa-spacer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { GoabButton } from '../components/goa'
import { fetchFundedShelters, fetchZones, type FundedShelter, type Zone } from '../services/api.service'

const shelters = ref<FundedShelter[]>([])
const zones = ref<Zone[]>([])
const searchTerm = ref('')
const selectedZone = ref('')
const loading = ref(true)
const error = ref<string | null>(null)

const filteredShelters = computed(() => {
  return shelters.value
})

function handleSearchChange(event: Event) {
  const detail = (event as CustomEvent).detail
  searchTerm.value = detail?.value ?? ''
  loadShelters()
}

function handleZoneChange(event: Event) {
  const detail = (event as CustomEvent).detail
  selectedZone.value = detail?.value ?? ''
  loadShelters()
}

function clearFilters() {
  searchTerm.value = ''
  selectedZone.value = ''
  loadShelters()
}

async function loadShelters() {
  try {
    loading.value = true
    error.value = null

    const params: Record<string, string> = {}
    if (searchTerm.value) params.search = searchTerm.value
    if (selectedZone.value) params.zone = selectedZone.value

    shelters.value = await fetchFundedShelters(params)
  } catch (err: any) {
    error.value = 'The funded shelter listing is temporarily unavailable. Please try again later.'
    console.error('Failed to load shelters:', err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const [shelterData, zoneData] = await Promise.all([
      fetchFundedShelters(),
      fetchZones()
    ])
    shelters.value = shelterData
    zones.value = zoneData
  } catch (err: any) {
    error.value = 'The funded shelter listing is temporarily unavailable. Please try again later.'
    console.error('Failed to load data:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-title {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-s) 0;
}

.page-description {
  font-size: var(--goa-font-size-4);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-4);
  margin: 0;
}

.filters {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: var(--goa-space-l);
  align-items: end;
}

.filter-actions {
  padding-bottom: var(--goa-space-xs);
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: var(--goa-space-2xl) 0;
}

.results-count {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  margin: 0 0 var(--goa-space-m) 0;
}

.data-portal-link {
  display: inline-flex;
  align-items: center;
  gap: var(--goa-space-xs);
  color: var(--goa-color-interactive-default);
  text-decoration: underline;
  font-size: var(--goa-font-size-4);
  font-weight: 600;
}

.data-portal-link:hover {
  color: var(--goa-color-interactive-hover);
}

/* Responsive */
@media (max-width: 768px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
/* Shelters table styling */
.funded-shelters-view .shelters-table {
  width: 100%;
  border-collapse: collapse;
}

.funded-shelters-view .shelters-table th,
.funded-shelters-view .shelters-table td {
  padding: 12px 16px;
  border: 1px solid #ddd;
  text-align: left;
}

.funded-shelters-view .shelters-table th {
  background-color: #f1f1f1;
  font-weight: 700;
  white-space: nowrap;
}

.funded-shelters-view .shelters-table td {
  vertical-align: middle;
}
</style>
