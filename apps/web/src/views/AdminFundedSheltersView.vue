<template>
  <div class="admin-shelters-view">
    <!-- Header -->
    <div class="form-header">
      <div>
        <h1 class="page-title">Manage Funded Shelters</h1>
        <p class="page-subtitle">Add, edit, or deactivate funded shelter listings.</p>
      </div>
      <div class="header-actions">
        <GoabButton type="primary" size="compact" @click="openCreateForm">
          Add Shelter
        </GoabButton>
        <GoabButton type="tertiary" size="compact" @click="router.push('/admin')">
          Back to Admin Dashboard
        </GoabButton>
      </div>
    </div>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Create / Edit Form -->
    <goa-container v-if="showForm" accent="thin" mb="l">
      <h2 class="section-title">{{ editingId ? 'Edit Shelter' : 'Add New Shelter' }}</h2>

      <div class="form-grid">
        <goa-form-item label="Shelter Name" :error="formErrors.shelter_name">
          <goa-input
            name="shelter_name"
            :value="form.shelter_name"
            @_change="form.shelter_name = ($event as CustomEvent).detail?.value || ''"
            width="100%"
          ></goa-input>
        </goa-form-item>

        <goa-form-item label="City" :error="formErrors.city">
          <goa-input
            name="city"
            :value="form.city"
            @_change="form.city = ($event as CustomEvent).detail?.value || ''"
            width="100%"
          ></goa-input>
        </goa-form-item>

        <goa-form-item label="Zone" :error="formErrors.zone_code">
          <goa-dropdown
            name="zone_code"
            :value="form.zone_code"
            @_change="form.zone_code = ($event as CustomEvent).detail?.value || ''"
            width="100%"
          >
            <goa-dropdown-item value="" label="Select a zone"></goa-dropdown-item>
            <goa-dropdown-item v-for="z in zones" :key="z.code" :value="z.code" :label="z.name"></goa-dropdown-item>
          </goa-dropdown>
        </goa-form-item>

        <goa-form-item label="Service Type" :error="formErrors.service_type_code">
          <goa-dropdown
            name="service_type_code"
            :value="form.service_type_code"
            @_change="form.service_type_code = ($event as CustomEvent).detail?.value || ''"
            width="100%"
          >
            <goa-dropdown-item value="" label="Select type"></goa-dropdown-item>
            <goa-dropdown-item value="WOMENS_SHELTER" label="Women's Shelter"></goa-dropdown-item>
            <goa-dropdown-item value="SECOND_STAGE_SHELTER" label="Second-Stage Shelter"></goa-dropdown-item>
          </goa-dropdown>
        </goa-form-item>

        <goa-form-item label="Bed Count">
          <goa-input
            name="bed_count"
            type="number"
            :value="form.bed_count?.toString() || ''"
            @_change="form.bed_count = parseIntOrNull(($event as CustomEvent).detail?.value)"
            width="100%"
          ></goa-input>
        </goa-form-item>

        <goa-form-item label="Unit Count">
          <goa-input
            name="unit_count"
            type="number"
            :value="form.unit_count?.toString() || ''"
            @_change="form.unit_count = parseIntOrNull(($event as CustomEvent).detail?.value)"
            width="100%"
          ></goa-input>
        </goa-form-item>

        <goa-form-item label="Funding Amount ($)">
          <goa-input
            name="funding_amount"
            type="number"
            :value="form.funding_amount?.toString() || ''"
            @_change="form.funding_amount = parseFloatOrNull(($event as CustomEvent).detail?.value)"
            width="100%"
          ></goa-input>
        </goa-form-item>
      </div>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-callout v-if="formError" type="emergency" heading="Error" mb="m">
        <p>{{ formError }}</p>
      </goa-callout>

      <div class="form-actions">
        <GoabButton type="primary" size="compact" @click="handleSave" :disabled="saving">
          {{ saving ? 'Saving...' : (editingId ? 'Update Shelter' : 'Create Shelter') }}
        </GoabButton>
        <GoabButton type="secondary" size="compact" @click="cancelForm">
          Cancel
        </GoabButton>
      </div>
    </goa-container>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
      <p>Loading funded shelters...</p>
    </div>

    <!-- Error -->
    <goa-callout v-else-if="loadError" type="emergency" heading="Error" mb="l">
      <p>{{ loadError }}</p>
    </goa-callout>

    <!-- Shelters Table -->
    <template v-else>
      <p class="results-count">
        Showing <strong>{{ shelters.length }}</strong> funded {{ shelters.length === 1 ? 'shelter' : 'shelters' }}
      </p>

      <goa-callout v-if="shelters.length === 0" type="information" heading="No Funded Shelters">
        <p>No funded shelters have been added yet. Click "Add Shelter" to create one.</p>
      </goa-callout>

      <div v-else class="table-container">
        <table width="100%">
          <thead>
            <tr>
              <th>Shelter Name</th>
              <th>City</th>
              <th>Zone</th>
              <th>Type</th>
              <th class="num-cell">Beds</th>
              <th class="num-cell">Units</th>
              <th class="num-cell">Funding</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in shelters" :key="s.id" :class="{ 'inactive-row': !s.is_active }">
              <td><strong>{{ s.shelter_name }}</strong></td>
              <td>{{ s.city }}</td>
              <td>{{ s.zone_name }}</td>
              <td>
                <goa-badge
                  :type="s.service_type_code === 'WOMENS_SHELTER' ? 'information' : 'success'"
                  :content="s.service_type_name"
                ></goa-badge>
              </td>
              <td class="num-cell">{{ s.bed_count ?? '—' }}</td>
              <td class="num-cell">{{ s.unit_count ?? '—' }}</td>
              <td class="num-cell">{{ formatCurrency(s.funding_amount) }}</td>
              <td>
                <goa-badge
                  :type="s.is_active ? 'success' : 'midtone'"
                  :content="s.is_active ? 'Active' : 'Inactive'"
                ></goa-badge>
              </td>
              <td class="action-cell">
                <GoabButton type="tertiary" size="compact" @click="openEditForm(s)">
                  Edit
                </GoabButton>
                <GoabButton
                  :type="s.is_active ? 'tertiary' : 'tertiary'"
                  size="compact"
                  @click="toggleActive(s)"
                >
                  {{ s.is_active ? 'Deactivate' : 'Activate' }}
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GoabButton } from '../components/goa'
import {
  fetchAdminShelters,
  createAdminShelter,
  updateAdminShelter,
  fetchZones,
  type AdminFundedShelter,
  type Zone
} from '../services/api.service'

const router = useRouter()

const loading = ref(true)
const loadError = ref('')
const shelters = ref<AdminFundedShelter[]>([])
const zones = ref<Zone[]>([])

// Form state
const showForm = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const formError = ref('')
const formErrors = ref<Record<string, string>>({})

const defaultForm = {
  shelter_name: '',
  city: '',
  zone_code: '',
  service_type_code: '',
  bed_count: null as number | null,
  unit_count: null as number | null,
  funding_amount: null as number | null
}
const form = ref({ ...defaultForm })

onMounted(async () => {
  try {
    const [shelterData, zoneData] = await Promise.all([
      fetchAdminShelters(),
      fetchZones()
    ])
    shelters.value = shelterData
    zones.value = zoneData
  } catch (err: any) {
    loadError.value = err.response?.data?.error?.message || 'Failed to load funded shelters'
  } finally {
    loading.value = false
  }
})

function openCreateForm() {
  editingId.value = null
  form.value = { ...defaultForm }
  formError.value = ''
  formErrors.value = {}
  showForm.value = true
}

function openEditForm(shelter: AdminFundedShelter) {
  editingId.value = shelter.id
  form.value = {
    shelter_name: shelter.shelter_name,
    city: shelter.city,
    zone_code: shelter.zone_code,
    service_type_code: shelter.service_type_code,
    bed_count: shelter.bed_count,
    unit_count: shelter.unit_count,
    funding_amount: shelter.funding_amount
  }
  formError.value = ''
  formErrors.value = {}
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
  formError.value = ''
  formErrors.value = {}
}

function validateForm(): boolean {
  const errors: Record<string, string> = {}
  if (!form.value.shelter_name.trim()) errors.shelter_name = 'Shelter name is required.'
  if (!form.value.city.trim()) errors.city = 'City is required.'
  if (!form.value.zone_code) errors.zone_code = 'Zone is required.'
  if (!form.value.service_type_code) errors.service_type_code = 'Service type is required.'
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

async function handleSave() {
  if (!validateForm()) return
  saving.value = true
  formError.value = ''

  try {
    if (editingId.value) {
      const updated = await updateAdminShelter(editingId.value, form.value)
      const idx = shelters.value.findIndex(s => s.id === editingId.value)
      if (idx >= 0) shelters.value[idx] = updated
    } else {
      const created = await createAdminShelter({
        ...form.value,
        is_active: true
      })
      shelters.value.push(created)
    }
    showForm.value = false
    editingId.value = null
  } catch (err: any) {
    formError.value = err.response?.data?.error?.message || 'Failed to save shelter'
  } finally {
    saving.value = false
  }
}

async function toggleActive(shelter: AdminFundedShelter) {
  try {
    const updated = await updateAdminShelter(shelter.id, { is_active: !shelter.is_active })
    const idx = shelters.value.findIndex(s => s.id === shelter.id)
    if (idx >= 0) shelters.value[idx] = updated
  } catch (err: any) {
    loadError.value = err.response?.data?.error?.message || 'Failed to update shelter status'
  }
}

function parseIntOrNull(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

function parseFloatOrNull(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
</script>

<style scoped>
.admin-shelters-view {
  max-width: 1200px;
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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--goa-space-m);
  padding: var(--goa-space-2xl) 0;
  color: var(--goa-color-greyscale-700);
}

.results-count {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  margin: 0 0 var(--goa-space-m) 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--goa-space-m);
}

.form-actions {
  display: flex;
  gap: var(--goa-space-m);
}

.table-container {
  overflow-x: auto;
}

.num-cell {
  text-align: right;
}

.action-cell {
  white-space: nowrap;
  display: flex;
  gap: var(--goa-space-xs);
}

.inactive-row {
  opacity: 0.6;
}
</style>
