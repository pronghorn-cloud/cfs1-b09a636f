import type { Pool } from 'pg'

export interface ContactInquiry {
  sender_name: string
  sender_email: string
  subject: string
  message: string
  ip_address?: string
}

export interface ContactValidationError {
  field: string
  message: string
}

export function validateContactInquiry(data: any): ContactValidationError[] {
  const errors: ContactValidationError[] = []

  if (!data.sender_name || typeof data.sender_name !== 'string' || !data.sender_name.trim()) {
    errors.push({ field: 'sender_name', message: 'Name is required' })
  } else if (data.sender_name.trim().length > 200) {
    errors.push({ field: 'sender_name', message: 'Name must be 200 characters or less' })
  }

  if (!data.sender_email || typeof data.sender_email !== 'string' || !data.sender_email.trim()) {
    errors.push({ field: 'sender_email', message: 'Email is required' })
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.sender_email.trim())) {
    errors.push({ field: 'sender_email', message: 'A valid email address is required' })
  }

  if (!data.subject || typeof data.subject !== 'string' || !data.subject.trim()) {
    errors.push({ field: 'subject', message: 'Subject is required' })
  } else if (data.subject.trim().length > 300) {
    errors.push({ field: 'subject', message: 'Subject must be 300 characters or less' })
  }

  if (!data.message || typeof data.message !== 'string' || !data.message.trim()) {
    errors.push({ field: 'message', message: 'Message is required' })
  } else if (data.message.trim().length > 5000) {
    errors.push({ field: 'message', message: 'Message must be 5000 characters or less' })
  }

  return errors
}

export async function createContactInquiry(
  pool: Pool,
  inquiry: ContactInquiry
): Promise<{ id: string }> {
  const query = `
    INSERT INTO app.contact_inquiries (sender_name, sender_email, subject, message, ip_address)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `

  const result = await pool.query(query, [
    inquiry.sender_name.trim(),
    inquiry.sender_email.trim().toLowerCase(),
    inquiry.subject.trim(),
    inquiry.message.trim(),
    inquiry.ip_address || null
  ])

  return { id: result.rows[0].id }
}
