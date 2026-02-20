<template>
  <div class="type-view">
    <h1 class="page-title">Select Application Type</h1>
    <p class="page-subtitle">Choose the type of funding application you'd like to submit.</p>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
    </div>

    <!-- Error -->
    <goa-callout v-else-if="error" type="emergency" heading="Error">
      <p>{{ error }}</p>
    </goa-callout>

    <template v-else>
      <goa-spacer vspacing="l"></goa-spacer>

      <!-- Validation error -->
      <goa-callout v-if="validationError" type="emergency" heading="Selection Required" mb="l">
        <p>{{ validationError }}</p>
      </goa-callout>

      <!-- Type selection cards -->
      <div class="type-cards">
        <div
          class="type-card"
          :class="{ selected: selectedType === 'PART_A_BASE_RENEWAL' }"
          @click="selectType('PART_A_BASE_RENEWAL')"
          role="radio"
          :aria-checked="selectedType === 'PART_A_BASE_RENEWAL'"
          tabindex="0"
          @keydown.enter="selectType('PART_A_BASE_RENEWAL')"
          @keydown.space.prevent="selectType('PART_A_BASE_RENEWAL')"
        >
          <div class="type-card-header">
            <div class="radio-indicator" :class="{ checked: selectedType === 'PART_A_BASE_RENEWAL' }"></div>
            <h2 class="type-card-title">Part A &mdash; Base Funding Renewal</h2>
          </div>
          <p class="type-card-description">
            For <strong>currently funded agencies</strong> renewing their base operational funding.
            Use this form if your organization already receives Women's Shelter funding and is
            applying for continued support in the upcoming fiscal year.
          </p>
        </div>

        <div
          class="type-card"
          :class="{ selected: selectedType === 'PART_B_NEW_OR_EXPANSION' }"
          @click="selectType('PART_B_NEW_OR_EXPANSION')"
          role="radio"
          :aria-checked="selectedType === 'PART_B_NEW_OR_EXPANSION'"
          tabindex="0"
          @keydown.enter="selectType('PART_B_NEW_OR_EXPANSION')"
          @keydown.space.prevent="selectType('PART_B_NEW_OR_EXPANSION')"
        >
          <div class="type-card-header">
            <div class="radio-indicator" :class="{ checked: selectedType === 'PART_B_NEW_OR_EXPANSION' }"></div>
            <h2 class="type-card-title">Part B &mdash; New Agency or Expansion Request</h2>
          </div>
          <p class="type-card-description">
            For <strong>new agencies</strong> or <strong>existing agencies requesting new or increased funding</strong>.
            Use this form if your organization is applying for the first time or seeking
            additional funding beyond your current allocation.
          </p>
        </div>
      </div>

      <goa-spacer vspacing="xl"></goa-spacer>

      <!-- Actions -->
      <div class="actions">
        <GoabButton type="tertiary" @click="router.push('/dashboard')">
          Back to Dashboard
        </GoabButton>
        <GoabButton type="primary" @click="handleContinue" :disabled="saving">
          {{ saving ? 'Saving...' : 'Continue' }}
        </GoabButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { GoabButton } from '../components/goa'
import { fetchApplication, setApplicationType } from '../services/api.service'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref('')
const saving = ref(false)
const validationError = ref('')
const selectedType = ref<'PART_A_BASE_RENEWAL' | 'PART_B_NEW_OR_EXPANSION' | null>(null)
const applicationId = ref('')

onMounted(async () => {
  try {
    const id = route.params.id as string
    applicationId.value = id

    const app = await fetchApplication(id)

    // Pre-select current type if already set (coming back to change)
    if (app.application_type === 'PART_A_BASE_RENEWAL' || app.application_type === 'PART_B_NEW_OR_EXPANSION') {
      selectedType.value = app.application_type
    }
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to load application'
  } finally {
    loading.value = false
  }
})

function selectType(type: 'PART_A_BASE_RENEWAL' | 'PART_B_NEW_OR_EXPANSION') {
  selectedType.value = type
  validationError.value = ''
}

async function handleContinue() {
  if (!selectedType.value) {
    validationError.value = 'Please select an application type to proceed.'
    return
  }

  try {
    saving.value = true
    validationError.value = ''
    await setApplicationType(applicationId.value, selectedType.value)
    // Navigate to application form (UC-11 for Part A, UC-12 for Part B)
    router.push(`/applications/${applicationId.value}`)
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to set application type'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.type-view {
  max-width: 800px;
}

.page-title {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-xs) 0;
  padding-bottom: var(--goa-space-s);
  border-bottom: 2px solid var(--goa-color-interactive-default);
}

.page-subtitle {
  color: var(--goa-color-greyscale-700);
  font-size: var(--goa-font-size-4);
  margin: 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: var(--goa-space-2xl) 0;
}

.type-cards {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-l);
}

.type-card {
  border: 2px solid var(--goa-color-greyscale-200);
  border-radius: 4px;
  padding: var(--goa-space-l);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}

.type-card:hover {
  border-color: var(--goa-color-interactive-default);
}

.type-card:focus-visible {
  outline: 3px solid var(--goa-color-interactive-focus);
  outline-offset: 2px;
}

.type-card.selected {
  border-color: var(--goa-color-interactive-default);
  box-shadow: 0 0 0 1px var(--goa-color-interactive-default);
  background: var(--goa-color-info-background, #f0f7ff);
}

.type-card-header {
  display: flex;
  align-items: center;
  gap: var(--goa-space-m);
  margin-bottom: var(--goa-space-s);
}

.radio-indicator {
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 50%;
  border: 2px solid var(--goa-color-greyscale-400);
  position: relative;
  transition: border-color 0.2s;
}

.radio-indicator.checked {
  border-color: var(--goa-color-interactive-default);
}

.radio-indicator.checked::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--goa-color-interactive-default);
}

.type-card-title {
  font-size: var(--goa-font-size-5);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin: 0;
}

.type-card-description {
  color: var(--goa-color-greyscale-700);
  margin: 0;
  padding-left: calc(20px + var(--goa-space-m));
  line-height: 1.5;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
