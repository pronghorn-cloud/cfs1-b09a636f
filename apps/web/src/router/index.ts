import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'

const APP_TITLE = "Women's Shelter Funding"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: {
        title: `Program Overview - ${APP_TITLE}`
      }
    },
    {
      path: '/funded-shelters',
      name: 'funded-shelters',
      component: () => import('../views/FundedSheltersView.vue'),
      meta: {
        title: `Funded Shelters - ${APP_TITLE}`
      }
    },
    {
      path: '/funding-types',
      name: 'funding-types',
      component: () => import('../views/FundingTypesView.vue'),
      meta: {
        title: `Funding Types - ${APP_TITLE}`
      }
    },
    {
      path: '/faq',
      name: 'faq',
      component: () => import('../views/FaqsView.vue'),
      meta: {
        title: `FAQs - ${APP_TITLE}`
      }
    },
    {
      path: '/contact',
      name: 'contact',
      component: () => import('../views/ContactView.vue'),
      meta: {
        title: `Contact - ${APP_TITLE}`
      }
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: {
        title: `Sign In - ${APP_TITLE}`,
        guestOnly: true
      }
    },
    {
      path: '/register-organization',
      name: 'register-organization',
      component: () => import('../views/RegisterOrganizationView.vue'),
      meta: {
        title: `Register Organization - ${APP_TITLE}`,
        requiresAuth: true
      }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: {
        title: `Profile - ${APP_TITLE}`,
        requiresAuth: true
      }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: {
        title: `Application Dashboard - ${APP_TITLE}`,
        requiresAuth: true
      }
    },
    {
      path: '/applications/:id/type',
      name: 'application-type',
      component: () => import('../views/ApplicationTypeView.vue'),
      meta: {
        title: `Select Application Type - ${APP_TITLE}`,
        requiresAuth: true
      }
    },
    {
      path: '/applications/:id',
      name: 'application-detail',
      component: () => import('../views/ApplicationDetailView.vue'),
      meta: {
        title: `Application - ${APP_TITLE}`,
        requiresAuth: true
      }
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('../views/AdminDashboardView.vue'),
      meta: {
        title: `Admin Dashboard - ${APP_TITLE}`,
        requiresAuth: true,
        requiresAdmin: true
      }
    },
    {
      path: '/admin/applications/:id',
      name: 'admin-application-detail',
      component: () => import('../views/AdminApplicationDetailView.vue'),
      meta: {
        title: `Review Application - ${APP_TITLE}`,
        requiresAuth: true,
        requiresAdmin: true
      }
    },
    {
      path: '/admin/data-dashboard',
      name: 'admin-data-dashboard',
      component: () => import('../views/AdminDataDashboardView.vue'),
      meta: {
        title: `Data Dashboard - ${APP_TITLE}`,
        requiresAuth: true,
        requiresAdmin: true
      }
    },
    {
      path: '/admin/funded-shelters',
      name: 'admin-funded-shelters',
      component: () => import('../views/AdminFundedSheltersView.vue'),
      meta: {
        title: `Manage Funded Shelters - ${APP_TITLE}`,
        requiresAuth: true,
        requiresAdmin: true
      }
    },
    {
      path: '/admin/reports',
      name: 'admin-reports',
      component: () => import('../views/AdminReportsView.vue'),
      meta: {
        title: `Cost Pressure Report - ${APP_TITLE}`,
        requiresAuth: true,
        requiresAdmin: true
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/'
    }
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guard for authentication
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Fetch user if not already loaded
  if (!authStore.user && !authStore.loading) {
    await authStore.fetchUser()
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({
      name: 'login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // Check if route requires admin role
  if (to.meta.requiresAdmin && !authStore.hasRole('cfs_admin')) {
    next({ name: 'home' })
    return
  }

  // Check if route is guest-only (redirect authenticated users)
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    next({ name: 'profile' })
    return
  }

  next()
})

// Update document title on route change
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  if (title) {
    document.title = title
  }
})

export default router
