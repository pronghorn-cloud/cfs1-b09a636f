/**
 * Admin Controller (UC-20, UC-21, UC-22, UC-23, UC-24, UC-25, UC-26, UC-27)
 *
 * GET   /api/v1/admin/applications               — list all non-Draft applications
 * GET   /api/v1/admin/applications/:id            — full detail (with budget + org)
 * GET   /api/v1/admin/applications/:id/history    — status history
 * GET   /api/v1/admin/applications/:id/messages   — message thread
 * GET   /api/v1/admin/applications/:id/notes      — internal notes (admin only)
 * POST  /api/v1/admin/applications/:id/notes      — add internal note
 * POST  /api/v1/admin/applications/:id/messages   — send message (UC-23)
 * PATCH /api/v1/admin/applications/:id/status     — update status (BR-007)
 * GET   /api/v1/admin/reports/cost-pressure       — cost pressure report (UC-24)
 * GET   /api/v1/admin/reports/cost-pressure/csv   — CSV export (UC-24)
 * GET   /api/v1/admin/reports/regional            — regional distribution report (UC-27)
 * GET   /api/v1/admin/reports/regional/csv        — CSV export (UC-27)
 * GET   /api/v1/admin/reports/fiscal-year         — fiscal year summary report (UC-27)
 * GET   /api/v1/admin/reports/fiscal-year/csv     — CSV export (UC-27)
 * GET   /api/v1/admin/funded-shelters             — list shelters (admin view, UC-25)
 * GET   /api/v1/admin/funded-shelters/:id         — shelter detail (UC-25)
 * POST  /api/v1/admin/funded-shelters             — create shelter (UC-25)
 * PATCH /api/v1/admin/funded-shelters/:id         — update shelter (UC-25)
 * GET   /api/v1/admin/dashboard                   — data dashboard (UC-26)
 */

import type { Request, Response } from 'express'
import type { Pool } from 'pg'
import {
  listAllApplications,
  getAdminApplicationDetail,
  getAdminStatusHistory,
  getAdminMessages,
  listInternalNotes,
  addInternalNote,
  updateApplicationStatus,
  sendAdminMessage,
  generateCostPressureReport,
  costPressureReportToCsv,
  listFundedSheltersAdmin,
  getFundedShelterAdmin,
  createFundedShelter,
  updateFundedShelter,
  generateDashboardData,
  generateRegionalReport,
  regionalReportToCsv,
  generateFiscalYearReport,
  fiscalYearReportToCsv
} from '../services/admin.service.js'

export function createAdminController(pool: Pool) {
  /**
   * Helper: verify the user has cfs_admin role. Returns user or null.
   */
  function requireAdmin(req: Request, res: Response): any | null {
    const user = (req.session as any)?.user
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Not authenticated' }
      })
      return null
    }

    if (!user.roles?.includes('cfs_admin')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to access this page.' }
      })
      return null
    }

    return user
  }

  return {
    /**
     * GET /api/v1/admin/applications
     */
    async listApplications(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const status = req.query.status as string | undefined
        const search = req.query.search as string | undefined

        const applications = await listAllApplications(pool, { status, search })

        res.json({
          success: true,
          data: { applications, count: applications.length }
        })
      } catch (error) {
        console.error('Admin list applications error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'LIST_ERROR', message: 'Failed to list applications' }
        })
      }
    },

    /**
     * GET /api/v1/admin/applications/:id
     */
    async getApplicationDetail(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const application = await getAdminApplicationDetail(pool, req.params.id as string)
        if (!application) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.json({ success: true, data: { application } })
      } catch (error) {
        console.error('Admin get application detail error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'GET_ERROR', message: 'Failed to get application detail' }
        })
      }
    },

    /**
     * GET /api/v1/admin/applications/:id/history
     */
    async getHistory(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const history = await getAdminStatusHistory(pool, req.params.id as string)
        if (history === null) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.json({ success: true, data: { history } })
      } catch (error) {
        console.error('Admin get history error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'HISTORY_ERROR', message: 'Failed to get status history' }
        })
      }
    },

    /**
     * GET /api/v1/admin/applications/:id/messages
     */
    async getMessages(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const messages = await getAdminMessages(pool, req.params.id as string)
        if (messages === null) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.json({ success: true, data: { messages } })
      } catch (error) {
        console.error('Admin get messages error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'MESSAGES_ERROR', message: 'Failed to get messages' }
        })
      }
    },

    /**
     * GET /api/v1/admin/applications/:id/notes
     */
    async listNotes(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const notes = await listInternalNotes(pool, req.params.id as string)
        if (notes === null) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.json({ success: true, data: { notes } })
      } catch (error) {
        console.error('Admin list notes error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'NOTES_ERROR', message: 'Failed to list notes' }
        })
      }
    },

    /**
     * POST /api/v1/admin/applications/:id/notes
     */
    async addNote(req: Request, res: Response) {
      try {
        const user = requireAdmin(req, res)
        if (!user) return

        const { note_text } = req.body
        if (!note_text || typeof note_text !== 'string' || note_text.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Note text is required.' }
          })
        }

        const note = await addInternalNote(pool, req.params.id as string, user.id, note_text.trim())
        if (note === null) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Application not found' }
          })
        }

        res.status(201).json({ success: true, data: { note } })
      } catch (error) {
        console.error('Admin add note error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'NOTE_ERROR', message: 'Failed to add note' }
        })
      }
    },

    /**
     * POST /api/v1/admin/applications/:id/messages (UC-23)
     */
    async sendMessage(req: Request, res: Response) {
      try {
        const user = requireAdmin(req, res)
        if (!user) return

        const { body } = req.body
        if (!body || typeof body !== 'string' || body.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Please enter a message before sending.' }
          })
        }
        if (body.trim().length > 5000) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Message must be 5000 characters or fewer.' }
          })
        }

        const message = await sendAdminMessage(pool, req.params.id as string, user.id, body.trim())
        res.status(201).json({ success: true, data: { message } })
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: error.message }
          })
        }
        console.error('Admin send message error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'SEND_ERROR', message: 'Failed to send message' }
        })
      }
    },

    /**
     * PATCH /api/v1/admin/applications/:id/status
     */
    async updateStatus(req: Request, res: Response) {
      try {
        const user = requireAdmin(req, res)
        if (!user) return

        const { new_status, note } = req.body
        if (!new_status || typeof new_status !== 'string') {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'new_status is required.' }
          })
        }

        const application = await updateApplicationStatus(
          pool, req.params.id as string, new_status, user.id, note
        )

        res.json({ success: true, data: { application } })
      } catch (error: any) {
        if (error.code === 'NOT_FOUND') {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: error.message }
          })
        }
        if (error.code === 'INVALID_TRANSITION') {
          return res.status(409).json({
            success: false,
            error: { code: 'INVALID_TRANSITION', message: error.message }
          })
        }
        console.error('Admin update status error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'UPDATE_ERROR', message: 'Failed to update status' }
        })
      }
    },

    /**
     * GET /api/v1/admin/reports/cost-pressure (UC-24)
     */
    async getCostPressureReport(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const filters = {
          application_type: req.query.application_type as string | undefined,
          zone: req.query.zone as string | undefined,
          date_from: req.query.date_from as string | undefined,
          date_to: req.query.date_to as string | undefined
        }

        const report = await generateCostPressureReport(pool, filters)
        res.json({ success: true, data: { report } })
      } catch (error) {
        console.error('Cost pressure report error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'REPORT_ERROR', message: 'Failed to generate report' }
        })
      }
    },

    /**
     * GET /api/v1/admin/reports/cost-pressure/csv (UC-24)
     */
    async getCostPressureReportCsv(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const filters = {
          application_type: req.query.application_type as string | undefined,
          zone: req.query.zone as string | undefined,
          date_from: req.query.date_from as string | undefined,
          date_to: req.query.date_to as string | undefined
        }

        const report = await generateCostPressureReport(pool, filters)
        const csv = costPressureReportToCsv(report)

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="cost-pressure-report.csv"')
        res.send(csv)
      } catch (error) {
        console.error('Cost pressure CSV export error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'EXPORT_ERROR', message: 'Unable to export the report. Please try again.' }
        })
      }
    },

    // --- Regional Distribution Report (UC-27) ---

    /**
     * GET /api/v1/admin/reports/regional
     */
    async getRegionalReport(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const filters = {
          application_type: req.query.application_type as string | undefined,
          zone: req.query.zone as string | undefined,
          date_from: req.query.date_from as string | undefined,
          date_to: req.query.date_to as string | undefined
        }

        const report = await generateRegionalReport(pool, filters)
        res.json({ success: true, data: { report } })
      } catch (error) {
        console.error('Regional report error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'REPORT_ERROR', message: 'Failed to generate report' }
        })
      }
    },

    /**
     * GET /api/v1/admin/reports/regional/csv
     */
    async getRegionalReportCsv(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const filters = {
          application_type: req.query.application_type as string | undefined,
          zone: req.query.zone as string | undefined,
          date_from: req.query.date_from as string | undefined,
          date_to: req.query.date_to as string | undefined
        }

        const report = await generateRegionalReport(pool, filters)
        const csv = regionalReportToCsv(report)

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="regional-distribution-report.csv"')
        res.send(csv)
      } catch (error) {
        console.error('Regional CSV export error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'EXPORT_ERROR', message: 'Unable to export the report. Please try again.' }
        })
      }
    },

    // --- Fiscal Year Summary Report (UC-27) ---

    /**
     * GET /api/v1/admin/reports/fiscal-year
     */
    async getFiscalYearReport(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const filters = {
          application_type: req.query.application_type as string | undefined,
          zone: req.query.zone as string | undefined,
          date_from: req.query.date_from as string | undefined,
          date_to: req.query.date_to as string | undefined
        }

        const report = await generateFiscalYearReport(pool, filters)
        res.json({ success: true, data: { report } })
      } catch (error) {
        console.error('Fiscal year report error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'REPORT_ERROR', message: 'Failed to generate report' }
        })
      }
    },

    /**
     * GET /api/v1/admin/reports/fiscal-year/csv
     */
    async getFiscalYearReportCsv(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const filters = {
          application_type: req.query.application_type as string | undefined,
          zone: req.query.zone as string | undefined,
          date_from: req.query.date_from as string | undefined,
          date_to: req.query.date_to as string | undefined
        }

        const report = await generateFiscalYearReport(pool, filters)
        const csv = fiscalYearReportToCsv(report)

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="fiscal-year-summary-report.csv"')
        res.send(csv)
      } catch (error) {
        console.error('Fiscal year CSV export error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'EXPORT_ERROR', message: 'Unable to export the report. Please try again.' }
        })
      }
    },

    // --- Funded Shelters CRUD (UC-25) ---

    /**
     * GET /api/v1/admin/funded-shelters
     */
    async listShelters(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const shelters = await listFundedSheltersAdmin(pool)
        res.json({ success: true, data: { shelters, count: shelters.length } })
      } catch (error) {
        console.error('Admin list shelters error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'LIST_ERROR', message: 'Failed to list funded shelters' }
        })
      }
    },

    /**
     * GET /api/v1/admin/funded-shelters/:id
     */
    async getShelter(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const shelter = await getFundedShelterAdmin(pool, req.params.id as string)
        if (!shelter) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Funded shelter not found' }
          })
        }

        res.json({ success: true, data: { shelter } })
      } catch (error) {
        console.error('Admin get shelter error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'GET_ERROR', message: 'Failed to get funded shelter' }
        })
      }
    },

    /**
     * POST /api/v1/admin/funded-shelters
     */
    async createShelter(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const { shelter_name, city, zone_code, service_type_code, bed_count, unit_count, funding_amount, is_active } = req.body

        // Validate required fields
        if (!shelter_name || typeof shelter_name !== 'string' || shelter_name.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'shelter_name is required.' }
          })
        }
        if (!city || typeof city !== 'string' || city.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'city is required.' }
          })
        }
        if (!zone_code || typeof zone_code !== 'string') {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'zone_code is required.' }
          })
        }
        if (!service_type_code || typeof service_type_code !== 'string') {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'service_type_code is required.' }
          })
        }

        const shelter = await createFundedShelter(pool, {
          shelter_name: shelter_name.trim(),
          city: city.trim(),
          zone_code,
          service_type_code,
          bed_count: bed_count ?? null,
          unit_count: unit_count ?? null,
          funding_amount: funding_amount ?? null,
          is_active: is_active !== false
        })

        res.status(201).json({ success: true, data: { shelter } })
      } catch (error) {
        console.error('Admin create shelter error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'CREATE_ERROR', message: 'Failed to create funded shelter' }
        })
      }
    },

    /**
     * PATCH /api/v1/admin/funded-shelters/:id
     */
    async updateShelter(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const shelter = await updateFundedShelter(pool, req.params.id as string, req.body)
        if (!shelter) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Funded shelter not found' }
          })
        }

        res.json({ success: true, data: { shelter } })
      } catch (error) {
        console.error('Admin update shelter error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'UPDATE_ERROR', message: 'Failed to update funded shelter' }
        })
      }
    },

    // --- Data Dashboard (UC-26) ---

    /**
     * GET /api/v1/admin/dashboard
     */
    async getDashboard(req: Request, res: Response) {
      try {
        if (!requireAdmin(req, res)) return

        const dashboard = await generateDashboardData(pool)
        res.json({ success: true, data: { dashboard } })
      } catch (error) {
        console.error('Dashboard error:', error)
        res.status(500).json({
          success: false,
          error: { code: 'DASHBOARD_ERROR', message: 'Failed to generate dashboard data' }
        })
      }
    }
  }
}
