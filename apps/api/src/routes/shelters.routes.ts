import { Router } from 'express'
import type { Pool } from 'pg'
import { createSheltersController } from '../controllers/shelters.controller.js'

export function createShelterRoutes(pool: Pool): Router {
  const router = Router()
  const controller = createSheltersController(pool)

  // GET /api/v1/funded-shelters — Public endpoint (no auth required)
  router.get('/funded-shelters', controller.listFundedShelters)

  // GET /api/v1/zones — Public endpoint for zone lookup
  router.get('/zones', controller.listZones)

  return router
}
