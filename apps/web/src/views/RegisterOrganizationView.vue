<template>
  <div class="register-org-view">
    <h1 class="page-title">Register Your Organization</h1>
    <p class="page-subtitle">
      Complete this form to register your organization with the Women's Shelter Funding Portal.
      All fields marked as required must be filled in.
    </p>

    <goa-spacer vspacing="l"></goa-spacer>

    <!-- Loading: checking if org already exists -->
    <div v-if="checking" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
      <p>Checking your organization status...</p>
    </div>

    <!-- Already registered -->
    <goa-callout v-else-if="alreadyRegistered" type="important" heading="Organization Already Registered">
      <p>
        An organization profile already exists for your MyAlberta.ca account.
        Please navigate to your <router-link to="/profile">account page</router-link> to view your profile.
      </p>
    </goa-callout>

    <!-- Success State -->
    <goa-callout v-else-if="registered" type="success" heading="Registration Complete">
      <p>{{ successMessage }}</p>
      <goa-spacer vspacing="m"></goa-spacer>
      <GoabButton type="primary" size="compact" @click="goToProfile">
        Go to My Account
      </GoabButton>
    </goa-callout>

    <!-- Registration Form -->
    <template v-else>
      <form @submit.prevent="handleSubmit" novalidate>
        <!-- Organization Details -->
        <goa-container accent="thin">
          <h2 class="section-title">Organization Details</h2>

          <goa-form-item
            label="Legal organization name"
            requirement="required"
            :error="errors.legal_name"
          >
            <goa-input
              name="legal_name"
              type="text"
              :value="form.legal_name"
              width="100%"
              :error="!!errors.legal_name"
              @_change="handleFieldChange('legal_name', $event)"
            ></goa-input>
          </goa-form-item>

          <goa-spacer vspacing="m"></goa-spacer>

          <goa-form-item
            label="Organization type"
            requirement="required"
            :error="errors.organization_type"
          >
            <goa-dropdown
              name="organization_type"
              :value="form.organization_type"
              width="100%"
              :error="!!errors.organization_type"
              @_change="handleFieldChange('organization_type', $event)"
            >
              <goa-dropdown-item value="Non-Profit Society" label="Non-Profit Society"></goa-dropdown-item>
              <goa-dropdown-item value="Registered Charity" label="Registered Charity"></goa-dropdown-item>
              <goa-dropdown-item value="Indigenous Organization" label="Indigenous Organization"></goa-dropdown-item>
              <goa-dropdown-item value="Other" label="Other"></goa-dropdown-item>
            </goa-dropdown>
          </goa-form-item>

          <goa-spacer vspacing="m"></goa-spacer>

          <goa-grid gap="m" minchildwidth="200px">
            <goa-form-item
              label="Society / Registration number"
            >
              <goa-input
                name="society_registration_number"
                type="text"
                placeholder="e.g., S-2024-12345"
                :value="form.society_registration_number"
                width="100%"
                @_change="handleFieldChange('society_registration_number', $event)"
              ></goa-input>
            </goa-form-item>

            <goa-form-item
              label="Registration date"
            >
              <goa-input
                name="registration_date"
                type="date"
                :value="form.registration_date"
                width="100%"
                @_change="handleFieldChange('registration_date', $event)"
              ></goa-input>
            </goa-form-item>
          </goa-grid>
        </goa-container>

        <goa-spacer vspacing="l"></goa-spacer>

        <!-- Service Address -->
        <goa-container accent="thin">
          <h2 class="section-title">Service Address</h2>

          <goa-form-item
            label="Street address"
            requirement="required"
            :error="errors.service_address_street"
          >
            <goa-input
              name="service_address_street"
              type="text"
              :value="form.service_address_street"
              width="100%"
              :error="!!errors.service_address_street"
              @_change="handleFieldChange('service_address_street', $event)"
            ></goa-input>
          </goa-form-item>

          <goa-spacer vspacing="m"></goa-spacer>

          <goa-grid gap="m" minchildwidth="200px">
            <goa-form-item
              label="City"
              requirement="required"
              :error="errors.service_address_city"
            >
              <goa-input
                name="service_address_city"
                type="text"
                :value="form.service_address_city"
                width="100%"
                :error="!!errors.service_address_city"
                @_change="handleFieldChange('service_address_city', $event)"
              ></goa-input>
            </goa-form-item>

            <goa-form-item label="Province">
              <goa-input
                name="service_address_province"
                type="text"
                :value="form.service_address_province"
                width="100%"
                readonly
              ></goa-input>
            </goa-form-item>

            <goa-form-item
              label="Postal code"
              requirement="required"
              :error="errors.service_address_postal_code"
            >
              <goa-input
                name="service_address_postal_code"
                type="text"
                placeholder="A1A 1A1"
                :value="form.service_address_postal_code"
                width="100%"
                :error="!!errors.service_address_postal_code"
                @_change="handleFieldChange('service_address_postal_code', $event)"
              ></goa-input>
            </goa-form-item>
          </goa-grid>
        </goa-container>

        <goa-spacer vspacing="l"></goa-spacer>

        <!-- Mailing Address -->
        <goa-container accent="thin">
          <h2 class="section-title">Mailing Address</h2>

          <goa-checkbox
            name="same_as_service"
            text="Mailing address same as service address"
            :checked="sameAsService"
            @_change="handleSameAsService"
          ></goa-checkbox>

          <goa-spacer vspacing="m"></goa-spacer>

          <template v-if="!sameAsService">
            <goa-form-item
              label="Street address"
              requirement="required"
              :error="errors.mailing_address_street"
            >
              <goa-input
                name="mailing_address_street"
                type="text"
                :value="form.mailing_address_street"
                width="100%"
                :error="!!errors.mailing_address_street"
                @_change="handleFieldChange('mailing_address_street', $event)"
              ></goa-input>
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <goa-grid gap="m" minchildwidth="200px">
              <goa-form-item
                label="City"
                requirement="required"
                :error="errors.mailing_address_city"
              >
                <goa-input
                  name="mailing_address_city"
                  type="text"
                  :value="form.mailing_address_city"
                  width="100%"
                  :error="!!errors.mailing_address_city"
                  @_change="handleFieldChange('mailing_address_city', $event)"
                ></goa-input>
              </goa-form-item>

              <goa-form-item label="Province">
                <goa-input
                  name="mailing_address_province"
                  type="text"
                  :value="form.mailing_address_province"
                  width="100%"
                  readonly
                ></goa-input>
              </goa-form-item>

              <goa-form-item
                label="Postal code"
                requirement="required"
                :error="errors.mailing_address_postal_code"
              >
                <goa-input
                  name="mailing_address_postal_code"
                  type="text"
                  placeholder="A1A 1A1"
                  :value="form.mailing_address_postal_code"
                  width="100%"
                  :error="!!errors.mailing_address_postal_code"
                  @_change="handleFieldChange('mailing_address_postal_code', $event)"
                ></goa-input>
              </goa-form-item>
            </goa-grid>
          </template>
        </goa-container>

        <goa-spacer vspacing="l"></goa-spacer>

        <!-- Primary Contact -->
        <goa-container accent="thin">
          <h2 class="section-title">Primary Contact</h2>

          <goa-form-item
            label="Contact name"
            requirement="required"
            :error="errors.primary_contact_name"
          >
            <goa-input
              name="primary_contact_name"
              type="text"
              :value="form.primary_contact_name"
              width="100%"
              :error="!!errors.primary_contact_name"
              @_change="handleFieldChange('primary_contact_name', $event)"
            ></goa-input>
          </goa-form-item>

          <goa-spacer vspacing="m"></goa-spacer>

          <goa-grid gap="m" minchildwidth="200px">
            <goa-form-item
              label="Contact email"
              requirement="required"
              :error="errors.primary_contact_email"
            >
              <goa-input
                name="primary_contact_email"
                type="email"
                placeholder="name@example.com"
                :value="form.primary_contact_email"
                width="100%"
                :error="!!errors.primary_contact_email"
                @_change="handleFieldChange('primary_contact_email', $event)"
              ></goa-input>
            </goa-form-item>

            <goa-form-item
              label="Contact phone"
              requirement="required"
              :error="errors.primary_contact_phone"
            >
              <goa-input
                name="primary_contact_phone"
                type="tel"
                placeholder="(780) 555-0123"
                :value="form.primary_contact_phone"
                width="100%"
                :error="!!errors.primary_contact_phone"
                @_change="handleFieldChange('primary_contact_phone', $event)"
              ></goa-input>
            </goa-form-item>
          </goa-grid>
        </goa-container>

        <goa-spacer vspacing="l"></goa-spacer>

        <!-- Submission Error -->
        <goa-callout v-if="submitError" type="emergency" heading="Registration Failed">
          <p>{{ submitError }}</p>
        </goa-callout>

        <goa-spacer v-if="submitError" vspacing="m"></goa-spacer>

        <goa-button-group alignment="start">
          <GoabButton type="primary" :disabled="submitting" @click="handleSubmit">
            {{ submitting ? 'Registering...' : 'Register Organization' }}
          </GoabButton>
        </goa-button-group>
      </form>
    </template>

    <goa-spacer vspacing="xl"></goa-spacer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { GoabButton } from '../components/goa'
import { fetchMyOrganization, registerOrganization } from '../services/api.service'

const router = useRouter()
const authStore = useAuthStore()

const checking = ref(true)
const alreadyRegistered = ref(false)
const registered = ref(false)
const submitting = ref(false)
const submitError = ref('')
const successMessage = ref('')
const sameAsService = ref(false)

const form = reactive({
  legal_name: '',
  organization_type: '',
  society_registration_number: '',
  registration_date: '',
  service_address_street: '',
  service_address_city: '',
  service_address_province: 'AB',
  service_address_postal_code: '',
  mailing_address_street: '',
  mailing_address_city: '',
  mailing_address_province: 'AB',
  mailing_address_postal_code: '',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: ''
})

const errors = reactive<Record<string, string>>({})

// Pre-populate from MyAlberta.ca attributes
onMounted(async () => {
  try {
    // Check if user already has an org
    const existingOrg = await fetchMyOrganization()
    if (existingOrg) {
      alreadyRegistered.value = true
      return
    }

    // Pre-populate org name from MyAlberta.ca account
    const user = authStore.user
    if (user?.attributes?.organizationName) {
      form.legal_name = user.attributes.organizationName
    }
    if (user?.name) {
      form.primary_contact_name = user.name
    }
    if (user?.email) {
      form.primary_contact_email = user.email
    }
  } catch (err) {
    console.error('Failed to check organization status:', err)
  } finally {
    checking.value = false
  }
})

function handleFieldChange(field: string, event: Event) {
  const detail = (event as CustomEvent).detail
  const value = detail?.value ?? ''
  ;(form as any)[field] = value
  if (errors[field]) {
    errors[field] = ''
  }
}

function handleSameAsService(event: Event) {
  const detail = (event as CustomEvent).detail
  sameAsService.value = !!detail?.checked
  if (sameAsService.value) {
    form.mailing_address_street = form.service_address_street
    form.mailing_address_city = form.service_address_city
    form.mailing_address_province = form.service_address_province
    form.mailing_address_postal_code = form.service_address_postal_code
    // Clear mailing address errors
    errors.mailing_address_street = ''
    errors.mailing_address_city = ''
    errors.mailing_address_postal_code = ''
  }
}

function validateForm(): boolean {
  let valid = true
  // Clear all errors first
  Object.keys(errors).forEach(k => errors[k] = '')

  if (!form.legal_name.trim()) {
    errors.legal_name = 'Legal organization name is required'
    valid = false
  }

  if (!form.organization_type) {
    errors.organization_type = 'Organization type is required'
    valid = false
  }

  // Service address
  if (!form.service_address_street.trim()) {
    errors.service_address_street = 'Street address is required'
    valid = false
  }
  if (!form.service_address_city.trim()) {
    errors.service_address_city = 'City is required'
    valid = false
  }
  if (!form.service_address_postal_code.trim()) {
    errors.service_address_postal_code = 'Postal code is required'
    valid = false
  } else if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(form.service_address_postal_code.trim())) {
    errors.service_address_postal_code = 'Postal code must be in A1A 1A1 format'
    valid = false
  }

  // Mailing address (sync if same-as-service)
  if (sameAsService.value) {
    form.mailing_address_street = form.service_address_street
    form.mailing_address_city = form.service_address_city
    form.mailing_address_province = form.service_address_province
    form.mailing_address_postal_code = form.service_address_postal_code
  } else {
    if (!form.mailing_address_street.trim()) {
      errors.mailing_address_street = 'Street address is required'
      valid = false
    }
    if (!form.mailing_address_city.trim()) {
      errors.mailing_address_city = 'City is required'
      valid = false
    }
    if (!form.mailing_address_postal_code.trim()) {
      errors.mailing_address_postal_code = 'Postal code is required'
      valid = false
    } else if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(form.mailing_address_postal_code.trim())) {
      errors.mailing_address_postal_code = 'Postal code must be in A1A 1A1 format'
      valid = false
    }
  }

  // Primary contact
  if (!form.primary_contact_name.trim()) {
    errors.primary_contact_name = 'Contact name is required'
    valid = false
  }
  if (!form.primary_contact_email.trim()) {
    errors.primary_contact_email = 'Contact email is required'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primary_contact_email.trim())) {
    errors.primary_contact_email = 'Enter a valid email address'
    valid = false
  }
  if (!form.primary_contact_phone.trim()) {
    errors.primary_contact_phone = 'Contact phone is required'
    valid = false
  } else if (!/^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(form.primary_contact_phone.trim())) {
    errors.primary_contact_phone = 'Phone number must be in North American format (e.g., (780) 555-0123)'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  submitError.value = ''

  if (!validateForm()) return

  try {
    submitting.value = true
    const result = await registerOrganization({
      legal_name: form.legal_name.trim(),
      organization_type: form.organization_type,
      society_registration_number: form.society_registration_number.trim() || undefined,
      registration_date: form.registration_date || undefined,
      service_address_street: form.service_address_street.trim(),
      service_address_city: form.service_address_city.trim(),
      service_address_province: form.service_address_province,
      service_address_postal_code: form.service_address_postal_code.trim(),
      mailing_address_street: form.mailing_address_street.trim(),
      mailing_address_city: form.mailing_address_city.trim(),
      mailing_address_province: form.mailing_address_province,
      mailing_address_postal_code: form.mailing_address_postal_code.trim(),
      primary_contact_name: form.primary_contact_name.trim(),
      primary_contact_email: form.primary_contact_email.trim(),
      primary_contact_phone: form.primary_contact_phone.trim()
    })
    successMessage.value = result.message
    registered.value = true
  } catch (err: any) {
    if (err.response?.status === 400 && err.response?.data?.error?.fields) {
      // Server-side field validation errors
      const fields = err.response.data.error.fields
      for (const [field, message] of Object.entries(fields)) {
        errors[field] = message as string
      }
    } else if (err.response?.status === 409) {
      alreadyRegistered.value = true
    } else {
      submitError.value = 'Failed to register your organization. Please try again or contact CFS for assistance.'
    }
    console.error('Organization registration failed:', err)
  } finally {
    submitting.value = false
  }
}

function goToProfile() {
  router.push('/profile')
}
</script>

<style scoped>
.register-org-view {
  max-width: 800px;
}

.page-title {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-s) 0;
  padding-bottom: var(--goa-space-s);
  border-bottom: 2px solid var(--goa-color-interactive-default);
}

.page-subtitle {
  color: var(--goa-color-greyscale-700);
  font-size: var(--goa-font-size-4);
  margin: 0;
}

.section-title {
  font-size: var(--goa-font-size-5);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-l) 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--goa-space-m);
  padding: var(--goa-space-2xl) 0;
  color: var(--goa-color-greyscale-700);
}
</style>
