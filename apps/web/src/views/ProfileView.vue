<template>
  <div class="profile-view">
    <h1 class="page-title">My Account</h1>

    <goa-callout v-if="!user" type="important" heading="Not Authenticated">
      <p>You are not currently signed in. Please <router-link to="/login">sign in with MyAlberta.ca</router-link> to access your account.</p>
    </goa-callout>

    <template v-else>
      <!-- Loading org check -->
      <div v-if="loadingOrg" class="loading-container">
        <goa-spinner size="large"></goa-spinner>
      </div>

      <template v-else>
        <!-- No organization registered — prompt to register -->
        <goa-callout v-if="!organization && isApplicant" type="important" heading="Organization Registration Required">
          <p>
            Your MyAlberta.ca account is not yet linked to an organization profile.
            You must register your organization before you can apply for funding.
          </p>
          <goa-spacer vspacing="m"></goa-spacer>
          <GoabButton type="primary" size="compact" @click="router.push('/register-organization')">
            Register Your Organization
          </GoabButton>
        </goa-callout>

        <!-- Organization registered — show org info + link to dashboard -->
        <goa-callout v-else-if="organization" type="success" heading="Organization Registered">
          <p>Your organization <strong>{{ organization.legal_name }}</strong> is registered with the portal.</p>
          <goa-spacer vspacing="m"></goa-spacer>
          <GoabButton type="primary" size="compact" @click="router.push('/dashboard')">
            Go to Application Dashboard
          </GoabButton>
        </goa-callout>

        <!-- Admin users — no org needed -->
        <goa-callout v-else type="success" heading="Signed In">
          <p>You are signed in via MyAlberta.ca.</p>
        </goa-callout>

        <goa-spacer vspacing="l"></goa-spacer>

        <!-- Account Info -->
        <goa-container accent="thin">
          <h2 class="section-title">Account Information</h2>

          <dl class="info-list">
            <div class="info-row">
              <dt>Full Name</dt>
              <dd>{{ user.name }}</dd>
            </div>

            <div class="info-row">
              <dt>Email Address</dt>
              <dd>{{ user.email }}</dd>
            </div>

            <div class="info-row">
              <dt>Role</dt>
              <dd class="roles">
                <goa-badge
                  v-for="role in user.roles"
                  :key="role"
                  :type="role === 'cfs_admin' ? 'important' : 'information'"
                  :content="formatRole(role)"
                />
              </dd>
            </div>
          </dl>
        </goa-container>

        <!-- Organization Profile (if registered) -->
        <template v-if="organization">
          <goa-spacer vspacing="l"></goa-spacer>

          <goa-container accent="thin">
            <h2 class="section-title">Organization Profile</h2>

            <dl class="info-list">
              <div class="info-row">
                <dt>Legal Name</dt>
                <dd>{{ organization.legal_name }}</dd>
              </div>

              <div class="info-row">
                <dt>Type</dt>
                <dd>{{ organization.organization_type }}</dd>
              </div>

              <div class="info-row" v-if="organization.society_registration_number">
                <dt>Registration #</dt>
                <dd>{{ organization.society_registration_number }}</dd>
              </div>

              <div class="info-row">
                <dt>Service Address</dt>
                <dd>
                  {{ organization.service_address_street }}<br>
                  {{ organization.service_address_city }}, {{ organization.service_address_province }}
                  {{ organization.service_address_postal_code }}
                </dd>
              </div>

              <div class="info-row">
                <dt>Primary Contact</dt>
                <dd>
                  {{ organization.primary_contact_name }}<br>
                  {{ organization.primary_contact_email }}<br>
                  {{ organization.primary_contact_phone }}
                </dd>
              </div>
            </dl>
          </goa-container>
        </template>

        <goa-spacer vspacing="l"></goa-spacer>

        <div class="actions">
          <GoabButton type="tertiary" @click="handleLogout">
            Sign Out
          </GoabButton>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { GoabButton } from '../components/goa'
import { fetchMyOrganization, type OrganizationProfile } from '../services/api.service'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)
const isApplicant = computed(() => user.value?.roles?.includes('applicant'))

const loadingOrg = ref(true)
const organization = ref<OrganizationProfile | null>(null)

function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    applicant: 'Shelter Applicant',
    cfs_admin: 'CFS Administrator',
  }
  return roleLabels[role] || role
}

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}

onMounted(async () => {
  if (!user.value) {
    await authStore.fetchUser()
  }

  // Check if user has an organization profile
  if (user.value) {
    try {
      organization.value = await fetchMyOrganization()
    } catch (err) {
      console.error('Failed to fetch organization:', err)
    }
  }
  loadingOrg.value = false
})
</script>

<style scoped>
.profile-view {
  max-width: 800px;
}

.page-title {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-l) 0;
  padding-bottom: var(--goa-space-s);
  border-bottom: 2px solid var(--goa-color-interactive-default);
}

.section-title {
  font-size: var(--goa-font-size-5);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-l) 0;
}

.info-list {
  margin: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--goa-space-m) 0;
  border-bottom: 1px solid var(--goa-color-greyscale-200);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row dt {
  font-weight: 600;
  color: var(--goa-color-greyscale-700);
  min-width: 160px;
}

.info-row dd {
  margin: 0;
  color: var(--goa-color-greyscale-black);
  text-align: right;
}

.roles {
  display: flex;
  gap: var(--goa-space-xs);
  flex-wrap: wrap;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: var(--goa-space-2xl) 0;
}
</style>
