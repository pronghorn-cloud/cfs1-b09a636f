import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import { getFundedShelters, getZones } from '../services/shelters.service.js'

export function createSheltersController(pool: Pool) {
  return {
    async listFundedShelters(req: Request, res: Response) {
      try {
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined
        const zone = typeof req.query.zone === 'string' ? req.query.zone.trim() : undefined

        const shelters = await getFundedShelters(pool, { search, zone })

        res.json({
          success: true,
          data: {
            shelters,
            count: shelters.length
          }
        })
      } catch (error) {
        console.error('Error fetching funded shelters:', error)
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to retrieve funded shelter listing',
            code: 'INTERNAL_ERROR'
          }
        })
      }
    },

    async listZones(_req: Request, res: Response) {
      try {
        const zones = await getZones(pool)

        res.json({
          success: true,
          data: { zones }
        })
      } catch (error) {
        console.error('Error fetching zones:', error)
        res.status(500).json({
          success: false,
          error: {
            message: 'Failed to retrieve zones',
            code: 'INTERNAL_ERROR'
          }
        })
      }
    }
  }
}
