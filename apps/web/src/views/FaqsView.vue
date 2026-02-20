<template>
  <div class="faqs-view">
    <!-- Hero Banner -->
    <goa-hero-banner heading="Frequently Asked Questions">
      <p>
        Find answers to common questions about the Women's Shelter Funding Program,
        eligibility, the application process, and more.
      </p>
    </goa-hero-banner>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
    </div>

    <!-- Error State -->
    <goa-callout v-else-if="error" type="emergency" heading="FAQs Unavailable">
      <p>FAQs are temporarily unavailable. Please contact CFS for questions.</p>
      <goa-spacer vspacing="s"></goa-spacer>
      <GoabButton type="secondary" size="compact" @click="loadFaqs">
        Try again
      </GoabButton>
    </goa-callout>

    <!-- FAQ Content -->
    <div v-else>
      <div v-for="group in groupedFaqs" :key="group.category" class="faq-category">
        <h2 class="category-title">{{ group.category }}</h2>
        <goa-accordion>
          <goa-details
            v-for="faq in group.faqs"
            :key="faq.id"
            :heading="faq.question"
          >
            <p>{{ faq.answer }}</p>
          </goa-details>
        </goa-accordion>
        <goa-spacer vspacing="l"></goa-spacer>
      </div>

      <!-- Contact CTA -->
      <goa-spacer vspacing="m"></goa-spacer>
      <goa-callout type="information" heading="Still have questions?">
        <p>
          If you can't find the answer you're looking for, please contact
          Children and Family Services for assistance.
        </p>
        <goa-spacer vspacing="m"></goa-spacer>
        <goa-button-group alignment="start">
          <GoabButton type="secondary" @click="handleContact">
            Contact Us
          </GoabButton>
        </goa-button-group>
      </goa-callout>
    </div>

    <goa-spacer vspacing="xl"></goa-spacer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GoabButton } from '../components/goa'
import { fetchFaqs, type Faq } from '../services/api.service'

const router = useRouter()
const faqs = ref<Faq[]>([])
const loading = ref(true)
const error = ref(false)

const groupedFaqs = computed(() => {
  const groups: Record<string, Faq[]> = {}
  for (const faq of faqs.value) {
    if (!groups[faq.category]) {
      groups[faq.category] = []
    }
    groups[faq.category].push(faq)
  }
  return Object.entries(groups).map(([category, items]) => ({
    category,
    faqs: items
  }))
})

async function loadFaqs() {
  try {
    loading.value = true
    error.value = false
    faqs.value = await fetchFaqs()
  } catch (err) {
    error.value = true
    console.error('Failed to load FAQs:', err)
  } finally {
    loading.value = false
  }
}

function handleContact() {
  router.push('/contact')
}

onMounted(loadFaqs)
</script>

<style scoped>
.faqs-view {
  max-width: 100%;
}

.category-title {
  font-size: var(--goa-font-size-5);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-m) 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: var(--goa-space-2xl) 0;
}

/* Responsive */
@media (max-width: 640px) {
  .category-title {
    font-size: var(--goa-font-size-4);
  }
}
</style>
