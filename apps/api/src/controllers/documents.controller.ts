/**
 * Documents Controller
 *
 * Handles HTTP requests for document upload/download/delete (UC-13)
 */

import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import fs from 'fs'
import multer from 'multer'
import { findOrganizationByAccountId } from '../services/organizations.service.js'
import { getApplicationById } from '../services/applications.service.js'
import {
  validateFileFormat,
  validateFileSize,
  validateDocumentTypeCode,
  getApplicationTotalFileSize,
  uploadDocument,
  listDocumentsByApplication,
  getDocumentById,
  deleteDocument
} from '../services/documents.service.js'

/** Multer configured for memory storage (buffer) with 25 MB limit */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
})

/** Multer middleware for single file field named "file" */
export const uploadMiddleware = upload.single('file')

/** MIME types accepted by multer */
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'PDF': 'application/pdf',
  'JPEG': 'image/jpeg',
  'PNG': 'image/png',
  'DOCX': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

export function createDocumentsController(pool: Pool) {

  /**
   * Helper: get the authenticated user's organization
   */
  async function getAuthenticatedOrg(req: Request, res: Response) {
    const user = (req.session as any)?.user
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
      })
      return null
    }

    if (!user.roles?.includes('applicant')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only applicants can manage documents' }
      })
      return null
    }

    const myAlbertaId = user.attributes?.myAlbertaId
    if (!myAlbertaId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_ACCOUNT_ID', message: 'MyAlberta.ca account ID not found' }
      })
      return null
    }

    const org = await findOrganizationByAccountId(pool, myAlbertaId)
    if (!org) {
      res.status(400).json({
        success: false,
        error: { code: 'ORG_NOT_REGISTERED', message: 'Organization not registered' }
      })
      return null
    }

    return { org, user }
  }

  return {
    /**
     * POST /api/v1/applications/:id/documents
     * Upload a document to a Draft application (UC-13)
     */
    async upload(req: Request, res: Response) {
      try {
        const auth = await getAuthenticatedOrg(req, res)
        if (!auth) return

        const applicationId = req.params.id as string

        // Check application exists, belongs to org, and is Draft
        const app = await getApplicationById(pool, applicationId, auth.org.id)
        if (!app) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        if (app.status_code !== 'Draft') {
          return res.status(400).json({
            success: false,
            error: { code: 'NOT_DRAFT', message: 'Documents can only be uploaded to Draft applications' }
          })
        }

        // Check file was provided
        const file = (req as any).file
        if (!file) {
          return res.status(400).json({
            success: false,
            error: { code: 'NO_FILE', message: 'No file provided' }
          })
        }

        // Validate file format
        const formatCheck = validateFileFormat(file.mimetype)
        if (!formatCheck.valid) {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_FORMAT', message: formatCheck.error }
          })
        }

        // Validate file size
        const sizeCheck = validateFileSize(file.size)
        if (!sizeCheck.valid) {
          return res.status(400).json({
            success: false,
            error: { code: 'FILE_TOO_LARGE', message: sizeCheck.error }
          })
        }

        // Validate cumulative size (100 MB per application)
        const currentTotal = await getApplicationTotalFileSize(pool, applicationId)
        if (currentTotal + file.size > 100 * 1024 * 1024) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'TOTAL_SIZE_EXCEEDED',
              message: 'Total application documents exceed 100 MB limit'
            }
          })
        }

        // Validate document_type_code if provided
        const documentTypeCode = req.body?.document_type_code || null
        if (documentTypeCode) {
          const typeCheck = await validateDocumentTypeCode(pool, documentTypeCode)
          if (!typeCheck.valid) {
            return res.status(400).json({
              success: false,
              error: { code: 'INVALID_DOC_TYPE', message: typeCheck.error }
            })
          }
        }

        // Upload
        const userId = auth.user.attributes?.myAlbertaId || auth.user.email || 'unknown'
        const document = await uploadDocument(pool, applicationId, userId, file, documentTypeCode)

        res.status(200).json({
          success: true,
          data: { document },
          message: 'Document uploaded successfully.'
        })
      } catch (error) {
        console.error('Upload document error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'UPLOAD_ERROR', message: 'Failed to upload document' }
        })
      }
    },

    /**
     * GET /api/v1/applications/:id/documents
     * List all documents for an application (UC-13)
     */
    async list(req: Request, res: Response) {
      try {
        const auth = await getAuthenticatedOrg(req, res)
        if (!auth) return

        const applicationId = req.params.id as string

        // Check application exists and belongs to org
        const app = await getApplicationById(pool, applicationId, auth.org.id)
        if (!app) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        const documents = await listDocumentsByApplication(pool, applicationId)

        res.json({
          success: true,
          data: { documents, count: documents.length }
        })
      } catch (error) {
        console.error('List documents error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'LIST_ERROR', message: 'Failed to list documents' }
        })
      }
    },

    /**
     * GET /api/v1/applications/:id/documents/:docId/download
     * Download a document file (UC-13)
     */
    async download(req: Request, res: Response) {
      try {
        const auth = await getAuthenticatedOrg(req, res)
        if (!auth) return

        const applicationId = req.params.id as string
        const docId = req.params.docId as string

        // Check application exists and belongs to org
        const app = await getApplicationById(pool, applicationId, auth.org.id)
        if (!app) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        const document = await getDocumentById(pool, docId, applicationId)
        if (!document) {
          return res.status(404).json({
            success: false,
            error: { code: 'DOC_NOT_FOUND', message: 'Document not found' }
          })
        }

        // Check file exists on disk
        if (!fs.existsSync(document.storage_path)) {
          return res.status(404).json({
            success: false,
            error: { code: 'FILE_MISSING', message: 'File not found on storage' }
          })
        }

        // Determine content type
        const contentType = ALLOWED_CONTENT_TYPES[document.file_type] || 'application/octet-stream'
        res.setHeader('Content-Type', contentType)
        res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`)

        const fileStream = fs.createReadStream(document.storage_path)
        fileStream.pipe(res)
      } catch (error) {
        console.error('Download document error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'DOWNLOAD_ERROR', message: 'Failed to download document' }
        })
      }
    },

    /**
     * DELETE /api/v1/applications/:id/documents/:docId
     * Remove a document (UC-13)
     */
    async remove(req: Request, res: Response) {
      try {
        const auth = await getAuthenticatedOrg(req, res)
        if (!auth) return

        const applicationId = req.params.id as string
        const docId = req.params.docId as string

        // Check application exists, belongs to org, and is Draft
        const app = await getApplicationById(pool, applicationId, auth.org.id)
        if (!app) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        if (app.status_code !== 'Draft') {
          return res.status(400).json({
            success: false,
            error: { code: 'NOT_DRAFT', message: 'Documents can only be removed from Draft applications' }
          })
        }

        const deleted = await deleteDocument(pool, docId, applicationId)
        if (!deleted) {
          return res.status(404).json({
            success: false,
            error: { code: 'DOC_NOT_FOUND', message: 'Document not found' }
          })
        }

        res.json({
          success: true,
          data: {},
          message: 'Document deleted successfully.'
        })
      } catch (error) {
        console.error('Delete document error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'DELETE_ERROR', message: 'Failed to delete document' }
        })
      }
    }
  }
}
