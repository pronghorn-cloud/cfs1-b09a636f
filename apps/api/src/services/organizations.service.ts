/**
 * Organizations Service
 *
 * Business logic for organization profile registration and retrieval (UC-08, UC-09)
 */

import type { Pool } from 'pg'

export interface OrganizationInput {
  myalberta_account_id: string
  legal_name: string
  organization_type: string
  society_registration_number?: string
  registration_date?: string
  service_address_street: string
  service_address_city: string
  service_address_province: string
  service_address_postal_code: string
  mailing_address_street: string
  mailing_address_city: string
  mailing_address_province: string
  mailing_address_postal_code: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
}

export interface Organization extends OrganizationInput {
  id: string
  created_at: string
  updated_at: string
}

const VALID_ORG_TYPES = [
  'Non-Profit Society',
  'Registered Charity',
  'Indigenous Organization',
  'Other'
]

/**
 * Validate organization registration input
 */
export function validateOrganizationInput(data: any): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  // Required text fields
  if (!data.legal_name?.trim()) {
    errors.legal_name = 'Legal organization name is required'
  } else if (data.legal_name.trim().length > 200) {
    errors.legal_name = 'Legal name must be 200 characters or less'
  }

  if (!data.organization_type) {
    errors.organization_type = 'Organization type is required'
  } else if (!VALID_ORG_TYPES.includes(data.organization_type)) {
    errors.organization_type = 'Invalid organization type'
  }

  // Service address
  if (!data.service_address_street?.trim()) {
    errors.service_address_street = 'Service address street is required'
  }
  if (!data.service_address_city?.trim()) {
    errors.service_address_city = 'Service address city is required'
  }
  if (!data.service_address_postal_code?.trim()) {
    errors.service_address_postal_code = 'Service address postal code is required'
  } else if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(data.service_address_postal_code.trim())) {
    errors.service_address_postal_code = 'Postal code must be in A1A 1A1 format'
  }

  // Mailing address
  if (!data.mailing_address_street?.trim()) {
    errors.mailing_address_street = 'Mailing address street is required'
  }
  if (!data.mailing_address_city?.trim()) {
    errors.mailing_address_city = 'Mailing address city is required'
  }
  if (!data.mailing_address_postal_code?.trim()) {
    errors.mailing_address_postal_code = 'Mailing address postal code is required'
  } else if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(data.mailing_address_postal_code.trim())) {
    errors.mailing_address_postal_code = 'Postal code must be in A1A 1A1 format'
  }

  // Primary contact
  if (!data.primary_contact_name?.trim()) {
    errors.primary_contact_name = 'Primary contact name is required'
  }
  if (!data.primary_contact_email?.trim()) {
    errors.primary_contact_email = 'Primary contact email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.primary_contact_email.trim())) {
    errors.primary_contact_email = 'Enter a valid email address'
  }
  if (!data.primary_contact_phone?.trim()) {
    errors.primary_contact_phone = 'Primary contact phone is required'
  } else if (!/^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(data.primary_contact_phone.trim())) {
    errors.primary_contact_phone = 'Phone number must be in North American format (e.g., (780) 555-0123)'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Find an organization by MyAlberta.ca account ID
 */
export async function findOrganizationByAccountId(pool: Pool, myalbertaAccountId: string): Promise<Organization | null> {
  const query = `
    SELECT id, myalberta_account_id, legal_name, organization_type,
           society_registration_number, registration_date,
           service_address_street, service_address_city, service_address_province, service_address_postal_code,
           mailing_address_street, mailing_address_city, mailing_address_province, mailing_address_postal_code,
           primary_contact_name, primary_contact_email, primary_contact_phone,
           created_at, updated_at
    FROM app.organizations
    WHERE myalberta_account_id = $1
  `
  const result = await pool.query(query, [myalbertaAccountId])
  return result.rows[0] || null
}

/**
 * Create a new organization profile (UC-08)
 */
export async function createOrganization(pool: Pool, data: OrganizationInput): Promise<Organization> {
  const query = `
    INSERT INTO app.organizations (
      myalberta_account_id, legal_name, organization_type,
      society_registration_number, registration_date,
      service_address_street, service_address_city, service_address_province, service_address_postal_code,
      mailing_address_street, mailing_address_city, mailing_address_province, mailing_address_postal_code,
      primary_contact_name, primary_contact_email, primary_contact_phone
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id, myalberta_account_id, legal_name, organization_type,
              society_registration_number, registration_date,
              service_address_street, service_address_city, service_address_province, service_address_postal_code,
              mailing_address_street, mailing_address_city, mailing_address_province, mailing_address_postal_code,
              primary_contact_name, primary_contact_email, primary_contact_phone,
              created_at, updated_at
  `
  const result = await pool.query(query, [
    data.myalberta_account_id,
    data.legal_name.trim(),
    data.organization_type,
    data.society_registration_number?.trim() || null,
    data.registration_date || null,
    data.service_address_street.trim(),
    data.service_address_city.trim(),
    data.service_address_province || 'AB',
    data.service_address_postal_code.trim().toUpperCase(),
    data.mailing_address_street.trim(),
    data.mailing_address_city.trim(),
    data.mailing_address_province || 'AB',
    data.mailing_address_postal_code.trim().toUpperCase(),
    data.primary_contact_name.trim(),
    data.primary_contact_email.trim().toLowerCase(),
    data.primary_contact_phone.trim()
  ])
  return result.rows[0]
}
