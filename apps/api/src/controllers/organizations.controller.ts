/**
 * Organizations Controller
 *
 * Handles HTTP requests for organization profile registration (UC-08) and retrieval (UC-09)
 */

import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import {
  validateOrganizationInput,
  findOrganizationByAccountId,
  createOrganization
} from '../services/organizations.service.js'
import { authService } from '../services/auth.service.js'

export function createOrganizationsController(pool: Pool) {
  /**
   * GET /api/v1/organizations/me
   * Get the current user's organization profile (or null if not registered)
   */
  async function getMyOrganization(req: Request, res: Response) {
    try {
      const user = authService.getCurrentUser(req)
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
        })
      }

      const myAlbertaId = user.attributes?.myAlbertaId
      if (!myAlbertaId) {
        return res.json({
          success: true,
          data: { organization: null }
        })
      }

      const org = await findOrganizationByAccountId(pool, myAlbertaId)
      return res.json({
        success: true,
        data: { organization: org }
      })
    } catch (error) {
      console.error('Get organization error:', error)
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve organization profile' }
      })
    }
  }

  /**
   * POST /api/v1/organizations
   * Register a new organization profile (UC-08)
   */
  async function registerOrganization(req: Request, res: Response) {
    try {
      const user = authService.getCurrentUser(req)
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
        })
      }

      const myAlbertaId = user.attributes?.myAlbertaId
      if (!myAlbertaId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_ACCOUNT_ID', message: 'MyAlberta.ca account identifier not found in session' }
        })
      }

      // Check for duplicate registration (BR-008)
      const existing = await findOrganizationByAccountId(pool, myAlbertaId)
      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_REGISTRATION',
            message: 'An organization profile already exists for this MyAlberta.ca account. Please navigate to your dashboard to view your existing profile.'
          }
        })
      }

      // Validate input (SWREQ-011)
      const { valid, errors } = validateOrganizationInput(req.body)
      if (!valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Please correct the errors below', fields: errors }
        })
      }

      // Create organization profile
      const org = await createOrganization(pool, {
        myalberta_account_id: myAlbertaId,
        ...req.body
      })

      return res.status(201).json({
        success: true,
        data: {
          organization: org,
          message: 'Your organization profile has been registered successfully.'
        }
      })
    } catch (error: any) {
      // Handle unique constraint violation (BR-008 enforced at DB level)
      if (error.code === '23505' && error.constraint?.includes('myalberta_account_id')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_REGISTRATION',
            message: 'An organization profile already exists for this MyAlberta.ca account.'
          }
        })
      }

      console.error('Register organization error:', error)
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to register organization. Please try again.' }
      })
    }
  }

  return { getMyOrganization, registerOrganization }
}
