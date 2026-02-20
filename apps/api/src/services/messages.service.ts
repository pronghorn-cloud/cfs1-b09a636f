/**
 * Messages Service (UC-19)
 *
 * Simple message thread per application — applicant sends messages to CFS.
 * Mock implementation: no email notifications.
 */

import type { Pool } from 'pg'

export interface Message {
  id: string
  application_id: string
  sender_user_id: string
  sender_role: string
  subject: string | null
  body: string
  is_read: boolean
  sent_at: string
}

/**
 * List messages for an application (chronological order)
 */
export async function listMessages(
  pool: Pool,
  applicationId: string,
  organizationId: string
): Promise<Message[] | null> {
  // Verify ownership
  const appCheck = await pool.query(
    'SELECT id FROM app.applications WHERE id = $1 AND organization_id = $2',
    [applicationId, organizationId]
  )
  if (appCheck.rows.length === 0) return null

  const result = await pool.query(
    `SELECT id, application_id, sender_user_id, sender_role, subject, body, is_read, sent_at
     FROM app.messages
     WHERE application_id = $1
     ORDER BY sent_at ASC`,
    [applicationId]
  )
  return result.rows
}

/**
 * Send a message on an application (applicant only, non-Draft apps only)
 */
export async function sendMessage(
  pool: Pool,
  applicationId: string,
  organizationId: string,
  userId: string,
  body: string
): Promise<Message | null> {
  // Verify ownership + non-Draft status
  const appCheck = await pool.query(
    `SELECT id, status_code FROM app.applications
     WHERE id = $1 AND organization_id = $2`,
    [applicationId, organizationId]
  )
  if (appCheck.rows.length === 0) return null

  const app = appCheck.rows[0]
  if (app.status_code === 'Draft') {
    const err = new Error('Messages can only be sent on submitted applications.') as any
    err.code = 'NOT_DRAFT'
    throw err
  }

  const result = await pool.query(
    `INSERT INTO app.messages (application_id, sender_user_id, sender_role, body)
     VALUES ($1, $2, 'Applicant', $3)
     RETURNING id, application_id, sender_user_id, sender_role, subject, body, is_read, sent_at`,
    [applicationId, userId, body]
  )
  return result.rows[0]
}
