import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import { getActiveFaqs } from '../services/faqs.service.js'

export function createFaqsController(pool: Pool) {
  return {
    async listFaqs(_req: Request, res: Response) {
      try {
        const faqs = await getActiveFaqs(pool)

        res.json({
          success: true,
          data: {
            faqs,
            count: faqs.length
          }
        })
      } catch (error) {
        console.error('Error fetching FAQs:', error)
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to retrieve FAQs',
            code: 'INTERNAL_ERROR'
          }
        })
      }
    }
  }
}
