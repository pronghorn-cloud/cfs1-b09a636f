<template>
  <div class="funding-types-view">
    <!-- Hero Banner -->
    <goa-hero-banner heading="Funding Types">
      <p>
        The Women's Shelter Funding Program provides two types of operational funding
        to support shelter services across Alberta. Review the details below to determine
        which funding type applies to your organization.
      </p>
    </goa-hero-banner>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Funding Overview -->
    <section>
      <h2 class="section-title">Phase 1 — Operational Funding</h2>
      <goa-container accent="thin">
        <p>
          Phase 1 of the Women's Shelter Funding Program focuses on <strong>operational funding</strong>
          to support the day-to-day delivery of shelter services. Two funding streams are available
          depending on whether your organization currently receives Government of Alberta shelter funding.
        </p>
      </goa-container>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Part A -->
    <section>
      <h2 class="section-title">Part A — Operational Base Funding</h2>
      <goa-callout type="information" heading="For Currently Funded Organizations">
        <p>
          Part A is the annual base renewal stream for organizations that already receive
          Government of Alberta funding to operate women's shelters or second-stage shelters.
        </p>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-container accent="thick" type="non-interactive">
        <h3>Purpose</h3>
        <p>
          Part A provides continued operational funding to maintain existing shelter services.
          This stream supports the ongoing costs of running an emergency women's shelter or
          second-stage shelter that is already part of the Government of Alberta's funded shelter network.
        </p>

        <goa-spacer vspacing="m"></goa-spacer>

        <h3>What It Covers</h3>
        <goa-grid gap="m" minchildwidth="250px">
          <div class="coverage-item">
            <goa-icon type="people" size="large"></goa-icon>
            <h4>Staffing</h4>
            <p>Salaries, wages, and benefits for shelter staff including front-line workers, counsellors, and administrative personnel.</p>
          </div>

          <div class="coverage-item">
            <goa-icon type="document-text" size="large"></goa-icon>
            <h4>Program Delivery</h4>
            <p>Client support services, crisis intervention programs, children's programming, and outreach activities.</p>
          </div>

          <div class="coverage-item">
            <goa-icon type="home" size="large"></goa-icon>
            <h4>Facility Operations</h4>
            <p>Utilities, insurance, routine maintenance, supplies, and other costs to maintain safe shelter operations.</p>
          </div>

          <div class="coverage-item">
            <goa-icon type="settings" size="large"></goa-icon>
            <h4>Administration</h4>
            <p>Organizational management, financial administration, reporting, and governance activities.</p>
          </div>
        </goa-grid>

        <goa-spacer vspacing="m"></goa-spacer>

        <h3>Eligibility</h3>
        <ul>
          <li>Currently receiving Government of Alberta shelter funding</li>
          <li>Operating an active women's shelter or second-stage shelter in Alberta</li>
          <li>In good standing with all reporting and compliance requirements</li>
          <li>Registered non-profit, charity, or recognized Indigenous organization</li>
        </ul>

        <goa-spacer vspacing="m"></goa-spacer>

        <h3>Application Cycle</h3>
        <p>
          Part A applications follow an <strong>annual renewal cycle</strong>. Currently funded organizations
          will be notified when the renewal application period opens. Applications must be submitted by
          the posted deadline to maintain uninterrupted funding.
        </p>
      </goa-container>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Part B -->
    <section>
      <h2 class="section-title">Part B — Operational Expansion Funding</h2>
      <goa-callout type="information" heading="For New or Expanding Services">
        <p>
          Part B supports new shelter establishment or expansion of existing shelter capacity
          to address unmet community needs across Alberta.
        </p>
      </goa-callout>

      <goa-spacer vspacing="m"></goa-spacer>

      <goa-container accent="thick" type="non-interactive">
        <h3>Purpose</h3>
        <p>
          Part B provides operational funding for organizations seeking to establish a new women's
          shelter or second-stage shelter, or to expand the capacity of an existing funded shelter.
          This stream addresses gaps in shelter coverage and responds to identified community needs.
        </p>

        <goa-spacer vspacing="m"></goa-spacer>

        <h3>What It Covers</h3>
        <goa-grid gap="m" minchildwidth="250px">
          <div class="coverage-item">
            <goa-icon type="add-circle" size="large"></goa-icon>
            <h4>New Shelter Establishment</h4>
            <p>Operational costs for establishing a new women's shelter or second-stage shelter in an underserved area.</p>
          </div>

          <div class="coverage-item">
            <goa-icon type="arrow-up-circle" size="large"></goa-icon>
            <h4>Capacity Expansion</h4>
            <p>Additional beds, units, or service capacity at an existing funded shelter to meet growing demand.</p>
          </div>

          <div class="coverage-item">
            <goa-icon type="map" size="large"></goa-icon>
            <h4>New Service Areas</h4>
            <p>Extension of shelter services into geographic areas currently lacking coverage.</p>
          </div>

          <div class="coverage-item">
            <goa-icon type="people" size="large"></goa-icon>
            <h4>Enhanced Programming</h4>
            <p>New or expanded client support programs to serve additional populations or address emerging needs.</p>
          </div>
        </goa-grid>

        <goa-spacer vspacing="m"></goa-spacer>

        <h3>Eligibility</h3>
        <ul>
          <li>Registered non-profit, charity, or recognized Indigenous organization</li>
          <li>Demonstrated community need for new or expanded shelter services</li>
          <li>Operating or proposing to operate within Alberta</li>
          <li>Capacity to deliver shelter services that meet provincial standards</li>
          <li>Community need justification supported by data and stakeholder input</li>
        </ul>

        <goa-spacer vspacing="m"></goa-spacer>

        <h3>Application Requirements</h3>
        <p>
          Part B applications require additional documentation beyond the standard application form,
          including a <strong>community needs assessment</strong>, proposed service delivery model,
          and detailed operational budget for the new or expanded services.
        </p>
      </goa-container>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Out of Scope Notice -->
    <section>
      <goa-callout type="important" heading="Capital Funding">
        <p>
          Capital, maintenance, and renovation funding are <strong>not available</strong> through
          this portal at this time. This portal supports operational funding requests only.
          For inquiries about capital funding, please contact Children and Family Services directly.
        </p>
      </goa-callout>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Comparison Table -->
    <section>
      <h2 class="section-title">At a Glance</h2>
      <table class="comparison-table" width="100%">
        <thead>
          <tr>
            <th></th>
            <th>Part A — Base Renewal</th>
            <th>Part B — New/Expansion</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Target Applicant</strong></td>
            <td>Currently funded organizations</td>
            <td>New or expanding organizations</td>
          </tr>
          <tr>
            <td><strong>Funding Purpose</strong></td>
            <td>Ongoing operational costs</td>
            <td>New or expanded shelter services</td>
          </tr>
          <tr>
            <td><strong>Application Cycle</strong></td>
            <td>Annual renewal</td>
            <td>Open intake period</td>
          </tr>
          <tr>
            <td><strong>Needs Assessment</strong></td>
            <td>Not required</td>
            <td>Required</td>
          </tr>
          <tr>
            <td><strong>Service Types</strong></td>
            <td>Women's Shelter, Second-Stage</td>
            <td>Women's Shelter, Second-Stage</td>
          </tr>
        </tbody>
      </table>
    </section>

    <goa-spacer vspacing="xl"></goa-spacer>

    <!-- Call to Action -->
    <section>
      <goa-callout type="important" heading="Ready to Apply?">
        <p>
          If your organization is eligible for Part A or Part B funding, you can begin your
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
.funding-types-view {
  max-width: 100%;
}

.section-title {
  font-size: var(--goa-font-size-6);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin-bottom: var(--goa-space-l);
}

/* Coverage items grid */
.coverage-item {
  text-align: center;
  padding: var(--goa-space-m);
}

.coverage-item goa-icon {
  color: var(--goa-color-interactive-default);
  margin-bottom: var(--goa-space-s);
}

.coverage-item h4 {
  margin: 0 0 var(--goa-space-xs) 0;
  font-size: var(--goa-font-size-4);
  color: var(--goa-color-greyscale-black);
}

.coverage-item p {
  margin: 0;
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-3);
}

/* Content within containers */
.funding-types-view h3 {
  margin: 0 0 var(--goa-space-s) 0;
  font-size: var(--goa-font-size-5);
  color: var(--goa-color-greyscale-black);
}

.funding-types-view ul {
  margin: var(--goa-space-s) 0 0 0;
  padding-left: var(--goa-space-l);
  color: var(--goa-color-greyscale-700);
  line-height: var(--goa-line-height-4);
}

.funding-types-view ul li {
  margin-bottom: var(--goa-space-2xs);
}

/* Responsive */
@media (max-width: 640px) {
  .section-title {
    font-size: var(--goa-font-size-5);
  }

  .coverage-item {
    padding: var(--goa-space-s);
  }
}
</style>

<style>
/* Comparison table styling */
.funding-types-view .comparison-table {
  width: 100%;
  border-collapse: collapse;
}

.funding-types-view .comparison-table th,
.funding-types-view .comparison-table td {
  vertical-align: middle;
  padding: 12px 16px;
  border: 1px solid #ddd;
  text-align: left;
}

.funding-types-view .comparison-table th {
  background-color: #f1f1f1;
  font-weight: 700;
}
</style>
