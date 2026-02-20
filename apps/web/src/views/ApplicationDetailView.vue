<template>
  <div class="detail-view">
    <!-- Header -->
    <div class="form-header">
      <div>
        <h1 class="page-title">{{ isPartB ? 'Part B &mdash; New/Expansion Funding' : 'Part A &mdash; Base Funding Renewal' }}</h1>
        <p class="page-subtitle" v-if="application">
          {{ application.reference_number }} &bull; {{ application.fiscal_year_code || 'N/A' }}
          <goa-badge type="information" :content="application.status_code" />
        </p>
      </div>
      <GoabButton type="tertiary" size="compact" @click="router.push('/dashboard')">
        Back to Dashboard
      </GoabButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-container">
      <goa-spinner size="large"></goa-spinner>
      <p>Loading application...</p>
    </div>

    <!-- Error -->
    <goa-callout v-else-if="loadError" type="emergency" heading="Error">
      <p>{{ loadError }}</p>
    </goa-callout>

    <!-- Form -->
    <template v-else-if="application">
      <!-- UC-18: Read-only status banner -->
      <goa-callout v-if="readOnly" type="information" heading="Read-Only View" mb="l">
        <p>This application was submitted on {{ application.submitted_at ? new Date(application.submitted_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' }} and cannot be edited.</p>
      </goa-callout>

      <!-- UC-14: Save status indicator + error banner -->
      <template v-if="!readOnly">
        <goa-callout v-if="saveError" type="emergency" heading="Save Failed" mb="l">
          <p>{{ saveError }}</p>
        </goa-callout>
        <div v-if="lastSavedAt" class="save-indicator">
          {{ lastSaveSource === 'auto' ? 'Auto-saved' : 'Draft saved' }} at {{ lastSavedAt }}
        </div>
      </template>

      <goa-spacer vspacing="l"></goa-spacer>

      <!-- Section 1: Organization Info (read-only) — shared -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">1. Organization Information</h2>
        <p class="section-hint">Pre-populated from your organization profile (read-only).</p>
        <template v-if="organization">
          <dl class="info-list">
            <div class="info-row">
              <dt>Organization</dt>
              <dd>{{ organization.legal_name }}</dd>
            </div>
            <div class="info-row">
              <dt>Type</dt>
              <dd>{{ organization.organization_type }}</dd>
            </div>
            <div class="info-row">
              <dt>Contact</dt>
              <dd>{{ organization.primary_contact_name }} &mdash; {{ organization.primary_contact_email }}</dd>
            </div>
          </dl>
        </template>
      </goa-container>

      <!-- Section 2: Program Type — shared -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">2. Program Type</h2>
        <template v-if="readOnly">
          <dl class="info-list">
            <div class="info-row">
              <dt>Shelter Program Type</dt>
              <dd>{{ form.program_name ? formatProgramName(form.program_name) : '—' }}</dd>
            </div>
          </dl>
        </template>
        <template v-else>
          <goa-form-item label="Shelter Program Type" :error="fieldErrors.program_name">
            <goa-dropdown
              name="program_name"
              :value="form.program_name || ''"
              @_change="handleFieldChange('program_name', $event)"
              width="100%"
            >
              <goa-dropdown-item value="WomensShelter" label="Women's Shelter"></goa-dropdown-item>
              <goa-dropdown-item value="SecondStageShelter" label="Second-Stage Shelter"></goa-dropdown-item>
            </goa-dropdown>
          </goa-form-item>
        </template>
      </goa-container>

      <!-- Section 3: Service Delivery Description — shared -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">3. Service Delivery Description</h2>
        <template v-if="readOnly">
          <p class="readonly-text">{{ form.service_description || '—' }}</p>
        </template>
        <template v-else>
          <goa-form-item
            label="Describe how your organization delivers services under CFS grant guidelines"
            :error="fieldErrors.service_description"
            helptext="100 to 5,000 characters required"
          >
            <goa-textarea
              name="service_description"
              :value="form.service_description || ''"
              @_change="handleFieldChange('service_description', $event)"
              width="100%"
              rows="6"
              :maxcharcount="5000"
            ></goa-textarea>
            <p class="char-count" v-if="form.service_description">
              {{ form.service_description.length }} / 5,000 characters
            </p>
          </goa-form-item>
        </template>
      </goa-container>

      <!-- ===== PART A ONLY: Current Capacity ===== -->
      <template v-if="!isPartB">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">4. Current Capacity</h2>
          <template v-if="readOnly">
            <dl class="info-list">
              <div class="info-row">
                <dt>Current Bed Count</dt>
                <dd>{{ form.current_bed_count ?? '—' }}</dd>
              </div>
              <div class="info-row">
                <dt>Current Unit Count</dt>
                <dd>{{ form.current_unit_count ?? '—' }}</dd>
              </div>
            </dl>
          </template>
          <template v-else>
            <div class="form-row">
              <goa-form-item label="Current Bed Count" :error="fieldErrors.current_bed_count" helptext="0 to 500">
                <GoabInput
                  v-model="form.current_bed_count"
                  type="number"
                  name="current_bed_count"
                  width="200px"
                />
              </goa-form-item>
              <goa-form-item label="Current Unit Count" :error="fieldErrors.current_unit_count" helptext="0 to 500">
                <GoabInput
                  v-model="form.current_unit_count"
                  type="number"
                  name="current_unit_count"
                  width="200px"
                />
              </goa-form-item>
            </div>
          </template>
        </goa-container>
      </template>

      <!-- ===== PART B ONLY: Community Need Justification ===== -->
      <template v-if="isPartB">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">4. Community Need Justification</h2>
          <template v-if="readOnly">
            <dl class="info-list">
              <div class="info-row">
                <dt>Geographic Area</dt>
                <dd>{{ form.proposed_location || '—' }}</dd>
              </div>
              <div class="info-row">
                <dt>Population Served</dt>
                <dd>{{ form.target_population || '—' }}</dd>
              </div>
              <div class="info-row" v-if="form.existing_resources_description">
                <dt>Existing Resources</dt>
                <dd>{{ form.existing_resources_description }}</dd>
              </div>
            </dl>
            <goa-spacer vspacing="m"></goa-spacer>
            <h3 class="subsection-label">Need Gap Description</h3>
            <p class="readonly-text">{{ form.community_need_justification || '—' }}</p>
            <dl class="info-list" v-if="form.dv_data_reference">
              <div class="info-row">
                <dt>DV Data Reference</dt>
                <dd>{{ form.dv_data_reference }}</dd>
              </div>
            </dl>
          </template>
          <template v-else>
            <p class="section-hint">Provide evidence of community need for the proposed shelter service.</p>

            <goa-form-item label="Geographic Area" :error="fieldErrors.proposed_location" helptext="City, town, or region the shelter will serve (max 200 characters)">
              <GoabInput
                v-model="form.proposed_location"
                type="text"
                name="proposed_location"
                placeholder="e.g., Edmonton Metropolitan Region"
                width="100%"
                :maxLength="200"
              />
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <goa-form-item label="Population Served" :error="fieldErrors.target_population" helptext="Describe the population and vulnerability profile (max 1,000 characters)">
              <goa-textarea
                name="target_population"
                :value="form.target_population || ''"
                @_change="handleFieldChange('target_population', $event)"
                width="100%"
                rows="3"
                :maxcharcount="1000"
              ></goa-textarea>
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <goa-form-item label="Existing Resources in Area" :error="fieldErrors.existing_resources_description" helptext="Describe existing shelter and support resources (max 2,000 characters)">
              <goa-textarea
                name="existing_resources_description"
                :value="form.existing_resources_description || ''"
                @_change="handleFieldChange('existing_resources_description', $event)"
                width="100%"
                rows="4"
                :maxcharcount="2000"
              ></goa-textarea>
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <goa-form-item label="Need Gap Description" :error="fieldErrors.community_need_justification" helptext="Describe the service gap with supporting evidence (100 to 3,000 characters required)">
              <goa-textarea
                name="community_need_justification"
                :value="form.community_need_justification || ''"
                @_change="handleFieldChange('community_need_justification', $event)"
                width="100%"
                rows="6"
                :maxcharcount="3000"
              ></goa-textarea>
              <p class="char-count" v-if="form.community_need_justification">
                {{ form.community_need_justification.length }} / 3,000 characters
              </p>
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <goa-form-item label="Domestic Violence Data Reference (Optional)" :error="fieldErrors.dv_data_reference" helptext="Reference to statistics or data sources (max 500 characters)">
              <GoabInput
                v-model="form.dv_data_reference"
                type="text"
                name="dv_data_reference"
                placeholder="e.g., Statistics Canada DV Report 2025"
                width="100%"
                :maxLength="500"
              />
            </goa-form-item>
          </template>
        </goa-container>
      </template>

      <!-- ===== PART B ONLY: Expansion Details ===== -->
      <template v-if="isPartB">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">5. Expansion Details</h2>
          <template v-if="readOnly">
            <dl class="info-list">
              <div class="info-row">
                <dt>Expansion Type</dt>
                <dd>{{ form.expansion_type ? formatExpansionType(form.expansion_type) : '—' }}</dd>
              </div>
              <div class="info-row">
                <dt>Requested Bed/Unit Count</dt>
                <dd>{{ form.proposed_bed_count ?? '—' }}</dd>
              </div>
              <div class="info-row" v-if="form.proposed_open_date">
                <dt>Proposed Operational Date</dt>
                <dd>{{ form.proposed_open_date }}</dd>
              </div>
            </dl>
          </template>
          <template v-else>
            <goa-form-item label="Expansion Type" :error="fieldErrors.expansion_type">
              <goa-dropdown
                name="expansion_type"
                :value="form.expansion_type || ''"
                @_change="handleFieldChange('expansion_type', $event)"
                width="100%"
              >
                <goa-dropdown-item value="NewShelter" label="New Shelter"></goa-dropdown-item>
                <goa-dropdown-item value="AdditionalBeds" label="Additional Beds"></goa-dropdown-item>
                <goa-dropdown-item value="SecondStageExpansion" label="Second-Stage Expansion"></goa-dropdown-item>
                <goa-dropdown-item value="IncreasedOperationalFunding" label="Increased Operational Funding"></goa-dropdown-item>
              </goa-dropdown>
            </goa-form-item>

            <goa-spacer vspacing="m"></goa-spacer>

            <div class="form-row">
              <goa-form-item label="Requested Bed/Unit Count" :error="fieldErrors.proposed_bed_count" helptext="1 to 200">
                <GoabInput
                  v-model="form.proposed_bed_count"
                  type="number"
                  name="proposed_bed_count"
                  width="200px"
                />
              </goa-form-item>
              <goa-form-item label="Proposed Operational Date" :error="fieldErrors.proposed_open_date" helptext="YYYY-MM-DD">
                <GoabInput
                  v-model="form.proposed_open_date"
                  type="date"
                  name="proposed_open_date"
                  width="250px"
                />
              </goa-form-item>
            </div>
          </template>
        </goa-container>
      </template>

      <!-- Budget — shared (section number adjusts) -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">{{ isPartB ? '6' : '5' }}. Budget {{ isPartB ? 'Projections' : 'Information' }}</h2>

        <template v-if="readOnly">
          <div v-if="form.budget_lines.length > 0" class="budget-table-wrapper">
            <table class="budget-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Annual Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, idx) in form.budget_lines" :key="idx">
                  <td>{{ budgetCategories.find(c => c.value === line.category)?.label || line.category }}</td>
                  <td>{{ line.description || '—' }}</td>
                  <td class="budget-amount-cell">{{ formatCurrency(line.annual_amount) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="budget-total-label"><strong>Total Funding Requested</strong></td>
                  <td class="budget-total-amount"><strong>{{ formatCurrency(budgetTotal) }}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p v-else class="section-hint">No budget lines submitted.</p>
        </template>
        <template v-else>
          <p class="section-hint">Add line items for your funding request. At least one line item is required.</p>

          <div v-if="form.budget_lines.length > 0" class="budget-table-wrapper">
            <table class="budget-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Annual Amount ($)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, idx) in form.budget_lines" :key="idx">
                  <td>
                    <select v-model="line.category" class="budget-select">
                      <option value="">Select...</option>
                      <option v-for="cat in budgetCategories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
                    </select>
                  </td>
                  <td>
                    <input v-model="line.description" type="text" maxlength="200" placeholder="Description" class="budget-input" />
                  </td>
                  <td>
                    <input v-model.number="line.annual_amount" type="number" min="0" step="0.01" placeholder="0.00" class="budget-input budget-amount" />
                  </td>
                  <td>
                    <GoabButton type="tertiary" size="compact" @click="removeBudgetLine(idx)">
                      Remove
                    </GoabButton>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="budget-total-label"><strong>Total Funding Requested</strong></td>
                  <td class="budget-total-amount"><strong>${{ budgetTotal.toLocaleString('en-CA', { minimumFractionDigits: 2 }) }}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <goa-spacer vspacing="m"></goa-spacer>
          <GoabButton type="secondary" size="compact" @click="addBudgetLine">
            Add Budget Line
          </GoabButton>
        </template>
      </goa-container>

      <!-- ===== PART B ONLY: Federal Funding ===== -->
      <template v-if="isPartB">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">7. Federal Funding Information (Optional)</h2>
          <template v-if="readOnly">
            <dl class="info-list">
              <div class="info-row">
                <dt>Federal Funding Received</dt>
                <dd>{{ form.has_federal_funding === true ? 'Yes' : form.has_federal_funding === false ? 'No' : '—' }}</dd>
              </div>
              <template v-if="form.has_federal_funding === true">
                <div class="info-row" v-if="form.federal_agency_name">
                  <dt>Federal Agency</dt>
                  <dd>{{ form.federal_agency_name }}</dd>
                </div>
                <div class="info-row" v-if="form.federal_funding_amount">
                  <dt>Funding Amount</dt>
                  <dd>{{ formatCurrency(form.federal_funding_amount) }}</dd>
                </div>
                <div class="info-row" v-if="form.federal_funding_expiry_date">
                  <dt>Funding Expiry Date</dt>
                  <dd>{{ form.federal_funding_expiry_date }}</dd>
                </div>
              </template>
            </dl>
          </template>
          <template v-else>
            <goa-form-item label="Has your organization received federal funding for this initiative?">
              <goa-dropdown
                name="has_federal_funding"
                :value="form.has_federal_funding === true ? 'yes' : form.has_federal_funding === false ? 'no' : ''"
                @_change="handleFederalFundingToggle"
                width="200px"
              >
                <goa-dropdown-item value="yes" label="Yes"></goa-dropdown-item>
                <goa-dropdown-item value="no" label="No"></goa-dropdown-item>
              </goa-dropdown>
            </goa-form-item>

            <template v-if="form.has_federal_funding === true">
              <goa-spacer vspacing="m"></goa-spacer>

              <goa-form-item label="Federal Agency Name" :error="fieldErrors.federal_agency_name" helptext="Max 200 characters">
                <GoabInput
                  v-model="form.federal_agency_name"
                  type="text"
                  name="federal_agency_name"
                  placeholder="e.g., Canada Mortgage and Housing Corporation (CMHC)"
                  width="100%"
                  :maxLength="200"
                />
              </goa-form-item>

              <goa-spacer vspacing="m"></goa-spacer>

              <div class="form-row">
                <goa-form-item label="Federal Funding Amount ($)" :error="fieldErrors.federal_funding_amount">
                  <GoabInput
                    v-model="form.federal_funding_amount"
                    type="number"
                    name="federal_funding_amount"
                    width="250px"
                  />
                </goa-form-item>
                <goa-form-item label="Funding Expiry Date" :error="fieldErrors.federal_funding_expiry_date" helptext="YYYY-MM-DD">
                  <GoabInput
                    v-model="form.federal_funding_expiry_date"
                    type="date"
                    name="federal_funding_expiry_date"
                    width="250px"
                  />
                </goa-form-item>
              </div>
            </template>
          </template>
        </goa-container>
      </template>

      <!-- ===== PART A ONLY: Cost Pressures ===== -->
      <template v-if="!isPartB">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">6. Cost Pressures (Optional)</h2>
          <template v-if="readOnly">
            <p class="readonly-text">{{ form.cost_pressures_description || 'None provided.' }}</p>
          </template>
          <template v-else>
            <goa-form-item
              label="Describe any cost pressures justifying the renewal amount"
              helptext="Up to 3,000 characters"
            >
              <goa-textarea
                name="cost_pressures_description"
                :value="form.cost_pressures_description || ''"
                @_change="handleFieldChange('cost_pressures_description', $event)"
                width="100%"
                rows="4"
                :maxcharcount="3000"
              ></goa-textarea>
            </goa-form-item>
          </template>
        </goa-container>
      </template>

      <!-- ===== Supporting Documents (UC-13) — shared ===== -->
      <goa-container accent="thin" mb="l">
        <h2 class="section-title">{{ isPartB ? '8' : '7' }}. Supporting Documents</h2>
        <p class="section-hint">
          Upload supporting documents (PDF, JPEG, PNG, DOCX). Max 25 MB per file, 100 MB total per application.
        </p>

        <!-- Upload area -->
        <div v-if="application.status_code === 'Draft'" class="upload-area">
          <div class="upload-row">
            <goa-form-item label="Document Type">
              <select v-model="uploadDocType" class="budget-select upload-type-select">
                <option value="">Select type...</option>
                <option v-for="dt in documentTypeOptions" :key="dt.code" :value="dt.code">{{ dt.label }}</option>
              </select>
            </goa-form-item>
            <goa-form-item label="File">
              <input
                ref="fileInputRef"
                type="file"
                accept=".pdf,.jpeg,.jpg,.png,.docx"
                class="file-input"
                @change="handleFileSelect"
              />
            </goa-form-item>
            <div class="upload-btn-wrapper">
              <GoabButton type="secondary" size="compact" @click="handleUpload" :disabled="uploading || !selectedFile">
                {{ uploading ? 'Uploading...' : 'Upload' }}
              </GoabButton>
            </div>
          </div>

          <goa-callout v-if="uploadError" type="emergency" heading="Upload Error" mb="m">
            <p>{{ uploadError }}</p>
          </goa-callout>
          <goa-callout v-if="uploadSuccess" type="success" heading="Uploaded" mb="m">
            <p>{{ uploadSuccess }}</p>
          </goa-callout>
        </div>

        <!-- Document list -->
        <div v-if="documents.length > 0" class="documents-list">
          <table class="budget-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in documents" :key="doc.id">
                <td>
                  <a :href="getDownloadUrl(doc)" class="doc-link" target="_blank">{{ doc.file_name }}</a>
                </td>
                <td>{{ getDocTypeLabel(doc.document_type_code) }}</td>
                <td>{{ formatFileSize(doc.file_size_bytes) }}</td>
                <td>{{ new Date(doc.uploaded_at).toLocaleDateString() }}</td>
                <td>
                  <GoabButton
                    v-if="application.status_code === 'Draft'"
                    type="tertiary"
                    size="compact"
                    @click="handleDeleteDocument(doc.id)"
                  >
                    Remove
                  </GoabButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="section-hint" style="margin-top: var(--goa-space-m);">No documents uploaded yet.</p>
      </goa-container>

      <!-- ===== UC-18: Status History (read-only, non-Draft only) ===== -->
      <template v-if="readOnly && statusHistory.length > 0">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">{{ isPartB ? '9' : '8' }}. Status History</h2>
          <div class="status-timeline">
            <div v-for="entry in statusHistory" :key="entry.id" class="timeline-entry">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <goa-badge :type="statusBadgeType(entry.to_status)" :content="entry.to_status"></goa-badge>
                  <span class="timeline-date">{{ formatHistoryDate(entry.changed_at) }}</span>
                </div>
                <p v-if="entry.from_status" class="timeline-detail">
                  Changed from <strong>{{ entry.from_status }}</strong> to <strong>{{ entry.to_status }}</strong>
                </p>
                <p v-else class="timeline-detail">Application created</p>
                <p v-if="entry.note" class="timeline-note">{{ entry.note }}</p>
              </div>
            </div>
          </div>
        </goa-container>
      </template>

      <!-- ===== UC-19: Message Thread (non-Draft only) ===== -->
      <template v-if="readOnly">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">{{ isPartB ? '10' : '9' }}. Messages</h2>
          <p class="section-hint">Send a message to CFS regarding this application.</p>

          <!-- Message thread -->
          <div v-if="messages.length > 0" class="message-thread">
            <div v-for="msg in messages" :key="msg.id" class="message-bubble" :class="{ 'message-applicant': msg.sender_role === 'Applicant', 'message-cfs': msg.sender_role !== 'Applicant' }">
              <div class="message-meta">
                <strong>{{ msg.sender_role === 'Applicant' ? 'You' : 'CFS Staff' }}</strong>
                <span class="message-time">{{ formatHistoryDate(msg.sent_at) }}</span>
              </div>
              <p class="message-body">{{ msg.body }}</p>
            </div>
          </div>
          <p v-else class="section-hint" style="margin-top: var(--goa-space-s);">No messages yet.</p>

          <!-- Send message form -->
          <goa-spacer vspacing="m"></goa-spacer>
          <goa-form-item label="New Message" :error="messageError">
            <goa-textarea
              name="new_message"
              :value="newMessage"
              @_change="newMessage = ($event as CustomEvent).detail?.value || ''"
              width="100%"
              rows="3"
              placeholder="Type your message to CFS..."
              :maxcharcount="5000"
            ></goa-textarea>
          </goa-form-item>
          <goa-spacer vspacing="s"></goa-spacer>
          <GoabButton type="secondary" size="compact" @click="handleSendMessage" :disabled="sendingMessage || !newMessage.trim()">
            {{ sendingMessage ? 'Sending...' : 'Send Message' }}
          </GoabButton>
          <span v-if="messageSent" class="message-sent-indicator">Message sent.</span>
        </goa-container>
      </template>

      <!-- ===== UC-16: Declaration & Submit (Draft only) ===== -->
      <template v-if="application.status_code === 'Draft'">
        <goa-container accent="thin" mb="l">
          <h2 class="section-title">{{ isPartB ? '9' : '8' }}. Declaration</h2>
          <div class="declaration-box">
            <label class="declaration-label">
              <input type="checkbox" v-model="declarationAccepted" class="declaration-checkbox" />
              I certify that all information provided in this application is true, accurate, and complete to the best of my knowledge. I understand that providing false or misleading information may result in the rejection of this application.
            </label>
          </div>
          <goa-callout v-if="submitError" type="emergency" heading="Submission Failed" mt="m">
            <p>{{ submitError }}</p>
          </goa-callout>
        </goa-container>
      </template>

      <!-- Actions -->
      <div class="form-actions">
        <GoabButton type="tertiary" @click="router.push('/dashboard')">
          Back to Dashboard
        </GoabButton>
        <div v-if="application.status_code === 'Draft'" class="save-action-group">
          <span v-if="lastSavedAt && !saving" class="save-indicator-inline">
            {{ lastSaveSource === 'auto' ? 'Auto-saved' : 'Saved' }} at {{ lastSavedAt }}
          </span>
          <GoabButton type="secondary" @click="handleSaveDraft('manual')" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save Draft' }}
          </GoabButton>
          <GoabButton type="primary" @click="handleSubmit" :disabled="submitting || saving || !declarationAccepted">
            {{ submitting ? 'Submitting...' : 'Submit Application' }}
          </GoabButton>
        </div>
      </div>

      <!-- ===== UC-16: Submission Confirmation Screen ===== -->
      <div v-if="submitted" class="confirmation-screen">
        <goa-container accent="thin">
          <div class="confirmation-content">
            <h2 class="confirmation-heading">Your application has been submitted successfully.</h2>
            <dl class="info-list">
              <div class="info-row">
                <dt>Reference Number</dt>
                <dd><strong>{{ application.reference_number }}</strong></dd>
              </div>
              <div class="info-row">
                <dt>Submission Date</dt>
                <dd>{{ new Date(application.submitted_at!).toLocaleString('en-CA') }}</dd>
              </div>
              <div class="info-row">
                <dt>Status</dt>
                <dd><goa-badge type="success" :content="application.status_code" /></dd>
              </div>
            </dl>
            <goa-spacer vspacing="l"></goa-spacer>
            <GoabButton type="primary" @click="router.push('/dashboard')">
              Return to Dashboard
            </GoabButton>
          </div>
        </goa-container>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { GoabButton, GoabInput } from '../components/goa'
import {
  fetchApplicationFull,
  fetchMyOrganization,
  saveApplicationDraft,
  submitApplicationApi,
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentDownloadUrl,
  fetchStatusHistory,
  fetchMessages,
  sendMessageApi,
  DOCUMENT_TYPE_OPTIONS,
  type ApplicationSummary,
  type OrganizationProfile,
  type DocumentRecord,
  type StatusHistoryEntry,
  type MessageRecord
} from '../services/api.service'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const fieldErrors = ref<Record<string, string>>({})

// UC-14: Save indicator + auto-save
const lastSavedAt = ref('')
const lastSaveSource = ref<'manual' | 'auto'>('manual')

// UC-16: Declaration & Submit
const declarationAccepted = ref(false)
const submitting = ref(false)
const submitted = ref(false)
const submitError = ref('')
const isDirty = ref(false)
let autoSaveInterval: ReturnType<typeof setInterval> | null = null

const application = ref<ApplicationSummary | null>(null)
const organization = ref<OrganizationProfile | null>(null)
const statusHistory = ref<StatusHistoryEntry[]>([])
const messages = ref<MessageRecord[]>([])
const newMessage = ref('')
const sendingMessage = ref(false)
const messageError = ref('')
const messageSent = ref(false)

const isPartB = computed(() => application.value?.application_type === 'PART_B_NEW_OR_EXPANSION')
const readOnly = computed(() => application.value != null && application.value.status_code !== 'Draft')

const form = ref({
  // Shared fields
  program_name: '' as string,
  service_description: '' as string,
  budget_lines: [] as Array<{ category: string; description: string; annual_amount: number }>,
  // Part A fields
  current_bed_count: null as number | null,
  current_unit_count: null as number | null,
  cost_pressures_description: '' as string,
  // Part B: Community Need Justification
  proposed_location: '' as string,
  target_population: '' as string,
  community_need_justification: '' as string,
  existing_resources_description: '' as string,
  dv_data_reference: '' as string,
  // Part B: Expansion Details
  expansion_type: '' as string,
  proposed_bed_count: null as number | null,
  proposed_open_date: '' as string,
  // Part B: Federal Funding
  has_federal_funding: null as boolean | null,
  federal_agency_name: '' as string,
  federal_funding_amount: null as number | null,
  federal_funding_expiry_date: '' as string,
})

const budgetCategories = [
  { value: 'Salaries', label: 'Salaries' },
  { value: 'Benefits', label: 'Benefits' },
  { value: 'FacilityRental', label: 'Facility Rental' },
  { value: 'Utilities', label: 'Utilities' },
  { value: 'ProgramSupplies', label: 'Program Supplies' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Administration', label: 'Administration' },
  { value: 'Other', label: 'Other' }
]

const budgetTotal = computed(() => {
  return form.value.budget_lines.reduce((sum, line) => sum + (Number(line.annual_amount) || 0), 0)
})

function addBudgetLine() {
  form.value.budget_lines.push({ category: '', description: '', annual_amount: 0 })
}

function removeBudgetLine(idx: number) {
  form.value.budget_lines.splice(idx, 1)
}

function handleFieldChange(field: string, event: any) {
  const value = event.detail?.value ?? '';
  (form.value as any)[field] = value
}

function handleFederalFundingToggle(event: any) {
  const value = event.detail?.value ?? ''
  form.value.has_federal_funding = value === 'yes' ? true : value === 'no' ? false : null
}

// --- Documents (UC-13) ---
const documents = ref<DocumentRecord[]>([])
const documentTypeOptions = DOCUMENT_TYPE_OPTIONS
const uploadDocType = ref('')
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const uploadSuccess = ref('')

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
}

function getDownloadUrl(doc: DocumentRecord) {
  return getDocumentDownloadUrl(doc.application_id, doc.id)
}

function getDocTypeLabel(code: string | null): string {
  if (!code) return 'N/A'
  return documentTypeOptions.find(dt => dt.code === code)?.label || code
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function handleUpload() {
  if (!selectedFile.value || !application.value) return
  uploading.value = true
  uploadError.value = ''
  uploadSuccess.value = ''

  try {
    const doc = await uploadDocument(application.value.id, selectedFile.value, uploadDocType.value)
    documents.value.push(doc)
    uploadSuccess.value = `${doc.file_name} uploaded successfully.`
    selectedFile.value = null
    uploadDocType.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
    setTimeout(() => { uploadSuccess.value = '' }, 3000)
  } catch (err: any) {
    uploadError.value = err.response?.data?.error?.message || 'Upload failed'
  } finally {
    uploading.value = false
  }
}

async function handleDeleteDocument(docId: string) {
  if (!application.value) return
  try {
    await deleteDocument(application.value.id, docId)
    documents.value = documents.value.filter(d => d.id !== docId)
  } catch (err: any) {
    uploadError.value = err.response?.data?.error?.message || 'Delete failed'
  }
}

function formatProgramName(code: string): string {
  switch (code) {
    case 'WomensShelter': return "Women's Shelter"
    case 'SecondStageShelter': return 'Second-Stage Shelter'
    default: return code
  }
}

function formatExpansionType(code: string): string {
  switch (code) {
    case 'NewShelter': return 'New Shelter'
    case 'AdditionalBeds': return 'Additional Beds'
    case 'SecondStageExpansion': return 'Second-Stage Expansion'
    case 'IncreasedOperationalFunding': return 'Increased Operational Funding'
    default: return code
  }
}

function formatCurrency(amount: number | string | null): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  return num.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusBadgeType(status: string): string {
  switch (status) {
    case 'Draft': return 'information'
    case 'Submitted': return 'midtone'
    case 'UnderReview': return 'midtone'
    case 'MoreInfoRequired': return 'important'
    case 'Approved': return 'success'
    case 'Declined': return 'emergency'
    default: return 'information'
  }
}

function formatHistoryDate(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

async function handleSendMessage() {
  if (sendingMessage.value || !application.value || !newMessage.value.trim()) return
  sendingMessage.value = true
  messageError.value = ''
  messageSent.value = false

  try {
    const msg = await sendMessageApi(application.value.id, newMessage.value.trim())
    messages.value.push(msg)
    newMessage.value = ''
    messageSent.value = true
    setTimeout(() => { messageSent.value = false }, 3000)
  } catch (err: any) {
    messageError.value = err.response?.data?.error?.message || 'Failed to send message'
  } finally {
    sendingMessage.value = false
  }
}

function buildDraftPayload(): Record<string, any> {
  const data: any = {}

  // Shared fields
  if (form.value.program_name) data.program_name = form.value.program_name
  if (form.value.service_description) data.service_description = form.value.service_description

  // Budget lines (shared)
  const validLines = form.value.budget_lines.filter(l => l.category)
  if (validLines.length > 0) {
    data.budget_lines = validLines.map(l => ({
      category: l.category,
      description: l.description || '',
      annual_amount: Number(l.annual_amount) || 0
    }))
  }

  if (isPartB.value) {
    // Part B specific fields
    if (form.value.proposed_location) data.proposed_location = form.value.proposed_location
    if (form.value.target_population) data.target_population = form.value.target_population
    if (form.value.community_need_justification) data.community_need_justification = form.value.community_need_justification
    if (form.value.existing_resources_description) data.existing_resources_description = form.value.existing_resources_description
    if (form.value.dv_data_reference) data.dv_data_reference = form.value.dv_data_reference
    if (form.value.expansion_type) data.expansion_type = form.value.expansion_type
    if (form.value.proposed_bed_count !== null && form.value.proposed_bed_count !== undefined) {
      data.proposed_bed_count = Number(form.value.proposed_bed_count)
    }
    if (form.value.proposed_open_date) data.proposed_open_date = form.value.proposed_open_date
    if (form.value.has_federal_funding !== null) {
      data.has_federal_funding = form.value.has_federal_funding
    }
    if (form.value.has_federal_funding === true) {
      if (form.value.federal_agency_name) data.federal_agency_name = form.value.federal_agency_name
      if (form.value.federal_funding_amount !== null && form.value.federal_funding_amount !== undefined) {
        data.federal_funding_amount = Number(form.value.federal_funding_amount)
      }
      if (form.value.federal_funding_expiry_date) data.federal_funding_expiry_date = form.value.federal_funding_expiry_date
    }
  } else {
    // Part A specific fields
    if (form.value.current_bed_count !== null && form.value.current_bed_count !== undefined) {
      data.current_bed_count = Number(form.value.current_bed_count)
    }
    if (form.value.current_unit_count !== null && form.value.current_unit_count !== undefined) {
      data.current_unit_count = Number(form.value.current_unit_count)
    }
  }

  return data
}

async function handleSaveDraft(source: 'manual' | 'auto' = 'manual') {
  if (saving.value || !application.value || application.value.status_code !== 'Draft') return
  // Auto-save skips if nothing changed
  if (source === 'auto' && !isDirty.value) return

  saving.value = true
  saveError.value = ''
  fieldErrors.value = {}

  try {
    const data = buildDraftPayload()
    const result = await saveApplicationDraft(application.value.id, data)
    application.value = result
    isDirty.value = false
    lastSaveSource.value = source
    lastSavedAt.value = new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch (err: any) {
    if (err.response?.data?.error?.details) {
      fieldErrors.value = err.response.data.error.details
    }
    saveError.value = source === 'auto'
      ? 'Unable to auto-save your draft. Please try saving manually.'
      : (err.response?.data?.error?.message || 'Unable to save your draft. Please try again. If the problem persists, contact support.')
  } finally {
    saving.value = false
  }
}

// UC-14: Auto-save every 60 seconds during active editing
function startAutoSave() {
  if (autoSaveInterval) return
  autoSaveInterval = setInterval(() => {
    handleSaveDraft('auto')
  }, 60_000)
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
    autoSaveInterval = null
  }
}

// UC-16: Submit handler
async function handleSubmit() {
  if (submitting.value || !application.value || !declarationAccepted.value) return
  submitting.value = true
  submitError.value = ''

  try {
    // Save any unsaved changes first
    if (isDirty.value) {
      await handleSaveDraft('manual')
    }

    const { application: result } = await submitApplicationApi(application.value.id)
    application.value = result
    submitted.value = true
    stopAutoSave()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err: any) {
    const errData = err.response?.data?.error
    if (errData?.details && Array.isArray(errData.details)) {
      submitError.value = `Please complete the following required fields before submitting: ${errData.details.join(', ')}`
    } else {
      submitError.value = errData?.message || 'We were unable to submit your application. All your data has been saved. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

onUnmounted(() => {
  stopAutoSave()
})

onMounted(async () => {
  try {
    const id = route.params.id as string

    const [app, org] = await Promise.all([
      fetchApplicationFull(id),
      fetchMyOrganization()
    ])

    application.value = app
    organization.value = org

    // Shared fields
    form.value.program_name = app.program_name || ''
    form.value.service_description = app.service_description || ''

    if (app.budget_lines && app.budget_lines.length > 0) {
      form.value.budget_lines = app.budget_lines.map(l => ({
        category: l.category,
        description: l.description || '',
        annual_amount: Number(l.annual_amount) || 0
      }))
    }

    if (app.application_type === 'PART_B_NEW_OR_EXPANSION') {
      // Part B fields
      form.value.proposed_location = app.proposed_location || ''
      form.value.target_population = app.target_population || ''
      form.value.community_need_justification = app.community_need_justification || ''
      form.value.existing_resources_description = app.existing_resources_description || ''
      form.value.dv_data_reference = app.dv_data_reference || ''
      form.value.expansion_type = app.expansion_type || ''
      form.value.proposed_bed_count = app.proposed_bed_count
      form.value.proposed_open_date = app.proposed_open_date || ''
      form.value.has_federal_funding = app.has_federal_funding
      form.value.federal_agency_name = app.federal_agency_name || ''
      form.value.federal_funding_amount = app.federal_funding_amount
      form.value.federal_funding_expiry_date = app.federal_funding_expiry_date || ''
    } else {
      // Part A fields
      form.value.current_bed_count = app.current_bed_count
      form.value.current_unit_count = app.current_unit_count
    }

    // Load documents (UC-13)
    try {
      documents.value = await fetchDocuments(id)
    } catch {
      // Documents may fail to load but shouldn't block the form
    }

    // UC-18/19: Load status history + messages for non-Draft applications
    if (app.status_code !== 'Draft') {
      try {
        statusHistory.value = await fetchStatusHistory(id)
      } catch {
        // Status history may fail but shouldn't block the view
      }
      try {
        messages.value = await fetchMessages(id)
      } catch {
        // Messages may fail but shouldn't block the view
      }
    }

    // UC-14: Start dirty tracking + auto-save after form is populated
    watch(form, () => { isDirty.value = true }, { deep: true })
    if (app.status_code === 'Draft') {
      startAutoSave()
    }
  } catch (err: any) {
    loadError.value = err.response?.data?.error?.message || 'Failed to load application'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail-view {
  max-width: 900px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--goa-space-m);
  flex-wrap: wrap;
  margin-bottom: var(--goa-space-l);
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
  display: flex;
  align-items: center;
  gap: var(--goa-space-s);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--goa-space-m);
  padding: var(--goa-space-2xl) 0;
  color: var(--goa-color-greyscale-700);
}

.section-title {
  font-size: var(--goa-font-size-5);
  font-weight: 600;
  color: var(--goa-color-greyscale-black);
  margin: 0 0 var(--goa-space-s) 0;
}

.section-hint {
  color: var(--goa-color-greyscale-700);
  font-size: var(--goa-font-size-3);
  margin: 0 0 var(--goa-space-m) 0;
}

.info-list {
  margin: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: var(--goa-space-s) 0;
  border-bottom: 1px solid var(--goa-color-greyscale-200);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row dt {
  font-weight: 600;
  color: var(--goa-color-greyscale-700);
}

.info-row dd {
  margin: 0;
}

.form-row {
  display: flex;
  gap: var(--goa-space-xl);
  flex-wrap: wrap;
}

.char-count {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-greyscale-500);
  margin: var(--goa-space-xs) 0 0;
}

/* Budget table */
.budget-table-wrapper {
  overflow-x: auto;
}

.budget-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--goa-font-size-3);
}

.budget-table th {
  text-align: left;
  padding: var(--goa-space-s) var(--goa-space-s);
  border-bottom: 2px solid var(--goa-color-greyscale-300);
  color: var(--goa-color-greyscale-700);
  font-weight: 600;
}

.budget-table td {
  padding: var(--goa-space-xs) var(--goa-space-s);
  border-bottom: 1px solid var(--goa-color-greyscale-200);
  vertical-align: middle;
}

.budget-table tfoot td {
  border-top: 2px solid var(--goa-color-greyscale-400);
  border-bottom: none;
  padding-top: var(--goa-space-m);
}

.budget-select,
.budget-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--goa-color-greyscale-400);
  border-radius: 4px;
  font-size: var(--goa-font-size-3);
  font-family: inherit;
}

.budget-select:focus,
.budget-input:focus {
  outline: 2px solid var(--goa-color-interactive-focus);
  outline-offset: 1px;
}

.budget-amount {
  text-align: right;
  width: 140px;
}

.budget-total-label {
  text-align: right;
}

.budget-total-amount {
  text-align: right;
  font-size: var(--goa-font-size-4);
}

/* Document upload */
.upload-area {
  margin-bottom: var(--goa-space-m);
}

.upload-row {
  display: flex;
  gap: var(--goa-space-l);
  align-items: flex-end;
  flex-wrap: wrap;
}

.upload-type-select {
  min-width: 260px;
}

.file-input {
  font-size: var(--goa-font-size-3);
  padding: 6px 0;
}

.upload-btn-wrapper {
  padding-bottom: var(--goa-space-xs);
}

.documents-list {
  margin-top: var(--goa-space-m);
}

.doc-link {
  color: var(--goa-color-interactive-default);
  text-decoration: underline;
}

.doc-link:hover {
  color: var(--goa-color-interactive-hover);
}

/* UC-14: Save indicator */
.save-indicator {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-status-success);
  padding: var(--goa-space-xs) 0;
}

.save-indicator-inline {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-greyscale-500);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--goa-space-l);
  border-top: 1px solid var(--goa-color-greyscale-200);
}

.save-action-group {
  display: flex;
  align-items: center;
  gap: var(--goa-space-m);
}

/* UC-16: Declaration & Confirmation */
.declaration-box {
  background: var(--goa-color-greyscale-100);
  border: 1px solid var(--goa-color-greyscale-300);
  border-radius: 4px;
  padding: var(--goa-space-m);
}

.declaration-label {
  display: flex;
  gap: var(--goa-space-m);
  align-items: flex-start;
  cursor: pointer;
  font-size: var(--goa-font-size-3);
  line-height: 1.6;
}

.declaration-checkbox {
  margin-top: 4px;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  cursor: pointer;
}

.confirmation-screen {
  margin-top: var(--goa-space-xl);
}

.confirmation-content {
  text-align: center;
  padding: var(--goa-space-l) 0;
}

.confirmation-heading {
  font-size: var(--goa-font-size-6);
  font-weight: 700;
  color: var(--goa-color-status-success);
  margin: 0 0 var(--goa-space-l) 0;
}

.confirmation-content .info-list {
  display: inline-block;
  text-align: left;
  min-width: 300px;
}

/* UC-18: Read-only view */
.readonly-text {
  font-size: var(--goa-font-size-3);
  line-height: 1.6;
  color: var(--goa-color-greyscale-black);
  white-space: pre-wrap;
  margin: 0;
}

.subsection-label {
  font-size: var(--goa-font-size-4);
  font-weight: 600;
  color: var(--goa-color-greyscale-700);
  margin: 0 0 var(--goa-space-xs) 0;
}

.budget-amount-cell {
  text-align: right;
}

/* UC-18: Status History Timeline */
.status-timeline {
  position: relative;
  padding-left: var(--goa-space-l);
}

.status-timeline::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--goa-color-greyscale-300);
}

.timeline-entry {
  position: relative;
  padding-bottom: var(--goa-space-m);
}

.timeline-entry:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: calc(-1 * var(--goa-space-l) + 2px);
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--goa-color-interactive-default);
  border: 2px solid white;
}

.timeline-content {
  padding-left: var(--goa-space-xs);
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: var(--goa-space-m);
  margin-bottom: var(--goa-space-2xs);
}

.timeline-date {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-greyscale-500);
}

.timeline-detail {
  font-size: var(--goa-font-size-3);
  color: var(--goa-color-greyscale-700);
  margin: 0;
}

.timeline-note {
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-greyscale-500);
  font-style: italic;
  margin: var(--goa-space-2xs) 0 0;
}

/* UC-19: Message Thread */
.message-thread {
  display: flex;
  flex-direction: column;
  gap: var(--goa-space-m);
  margin-top: var(--goa-space-m);
  margin-bottom: var(--goa-space-m);
}

.message-bubble {
  padding: var(--goa-space-m);
  border-radius: 8px;
  max-width: 80%;
}

.message-applicant {
  background: var(--goa-color-interactive-default);
  color: white;
  align-self: flex-end;
}

.message-cfs {
  background: var(--goa-color-greyscale-100);
  color: var(--goa-color-greyscale-black);
  align-self: flex-start;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--goa-space-m);
  margin-bottom: var(--goa-space-xs);
  font-size: var(--goa-font-size-2);
}

.message-applicant .message-meta {
  color: rgba(255, 255, 255, 0.85);
}

.message-time {
  font-size: var(--goa-font-size-1);
  opacity: 0.8;
}

.message-body {
  margin: 0;
  font-size: var(--goa-font-size-3);
  line-height: 1.5;
  white-space: pre-wrap;
}

.message-sent-indicator {
  margin-left: var(--goa-space-m);
  font-size: var(--goa-font-size-2);
  color: var(--goa-color-status-success);
  font-weight: 600;
}
</style>
