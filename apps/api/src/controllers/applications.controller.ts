/**
 * Applications Controller
 *
 * Handles HTTP requests for application lifecycle (UC-09+)
 */

import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import { findOrganizationByAccountId } from '../services/organizations.service.js'
import {
  createApplication,
  listApplicationsByOrganization,
  getApplicationById,
  setApplicationType,
  savePartADraft,
  validatePartADraft,
  savePartBDraft,
  validatePartBDraft,
  getApplicationWithBudget,
  submitApplication,
  getStatusHistory
} from '../services/applications.service.js'

export function createApplicationsController(pool: Pool) {
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

    // Only applicants can manage applications
    if (!user.roles?.includes('applicant')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only applicants can manage applications' }
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
        error: {
          code: 'ORG_NOT_REGISTERED',
          message: 'Your organization must be registered before creating an application. Please complete organization registration first.'
        }
      })
      return null
    }

    return org
  }

  return {
    /**
     * POST /api/v1/applications
     * Create a new application in Draft status (UC-09)
     */
    async startApplication(req: Request, res: Response) {
      try {
        const org = await getAuthenticatedOrg(req, res)
        if (!org) return // response already sent

        const application = await createApplication(pool, org.id)

        res.status(201).json({
          success: true,
          data: { application },
          message: `Application ${application.reference_number} created in Draft status.`
        })
      } catch (error) {
        console.error('Create application error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'CREATE_ERROR', message: 'Failed to create application' }
        })
      }
    },

    /**
     * GET /api/v1/applications
     * List applications for the authenticated user's organization
     */
    async listApplications(req: Request, res: Response) {
      try {
        const org = await getAuthenticatedOrg(req, res)
        if (!org) return

        const applications = await listApplicationsByOrganization(pool, org.id)

        res.json({
          success: true,
          data: { applications, count: applications.length }
        })
      } catch (error) {
        console.error('List applications error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'LIST_ERROR', message: 'Failed to list applications' }
        })
      }
    },

    /**
     * GET /api/v1/applications/:id
     * Get a single application by ID
     */
    async getApplication(req: Request, res: Response) {
      try {
        const org = await getAuthenticatedOrg(req, res)
        if (!org) return

        const application = await getApplicationById(pool, req.params.id as string, org.id)
        if (!application) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.json({
          success: true,
          data: { application }
        })
      } catch (error) {
        console.error('Get application error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'GET_ERROR', message: 'Failed to get application' }
        })
      }
    },

    /**
     * PATCH /api/v1/applications/:id/type
     * Set application type on a Draft application (UC-10)
     */
    async selectType(req: Request, res: Response) {
      try {
        const org = await getAuthenticatedOrg(req, res)
        if (!org) return

        const { application_type } = req.body
        if (!application_type) {
          return res.status(400).json({
            success: false,
            error: { code: 'MISSING_TYPE', message: 'Please select an application type to proceed.' }
          })
        }

        const application = await setApplicationType(pool, req.params.id as string, org.id, application_type)
        if (!application) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found or not in Draft status' }
          })
        }

        res.json({
          success: true,
          data: { application },
          message: `Application type set to ${application.application_type}.`
        })
      } catch (error: any) {
        if (error.code === 'INVALID_TYPE') {
          return res.status(400).json({
            success: false,
            error: { code: 'INVALID_TYPE', message: error.message }
          })
        }
        console.error('Select type error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'UPDATE_ERROR', message: 'Failed to set application type' }
        })
      }
    },

    /**
     * GET /api/v1/applications/:id/full
     * Get application with budget lines (for form loading)
     */
    async getApplicationFull(req: Request, res: Response) {
      try {
        const org = await getAuthenticatedOrg(req, res)
        if (!org) return

        const application = await getApplicationWithBudget(pool, req.params.id as string, org.id)
        if (!application) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.json({
          success: true,
          data: { application }
        })
      } catch (error) {
        console.error('Get application full error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'GET_ERROR', message: 'Failed to get application' }
        })
      }
    },

    /**
     * PATCH /api/v1/applications/:id
     * Save draft application fields + budget lines (UC-11 Part A, UC-12 Part B)
     */
    async saveDraft(req: Request, res: Response) {
      try {
        const org = await getAuthenticatedOrg(req, res)
        if (!org) return

        // Fetch application to determine type
        const existing = await getApplicationById(pool, req.params.id as string, org.id)
        if (!existing || existing.status_code !== 'Draft') {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found or not in Draft status' }
          })
        }

        let application
        if (existing.application_type === 'PART_B_NEW_OR_EXPANSION') {
          // Part B validation + save
          const { valid, errors } = validatePartBDraft(req.body)
          if (!valid) {
            return res.status(400).json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors }
            })
          }
          application = await savePartBDraft(pool, req.params.id as string, org.id, req.body)
        } else if (existing.application_type === 'PART_A_BASE_RENEWAL') {
          // Part A validation + save
          const { valid, errors } = validatePartADraft(req.body)
          if (!valid) {
            return res.status(400).json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors }
            })
          }
          application = await savePartADraft(pool, req.params.id as string, org.id, req.body)
        } else {
          return res.status(400).json({
            success: false,
            error: { code: 'NO_TYPE', message: 'Please select an application type before saving.' }
          })
        }

        if (!application) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found or not in Draft status' }
          })
        }

        res.json({
          success: true,
          data: { application },
          message: 'Draft saved successfully.'
        })
      } catch (error) {
        console.error('Save draft error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'SAVE_ERROR', message: 'Failed to save draft' }
        })
      }
    },

    /**
     * POST /api/v1/applications/:id/submit
     * Declare and submit an application (UC-16)
     */
    async submit(req: Request, res: Response) {
      try {
        const org = await getAuthenticatedOrg(req, res)
        if (!org) return

        // BR-003: Declaration must be accepted
        if (!req.body?.declaration_accepted) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'DECLARATION_REQUIRED',
              message: 'You must accept the declaration before submitting. Please check the declaration checkbox to certify that all information is true and accurate.'
            }
          })
        }

        const user = (req.session as any)?.user
        const application = await submitApplication(pool, req.params.id as string, org.id, user.id)

        res.json({
          success: true,
          data: { application },
          message: `Application ${application.reference_number} has been submitted successfully.`
        })
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: error.message }
          })
        }
        if (error.code === 'VALIDATION_ERROR') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
              details: error.details
            }
          })
        }
        console.error('Submit application error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'SUBMIT_ERROR', message: 'We were unable to submit your application due to a system error. All your data has been saved. Please try again.' }
        })
      }
    },

    /**
     * GET /api/v1/applications/:id/history
     * Get status history for an application (UC-18)
     */
    async getHistory(req: Request, res: Response) {
      try {
        const org = await getAuthenticatedOrg(req, res)
        if (!org) return

        const history = await getStatusHistory(pool, req.params.id as string, org.id)
        if (history === null) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.json({
          success: true,
          data: { history }
        })
      } catch (error) {
        console.error('Get status history error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'HISTORY_ERROR', message: 'Failed to get status history' }
        })
      }
    }
  }
}
