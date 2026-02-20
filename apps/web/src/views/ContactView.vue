<template>
  <div class="contact-view">
    <!-- Hero Banner -->
    <goa-hero-banner heading="Contact Us">
      <p>
        Have questions about the Women's Shelter Funding Program? Get in touch with
        Children and Family Services using the contact information below or send us a message.
      </p>
    </goa-hero-banner>

    <goa-spacer vspacing="xl"></goa-spacer>

    <goa-grid gap="xl" minchildwidth="320px">
      <!-- Contact Information -->
      <div>
        <h2 class="section-title">Contact Information</h2>
        <goa-container accent="thin">
          <div class="contact-info">
            <div class="contact-item">
              <goa-icon type="mail" size="large"></goa-icon>
              <div>
                <h3>Email</h3>
                <a href="mailto:cfs.shelterfunding@gov.ab.ca" class="contact-link">
                  cfs.shelterfunding@gov.ab.ca
                </a>
              </div>
            </div>

            <goa-divider mt="m" mb="m"></goa-divider>

            <div class="contact-item">
              <goa-icon type="call" size="large"></goa-icon>
              <div>
                <h3>Phone</h3>
                <a href="tel:+17806443100" class="contact-link">
                  780-644-3100
                </a>
                <p class="contact-detail">Monday to Friday, 8:15 AM – 4:30 PM (MT)</p>
              </div>
            </div>

            <goa-divider mt="m" mb="m"></goa-divider>

            <div class="contact-item">
              <goa-icon type="location" size="large"></goa-icon>
              <div>
                <h3>Mailing Address</h3>
                <p class="contact-detail">
                  Children and Family Services<br>
                  Community and Social Services<br>
                  10th Floor, 44 Capital Boulevard<br>
                  10044 – 108 Street NW<br>
                  Edmonton, AB  T5J 5E6
                </p>
              </div>
            </div>
          </div>
        </goa-container>

        <goa-spacer vspacing="l"></goa-spacer>

        <goa-callout type="information" heading="Response Time">
          <p>CFS will respond to inquiries within <strong>5 business days</strong>.</p>
        </goa-callout>
      </div>

      <!-- Contact Form -->
      <div>
        <h2 class="section-title">Send a Message</h2>

        <!-- Success State -->
        <goa-callout v-if="submitted" type="success" heading="Message Sent">
          <p>{{ successMessage }}</p>
          <goa-spacer vspacing="m"></goa-spacer>
          <GoabButton type="tertiary" size="compact" @click="resetForm">
            Send another message
          </GoabButton>
        </goa-callout>

        <!-- Form -->
        <goa-container v-else accent="thin">
          <form @submit.prevent="handleSubmit" novalidate>
            <goa-form-item
              label="Your name"
              requirement="required"
              :error="errors.sender_name"
            >
              <goa-input
                name="sender_name"
                type="text"
                placeholder="Enter your full name"
                :value="form.sender_name"
                width="100%"
                :error="!!errors.sender_name"
                @_change="handleFieldChange('sender_name', $event)"
              ></goa-input>
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <goa-form-item
              label="Your email"
              requirement="required"
              :error="errors.sender_email"
            >
              <goa-input
                name="sender_email"
                type="email"
                placeholder="name@example.com"
                :value="form.sender_email"
                width="100%"
                :error="!!errors.sender_email"
                @_change="handleFieldChange('sender_email', $event)"
              ></goa-input>
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <goa-form-item
              label="Subject"
              requirement="required"
              :error="errors.subject"
            >
              <goa-input
                name="subject"
                type="text"
                placeholder="What is your inquiry about?"
                :value="form.subject"
                width="100%"
                :error="!!errors.subject"
                @_change="handleFieldChange('subject', $event)"
              ></goa-input>
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <goa-form-item
              label="Message"
              requirement="required"
              :error="errors.message"
            >
              <goa-textarea
                name="message"
                placeholder="Type your message here..."
                rows="6"
                :value="form.message"
                width="100%"
                countby="character"
                :maxcharcount="5000"
                :error="!!errors.message"
                @_change="handleFieldChange('message', $event)"
              ></goa-textarea>
            </goa-form-item>

            <goa-spacer vspacing="l"></goa-spacer>

            <!-- Submission Error -->
            <goa-callout v-if="submitError" type="emergency" heading="Unable to send message">
              <p>
                We were unable to send your message. Please try again or contact us directly at
                <a href="mailto:cfs.shelterfunding@gov.ab.ca">cfs.shelterfunding@gov.ab.ca</a>
                or <a href="tel:+17806443100">780-644-3100</a>.
              </p>
            </goa-callout>

            <goa-spacer v-if="submitError" vspacing="m"></goa-spacer>

            <goa-button-group alignment="start">
              <GoabButton type="primary" :disabled="submitting" @click="handleSubmit">
                {{ submitting ? 'Sending...' : 'Send Message' }}
              </GoabButton>
            </goa-button-group>
          </form>
        </goa-container>
      </div>
    </goa-grid>

    <goa-spacer vspacing="xl"></goa-spacer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { GoabButton } from '../components/goa'
import { submitContactForm } from '../services/api.service'

const form = reactive({
  sender_name: '',
  sender_email: '',
  subject: '',
  message: ''
})

const errors = reactive<Record<string, string>>({
  sender_name: '',
  sender_email: '',
  subject: '',
  message: ''
})

const submitting = ref(false)
const submitted = ref(false)
const submitError = ref(false)
const successMessage = ref('')

function handleFieldChange(field: string, event: Event) {
  const detail = (event as CustomEvent).detail
  const value = detail?.value ?? ''
  ;(form as any)[field] = value
  // Clear error on change
  if (errors[field]) {
    errors[field] = ''
  }
}

function validateForm(): boolean {
  let valid = true

  if (!form.sender_name.trim()) {
    errors.sender_name = 'Name is required'
    valid = false
  } else {
    errors.sender_name = ''
  }

  if (!form.sender_email.trim()) {
    errors.sender_email = 'Email is required'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.sender_email.trim())) {
    errors.sender_email = 'Enter a valid email address'
    valid = false
  } else {
    errors.sender_email = ''
  }

  if (!form.subject.trim()) {
    errors.subject = 'Subject is required'
    valid = false
  } else {
    errors.subject = ''
  }

  if (!form.message.trim()) {
    errors.message = 'Message is required'
    valid = false
  } else {
    errors.message = ''
  }

  return valid
}

async function handleSubmit() {
  submitError.value = false

  if (!validateForm()) {
    return
  }

  try {
    submitting.value = true
    const message = await submitContactForm({
      sender_name: form.sender_name.trim(),
      sender_email: form.sender_email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim()
    })
    successMessage.value = message
    submitted.value = true
  } catch (err: any) {
    // Check for server-side validation errors
    if (err.response?.status === 400 && err.response?.data?.error?.details) {
      const details = err.response.data.error.details
      for (const detail of details) {
        if (errors.hasOwnProperty(detail.field)) {
          errors[detail.field] = detail.message
        }
      }
    } else {
      submitError.value = true
    }
    console.error('Failed to submit contact form:', err)
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.sender_name = ''
  form.sender_email = ''
  form.subject = ''
  form.message = ''
  errors.sender_name = ''
  errors.sender_email = ''
  errors.subject = ''
  errors.message = ''
  submitted.value = false
  submitError.value = false
  successMessage.value = ''
}
</script>

<style scoped>
.contact-view {
  max-width: 100%;
}

.section-title {
  font-size: var(--goa-font-size-6);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin-bottom: var(--goa-space-l);
}

/* Contact info items */
.contact-item {
  display: flex;
  align-items: flex-start;
  gap: var(--goa-space-m);
}

.contact-item goa-icon {
  color: var(--goa-color-interactive-default);
  flex-shrink: 0;
  margin-top: var(--goa-space-3xs);
}

.contact-item h3 {
  margin: 0 0 var(--goa-space-2xs) 0;
  font-size: var(--goa-font-size-4);
  color: var(--goa-color-greyscale-black);
}

.contact-link {
  color: var(--goa-color-interactive-default);
  text-decoration: underline;
  font-size: var(--goa-font-size-4);
}

.contact-link:hover {
  color: var(--goa-color-interactive-hover);
}

.contact-detail {
  margin: var(--goa-space-2xs) 0 0 0;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-3);
}

/* Responsive */
@media (max-width: 640px) {
  .section-title {
    font-size: var(--goa-font-size-5);
  }
}
</style>
