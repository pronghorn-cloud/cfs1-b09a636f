/**
 * Messages Controller (UC-19)
 *
 * GET  /api/v1/applications/:id/messages — list messages
 * POST /api/v1/applications/:id/messages — send a message
 */

import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import { findOrganizationByAccountId } from '../services/organizations.service.js'
import { listMessages, sendMessage } from '../services/messages.service.js'

export function createMessagesController(pool: Pool) {
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
        error: { code: 'FORBIDDEN', message: 'Only applicants can send messages' }
      })
      return null
    }

    const myAlbertaId = user.attributes?.myAlbertaId
    if (!myAlbertaId) {
      res.status(400).json({
        success: false,
        error: { code: 'NO_ACCOUNT_ID', message: 'Account ID not found' }
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
    async list(req: Request, res: Response) {
      try {
        const auth = await getAuthenticatedOrg(req, res)
        if (!auth) return

        const messages = await listMessages(pool, req.params.id as string, auth.org.id)
        if (messages === null) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.json({ success: true, data: { messages } })
      } catch (error) {
        console.error('List messages error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'LIST_ERROR', message: 'Failed to list messages' }
        })
      }
    },

    async send(req: Request, res: Response) {
      try {
        const auth = await getAuthenticatedOrg(req, res)
        if (!auth) return

        const { body } = req.body
        if (!body || typeof body !== 'string' || body.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Please enter a message before sending.' }
          })
        }

        if (body.length > 5000) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Message exceeds the maximum length of 5000 characters.' }
          })
        }

        const message = await sendMessage(pool, req.params.id as string, auth.org.id, auth.user.id, body.trim())
        if (message === null) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.status(201).json({ success: true, data: { message } })
      } catch (error: any) {
        if (error.code === 'NOT_DRAFT') {
          return res.status(400).json({
            success: false,
            error: { code: 'NOT_DRAFT', message: error.message }
          })
        }
        console.error('Send message error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'SEND_ERROR', message: 'Failed to send message' }
        })
      }
    }
  }
}
