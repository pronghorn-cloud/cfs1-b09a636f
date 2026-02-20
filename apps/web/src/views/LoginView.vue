<template>
  <div class="login-view">
    <div class="form-content">
      <h1 class="page-title">Sign In</h1>
      <p class="subtitle">Women's Shelter Funding Portal</p>

      <goa-spacer vspacing="l"></goa-spacer>

      <goa-callout type="information" heading="MyAlberta.ca Account Required">
        <p>To apply for funding or manage your organization's applications, you must sign in with a verified <strong>MyAlberta.ca organizational account</strong>.</p>
        <p>If your organization does not yet have a MyAlberta.ca account, visit <a href="https://account.alberta.ca" target="_blank" rel="noopener noreferrer">account.alberta.ca</a> to register.</p>
      </goa-callout>

      <goa-spacer vspacing="l"></goa-spacer>

      <div class="auth-buttons">
        <GoabButton type="primary" size="compact" @click="handleMyAlbertaLogin">
          Sign in with MyAlberta.ca
        </GoabButton>
      </div>

      <goa-spacer vspacing="xl"></goa-spacer>

      <!-- Development mock user selector -->
      <goa-details heading="Development Mode — Test Accounts">
        <p>Select a mock user to simulate authentication:</p>
        <div class="mock-users">
          <div class="mock-user-card" @click="handleMockLogin(0)">
            <strong>Jane Doe</strong>
            <span class="mock-role">Shelter Applicant (Returning)</span>
            <span class="mock-detail">Safe Haven Women's Shelter</span>
          </div>
          <div class="mock-user-card" @click="handleMockLogin(1)">
            <strong>Maria Chen</strong>
            <span class="mock-role">Shelter Applicant (New)</span>
            <span class="mock-detail">New Start Shelter Society</span>
          </div>
          <div class="mock-user-card" @click="handleMockLogin(2)">
            <strong>Sarah Thompson</strong>
            <span class="mock-role">CFS Admin</span>
            <span class="mock-detail">Children and Family Services</span>
          </div>
        </div>
      </goa-details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { GoabButton } from '../components/goa'

const authStore = useAuthStore()
const router = useRouter()

/**
 * Perform mock login and navigate to profile on success.
 * Uses fetch-based POST (no redirect chain through Vite proxy).
 */
async function doLogin(userIndex: number) {
  try {
    await authStore.login(userIndex)
    if (authStore.isAuthenticated) {
      router.push('/profile')
    }
  } catch {
    // error already set in store
  }
}

/**
 * MyAlberta.ca Login
 * In production: redirects to MyAlberta.ca OAuth 2.0 PKCE flow
 * In mock mode: logs in as the first mock user (returning applicant)
 */
function handleMyAlbertaLogin() {
  doLogin(0)
}

/**
 * Mock Login — select a specific test user by index
 */
function handleMockLogin(userIndex: number) {
  doLogin(userIndex)
}
</script>

<style scoped>
.login-view {
  display: flex;
  justify-content: center;
  padding: var(--goa-space-xl) var(--goa-space-m);
}

.form-content {
  max-width: 540px;
  width: 100%;
}

.page-title {
  font-size: var(--goa-font-size-7);
  font-weight: 700;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-xs) 0;
  text-align: center;
}

.subtitle {
  color: var(--goa-color-greyscale-700);
  font-size: var(--goa-font-size-5);
  margin: 0;
  text-align: center;
}

.auth-buttons {
  display: flex;
  justify-content: center;
}

.mock-users {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-s);
  margin-top: var(--goa-space-m);
}

.mock-user-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--goa-space-m);
  border: 1px solid var(--goa-color-greyscale-200);
  border-radius: var(--goa-border-radius-m);
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.mock-user-card:hover {
  border-color: var(--goa-color-interactive-default);
  background-color: var(--goa-color-greyscale-100);
}

.mock-role {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-interactive-default);
  font-weight: 600;
}

.mock-detail {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-greyscale-700);
}
</style>
