/**
 * Documents Service
 *
 * Business logic for document upload/retrieval/deletion (UC-13)
 * Prototype: files stored on local filesystem; metadata in app.documents
 */

import type { Pool } from 'pg'
import fs from 'fs'
import path from 'path'

export interface DocumentRecord {
  id: string
  application_id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  storage_path: string
  document_type_code: string | null
  uploaded_by_user_id: string
  uploaded_at: string
}

/** Max file size: 25 MB (BR-006) */
const MAX_FILE_SIZE = 25 * 1024 * 1024

/** MIME type → file_type mapping */
const MIME_TO_TYPE: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX'
}

/** Allowed MIME types set */
const ALLOWED_MIMES = new Set(Object.keys(MIME_TO_TYPE))

/**
 * Validate file format by MIME type
 */
export function validateFileFormat(mimetype: string): { valid: boolean; fileType: string | null; error?: string } {
  if (!ALLOWED_MIMES.has(mimetype)) {
    return {
      valid: false,
      fileType: null,
      error: 'Accepted formats: PDF, JPEG, JPG, PNG, DOCX'
    }
  }
  return { valid: true, fileType: MIME_TO_TYPE[mimetype]! }
}

/**
 * Validate file size (25 MB per file)
 */
export function validateFileSize(sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes > MAX_FILE_SIZE) {
    return { valid: false, error: `File exceeds maximum size of 25 MB` }
  }
  return { valid: true }
}

/**
 * Check if document_type_code is valid (exists in app.document_types)
 */
export async function validateDocumentTypeCode(
  pool: Pool,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  const result = await pool.query(
    'SELECT code FROM app.document_types WHERE code = $1',
    [code]
  )
  if (result.rows.length === 0) {
    return { valid: false, error: 'Invalid document type' }
  }
  return { valid: true }
}

/**
 * Get total file size for an application (for 100 MB cumulative check)
 */
export async function getApplicationTotalFileSize(
  pool: Pool,
  applicationId: string
): Promise<number> {
  const result = await pool.query(
    'SELECT COALESCE(SUM(file_size_bytes), 0) as total FROM app.documents WHERE application_id = $1',
    [applicationId]
  )
  return parseInt(result.rows[0].total, 10)
}

/**
 * Upload a document: store file and insert metadata (UC-13)
 */
export async function uploadDocument(
  pool: Pool,
  applicationId: string,
  userId: string,
  file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  documentTypeCode: string | null
): Promise<DocumentRecord> {
  // Determine file type from MIME
  const fileType = MIME_TO_TYPE[file.mimetype] || 'OTHER'

  // Store file to disk: uploads/<applicationId>/<uuid>-<originalname>
  const uploadsDir = path.resolve(process.cwd(), 'uploads', applicationId)
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = path.join(uploadsDir, `${uniquePrefix}-${safeFilename}`)

  fs.writeFileSync(storagePath, file.buffer)

  // Insert metadata
  const result = await pool.query(
    `INSERT INTO app.documents (
       application_id, file_name, file_type, file_size_bytes,
       storage_path, document_type_code, uploaded_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      applicationId,
      file.originalname,
      fileType,
      file.size,
      storagePath,
      documentTypeCode,
      userId
    ]
  )

  return result.rows[0]
}

/**
 * List all documents for an application
 */
export async function listDocumentsByApplication(
  pool: Pool,
  applicationId: string
): Promise<DocumentRecord[]> {
  const result = await pool.query(
    `SELECT * FROM app.documents
     WHERE application_id = $1
     ORDER BY uploaded_at ASC`,
    [applicationId]
  )
  return result.rows
}

/**
 * Get a single document by ID (with application ownership check)
 */
export async function getDocumentById(
  pool: Pool,
  documentId: string,
  applicationId: string
): Promise<DocumentRecord | null> {
  const result = await pool.query(
    `SELECT * FROM app.documents
     WHERE id = $1 AND application_id = $2`,
    [documentId, applicationId]
  )
  return result.rows[0] || null
}

/**
 * Delete a document: remove metadata and file from disk
 */
export async function deleteDocument(
  pool: Pool,
  documentId: string,
  applicationId: string
): Promise<boolean> {
  // Get the document first (for file path)
  const doc = await getDocumentById(pool, documentId, applicationId)
  if (!doc) return false

  // Delete metadata
  await pool.query(
    'DELETE FROM app.documents WHERE id = $1 AND application_id = $2',
    [documentId, applicationId]
  )

  // Delete file from disk (best-effort)
  try {
    if (fs.existsSync(doc.storage_path)) {
      fs.unlinkSync(doc.storage_path)
    }
  } catch {
    console.error(`Failed to delete file: ${doc.storage_path}`)
  }

  return true
}
