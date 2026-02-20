<template>
  <div class="home-view">
    <!-- Hero Banner -->
    <goa-hero-banner
      heading="Women's Shelter Funding Program"
    >
      <p>
        The Government of Alberta, through Children and Family Services, provides
        funding to support women's shelters and second-stage shelters across the province.
        This portal allows eligible organizations to apply for base renewal funding
        or new and expanded shelter services.
      </p>
    </goa-hero-banner>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Program Purpose -->
    <section>
      <h2 class="section-title">Program Purpose</h2>
      <goa-container accent="thin">
        <p>
          The Women's Shelter Funding Program supports organizations that provide safe shelter,
          crisis intervention, and support services to women and children fleeing domestic violence
          and abuse in Alberta.
        </p>
        <p>
          Funding is provided to eligible non-profit organizations to operate emergency shelters
          and second-stage housing that serve women and their dependent children who are experiencing
          family violence.
        </p>
        <p>
          The program is administered by the Community and Social Services division within
          Children and Family Services (CFS), Government of Alberta.
        </p>
      </goa-container>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Eligibility Criteria -->
    <section>
      <h2 class="section-title">Eligibility Criteria</h2>
      <goa-callout type="information" heading="Who Can Apply">
        <p>To be eligible for funding, your organization must meet all of the following criteria:</p>
      </goa-callout>
      <goa-spacer vspacing="m"></goa-spacer>
      <goa-grid gap="l" minchildwidth="280px">
        <goa-container accent="thin" type="non-interactive">
          <div class="criteria-card">
            <goa-icon type="checkmark-circle" size="large"></goa-icon>
            <h3>Organization Type</h3>
            <p>
              Registered as a non-profit society under the Alberta Societies Act,
              a registered charity, or a recognized Indigenous organization.
            </p>
          </div>
        </goa-container>

        <goa-container accent="thin" type="non-interactive">
          <div class="criteria-card">
            <goa-icon type="checkmark-circle" size="large"></goa-icon>
            <h3>Location</h3>
            <p>
              Operating or proposing to operate within the province of Alberta,
              serving an identified community need.
            </p>
          </div>
        </goa-container>

        <goa-container accent="thin" type="non-interactive">
          <div class="criteria-card">
            <goa-icon type="checkmark-circle" size="large"></goa-icon>
            <h3>Service Focus</h3>
            <p>
              Providing or proposing to provide emergency shelter or second-stage
              housing for women and children fleeing domestic violence.
            </p>
          </div>
        </goa-container>

        <goa-container accent="thin" type="non-interactive">
          <div class="criteria-card">
            <goa-icon type="checkmark-circle" size="large"></goa-icon>
            <h3>Compliance</h3>
            <p>
              In good standing with Workers' Compensation Board (WCB) coverage
              and all applicable provincial and federal regulations.
            </p>
          </div>
        </goa-container>
      </goa-grid>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Funding Types -->
    <section>
      <h2 class="section-title">Funding Types</h2>
      <goa-grid gap="l" minchildwidth="300px">
        <goa-container accent="thick" type="interactive">
          <h3>Part A — Base Renewal</h3>
          <p>
            Annual renewal funding for organizations currently receiving
            Government of Alberta shelter funding. This covers ongoing operational
            costs for existing shelter services.
          </p>
          <ul>
            <li>Existing funded shelters</li>
            <li>Annual operational budget</li>
            <li>Staffing and program costs</li>
            <li>Facility maintenance</li>
          </ul>
        </goa-container>

        <goa-container accent="thick" type="interactive">
          <h3>Part B — New or Expansion</h3>
          <p>
            Funding for new shelter services or expansion of existing shelter
            capacity to address unmet community needs.
          </p>
          <ul>
            <li>New shelter establishment</li>
            <li>Bed/unit capacity expansion</li>
            <li>New service area coverage</li>
            <li>Community need justification required</li>
          </ul>
        </goa-container>
      </goa-grid>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Guiding Principles -->
    <section>
      <h2 class="section-title">Guiding Principles</h2>
      <goa-container>
        <goa-grid gap="m" minchildwidth="250px">
          <div class="principle">
            <goa-icon type="people" size="large"></goa-icon>
            <h3>Client-Centred</h3>
            <p>Services focus on the safety, wellbeing, and empowerment of women and children.</p>
          </div>

          <div class="principle">
            <goa-icon type="globe" size="large"></goa-icon>
            <h3>Culturally Responsive</h3>
            <p>Programming respects and responds to the cultural needs of diverse populations.</p>
          </div>

          <div class="principle">
            <goa-icon type="shield-checkmark" size="large"></goa-icon>
            <h3>Trauma-Informed</h3>
            <p>Approaches recognize the impact of trauma and promote healing and recovery.</p>
          </div>

          <div class="principle">
            <goa-icon type="analytics" size="large"></goa-icon>
            <h3>Evidence-Based</h3>
            <p>Funding decisions are informed by community need data and outcome measurement.</p>
          </div>

          <div class="principle">
            <goa-icon type="document-text" size="large"></goa-icon>
            <h3>Accountability</h3>
            <p>Transparent stewardship of public funds with clear reporting requirements.</p>
          </div>

          <div class="principle">
            <goa-icon type="git-network" size="large"></goa-icon>
            <h3>Collaboration</h3>
            <p>Partnerships between government, shelters, and communities strengthen service delivery.</p>
          </div>
        </goa-grid>
      </goa-container>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- How to Apply -->
    <section>
      <h2 class="section-title">How to Apply</h2>
      <goa-container accent="thin">
        <div class="steps-list">
          <div class="step">
            <goa-badge type="information" content="1"></goa-badge>
            <div class="step-content">
              <h3>Create an Account</h3>
              <p>Sign in using your MyAlberta Digital ID. If you don't have one, you can register at <strong>account.alberta.ca</strong>.</p>
            </div>
          </div>

          <goa-divider mt="m" mb="m"></goa-divider>

          <div class="step">
            <goa-badge type="information" content="2"></goa-badge>
            <div class="step-content">
              <h3>Register Your Organization</h3>
              <p>Complete your organization profile with legal name, registration details, contact information, and service address.</p>
            </div>
          </div>

          <goa-divider mt="m" mb="m"></goa-divider>

          <div class="step">
            <goa-badge type="information" content="3"></goa-badge>
            <div class="step-content">
              <h3>Complete Your Application</h3>
              <p>Select your funding type (Part A or Part B), fill in program details, submit your budget, and upload required documents.</p>
            </div>
          </div>

          <goa-divider mt="m" mb="m"></goa-divider>

          <div class="step">
            <goa-badge type="information" content="4"></goa-badge>
            <div class="step-content">
              <h3>Submit and Track</h3>
              <p>Review and submit your application. You can track the status of your application through your portal dashboard.</p>
            </div>
          </div>
        </div>
      </goa-container>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Data Portal Link (UC-06) -->
    <section>
      <goa-callout type="information" heading="Women's Shelter Data Portal">
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
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Call to Action -->
    <section class="cta-section">
      <goa-callout type="important" heading="Ready to Apply?">
        <p>
          If your organization meets the eligibility criteria above, you can begin your
          application by signing in with your MyAlberta Digital ID.
        </p>
        <goa-spacer vspacing="m"></goa-spacer>
        <goa-button-group alignment="start">
          <GoabButton type="start" @click="handleApplyNow">
            Apply Now
          </GoabButton>
        </goa-button-group>
      </goa-callout>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { GoabButton } from '../components/goa'

const router = useRouter()

function handleApplyNow() {
  router.push('/login')
}
</script>

<style scoped>
.home-view {
  max-width: 100%;
}

.section-title {
  font-size: var(--goa-font-size-6);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin-bottom: var(--goa-space-l);
}

/* Eligibility criteria cards */
.criteria-card {
  padding: var(--goa-space-s);
}

.criteria-card goa-icon {
  color: var(--goa-color-interactive-default);
  margin-bottom: var(--goa-space-s);
}

.criteria-card h3 {
  margin: 0 0 var(--goa-space-xs) 0;
  font-size: var(--goa-font-size-4);
  color: var(--goa-color-greyscale-black);
}

.criteria-card p {
  margin: 0;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-3);
}

/* Funding types */
.home-view h3 {
  margin: 0 0 var(--goa-space-s) 0;
  font-size: var(--goa-font-size-5);
  color: var(--goa-color-greyscale-black);
}

.home-view ul {
  margin: var(--goa-space-s) 0 0 0;
  padding-left: var(--goa-space-l);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-4);
}

.home-view ul li {
  margin-bottom: var(--goa-space-2xs);
}

/* Guiding principles */
.principle {
  text-align: center;
  padding: var(--goa-space-m);
}

.principle goa-icon {
  color: var(--goa-color-interactive-default);
  margin-bottom: var(--goa-space-s);
}

.principle h3 {
  margin: 0 0 var(--goa-space-xs) 0;
  font-size: var(--goa-font-size-4);
  text-align: center;
}

.principle p {
  margin: 0;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-3);
  text-align: center;
}

/* How to apply steps */
.steps-list {
  padding: var(--goa-space-s) 0;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: var(--goa-space-m);
}

.step goa-badge {
  flex-shrink: 0;
  margin-top: var(--goa-space-3xs);
}

.step-content h3 {
  margin: 0 0 var(--goa-space-2xs) 0;
  font-size: var(--goa-font-size-4);
}

.step-content p {
  margin: 0;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-3);
}

/* Data Portal link */
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
@media (max-width: 640px) {
  .section-title {
    font-size: var(--goa-font-size-5);
  }

  .principle {
    padding: var(--goa-space-s);
  }
}
</style>
