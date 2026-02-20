import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import { validateContactInquiry, createContactInquiry } from '../services/contact.service.js'

export function createContactController(pool: Pool) {
  return {
    async submitInquiry(req: Request, res: Response) {
      try {
        const errors = validateContactInquiry(req.body)

        if (errors.length > 0) {
          res.status(400).json({
            success: false,
            error: {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: errors
            }
          })
          return
        }

        const result = await createContactInquiry(pool, {
          sender_name: req.body.sender_name,
          sender_email: req.body.sender_email,
          subject: req.body.subject,
          message: req.body.message,
          ip_address: req.ip
        })

        console.log(`Contact inquiry logged: ${result.id}`)

        res.status(201).json({
          success: true,
          data: {
            message: 'Your message has been sent. CFS will respond within 5 business days.',
            id: result.id
          }
        })
      } catch (error) {
        console.error('Error submitting contact inquiry:', error)
        res.status(500).json({
          success: false,
          error: {
            message: 'We were unable to send your message. Please try again or contact us directly.',
            code: 'INTERNAL_ERROR'
          }
        })
      }
    }
  }
}
