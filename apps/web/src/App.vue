<template>
  <AppLayout
    service-name="Women's Shelter Funding"
    :user="user"
    :navigation-items="navigationItems"
  >
    <router-view />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from './stores/auth.store'
import AppLayout from './components/layout/AppLayout.vue'

/**
 * App - Root application component
 *
 * Provides:
 * - Main layout structure via AppLayout
 * - User authentication state
 * - Navigation configuration
 *
 * Health status indicator has been removed per GoA design system compliance.
 */

const authStore = useAuthStore()

// Get user from auth store
const user = computed(() => authStore.user)

const navigationItems = computed(() => {
  const items = [
    { path: '/', label: 'Program Overview' },
    { path: '/funded-shelters', label: 'Funded Shelters' },
    { path: '/funding-types', label: 'Funding Types' },
    { path: '/faq', label: 'FAQs' },
    { path: '/contact', label: 'Contact' }
  ]

  if (authStore.hasRole('cfs_admin')) {
    items.push({ path: '/admin', label: 'Admin' })
    items.push({ path: '/admin/data-dashboard', label: 'Dashboard' })
    items.push({ path: '/admin/funded-shelters', label: 'Shelters' })
    items.push({ path: '/admin/reports', label: 'Reports' })
  }

  return items
})

onMounted(async () => {
  // Fetch current user from API
  await authStore.fetchUser()
})
</script>
