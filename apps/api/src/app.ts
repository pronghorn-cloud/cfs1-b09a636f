import express, { type Express, type Request, type Response, type NextFunction } from 'express'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.routes.js'
import { authController } from './controllers/auth.controller.js'
import { createSheltersController } from './controllers/shelters.controller.js'
import { createFaqsController } from './controllers/faqs.controller.js'
import { createContactController } from './controllers/contact.controller.js'
import { createOrganizationsController } from './controllers/organizations.controller.js'
import { createApplicationsController } from './controllers/applications.controller.js'
import { createDocumentsController, uploadMiddleware } from './controllers/documents.controller.js'
import { createMessagesController } from './controllers/messages.controller.js'
import { createAdminController } from './controllers/admin.controller.js'
import { generalRateLimiter, createCustomRateLimiter } from './middleware/rate-limit.middleware.js'
import { csrfProtection, csrfTokenEndpoint } from './middleware/csrf.middleware.js'
import { devLogger, prodLogger, logError } from './middleware/logger.middleware.js'
import { createDatabasePool } from './config/database.config.js'
import { setupDbMetrics, checkDatabaseHealth, getPoolHealth } from './middleware/db-metrics.middleware.js'

const PgSession = connectPgSimple(session)

export function createApp(): Express {
  const app = express()

  // Trust reverse proxy (Render, Azure, etc.) so secure cookies work behind TLS termination
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1)
  }

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for GoA web components
            'https://cdn.jsdelivr.net', // GoA components CDN
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for GoA web components
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // Required for GoA web components
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  )

  // CORS - must be before session to allow credentials
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  )

  // Rate limiting - apply based on environment
  const rateLimit = process.env.RATE_LIMIT_MAX
    ? createCustomRateLimiter(parseInt(process.env.RATE_LIMIT_MAX, 10))
    : generalRateLimiter
  app.use(rateLimit)

  // Request logging - sanitized to prevent PII exposure
  if (process.env.NODE_ENV === 'development') {
    app.use(devLogger)
  } else {
    app.use(prodLogger)
  }

  // Body parsers
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Database pool configuration (Azure PostgreSQL standard compliant)
  // Always create pool when DB_CONNECTION_STRING is available (needed for API queries)
  let dbPool: any = null
  if (process.env.DB_CONNECTION_STRING) {
    dbPool = createDatabasePool()

    // Setup metrics collection (every 30 seconds)
    if (process.env.NODE_ENV === 'production' || process.env.DB_ENABLE_METRICS === 'true') {
      setupDbMetrics(dbPool)
    }
  }

  const sessionStore = process.env.SESSION_STORE === 'postgres' && dbPool
    ? new PgSession({
        pool: dbPool,
        tableName: 'session',
        schemaName: 'app', // Azure standard: use 'app' schema, not 'public'
        createTableIfMissing: false, // We create it via migration
      })
    : undefined // Use default memory store

  // Store pool reference for health checks and graceful shutdown
  if (dbPool) {
    app.set('dbPool', dbPool)
  }

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: (process.env.SESSION_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
      },
      name: 'connect.sid',
    })
  )

  // Log session store type
  console.log(`📦 Session store: ${process.env.SESSION_STORE || 'memory'}`)

  // Public data routes (no CSRF needed - read-only GET endpoints)
  if (dbPool) {
    console.log('📂 Registering public data routes (funded-shelters, zones, faqs)')
    const shelterCtrl = createSheltersController(dbPool)
    app.get('/api/v1/funded-shelters', shelterCtrl.listFundedShelters)
    app.get('/api/v1/zones', shelterCtrl.listZones)

    const faqsCtrl = createFaqsController(dbPool)
    app.get('/api/v1/faqs', faqsCtrl.listFaqs)

    const orgCtrl = createOrganizationsController(dbPool)
    app.get('/api/v1/organizations/me', orgCtrl.getMyOrganization)

    const appCtrl = createApplicationsController(dbPool)
    app.get('/api/v1/applications', appCtrl.listApplications)
    app.get('/api/v1/applications/:id/full', appCtrl.getApplicationFull)
    app.get('/api/v1/applications/:id/history', appCtrl.getHistory)
    app.get('/api/v1/applications/:id', appCtrl.getApplication)

    // Document read routes (UC-13)
    const docCtrl = createDocumentsController(dbPool)
    app.get('/api/v1/applications/:id/documents', docCtrl.list)
    app.get('/api/v1/applications/:id/documents/:docId/download', docCtrl.download)

    // Message read routes (UC-19)
    const msgCtrl = createMessagesController(dbPool)
    app.get('/api/v1/applications/:id/messages', msgCtrl.list)

    // Admin read routes (UC-20, UC-21, UC-24, UC-25, UC-26, UC-27)
    const adminCtrl = createAdminController(dbPool)
    app.get('/api/v1/admin/dashboard', adminCtrl.getDashboard)
    app.get('/api/v1/admin/reports/cost-pressure/csv', adminCtrl.getCostPressureReportCsv)
    app.get('/api/v1/admin/reports/cost-pressure', adminCtrl.getCostPressureReport)
    app.get('/api/v1/admin/reports/regional/csv', adminCtrl.getRegionalReportCsv)
    app.get('/api/v1/admin/reports/regional', adminCtrl.getRegionalReport)
    app.get('/api/v1/admin/reports/fiscal-year/csv', adminCtrl.getFiscalYearReportCsv)
    app.get('/api/v1/admin/reports/fiscal-year', adminCtrl.getFiscalYearReport)
    app.get('/api/v1/admin/funded-shelters/:id', adminCtrl.getShelter)
    app.get('/api/v1/admin/funded-shelters', adminCtrl.listShelters)
    app.get('/api/v1/admin/applications', adminCtrl.listApplications)
    app.get('/api/v1/admin/applications/:id/history', adminCtrl.getHistory)
    app.get('/api/v1/admin/applications/:id/messages', adminCtrl.getMessages)
    app.get('/api/v1/admin/applications/:id/notes', adminCtrl.listNotes)
    app.get('/api/v1/admin/applications/:id', adminCtrl.getApplicationDetail)
  }

  // Mock login endpoint (development only — no CSRF needed, registered before CSRF middleware)
  app.post('/api/v1/auth/mock-login', (req, res) => authController.mockLogin(req, res))

  // CSRF protection - must be after session
  app.use(csrfProtection)

  // CSRF token endpoint
  app.get('/api/v1/csrf-token', csrfTokenEndpoint)

  // Health check endpoint with database connectivity check
  // Azure standard: Applications MUST expose a lightweight DB health check with short timeout
  app.get('/api/v1/health', async (_req: Request, res: Response) => {
    const pool = app.get('dbPool')
    let dbHealthy = true
    let dbStatus = 'not_configured'
    let poolHealth = null

    // Check database health if pool is configured
    if (pool && process.env.SESSION_STORE === 'postgres') {
      try {
        dbHealthy = await checkDatabaseHealth(pool, 2000) // 2 second timeout
        dbStatus = dbHealthy ? 'connected' : 'disconnected'

        // Get detailed pool statistics
        poolHealth = getPoolHealth(pool)
      } catch (error) {
        dbHealthy = false
        dbStatus = 'error'
        console.error('Health check database query failed:', error)
      }
    }

    // Overall status: degraded if database is unhealthy
    const overallStatus = dbHealthy ? 'healthy' : 'degraded'
    const statusCode = dbHealthy ? 200 : 503

    res.status(statusCode).json({
      success: dbHealthy,
      data: {
        status: overallStatus,
        database: dbStatus,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        pool: poolHealth
          ? {
              utilization: `${poolHealth.utilization}%`,
              connections: {
                total: poolHealth.stats.total,
                idle: poolHealth.stats.idle,
                active: poolHealth.stats.total - poolHealth.stats.idle,
                waiting: poolHealth.stats.waiting,
              },
              warnings: poolHealth.warnings,
            }
          : undefined,
      },
    })
  })

  // API info endpoint
  app.get('/api/v1/info', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        name: process.env.APP_NAME || 'Alberta Government Enterprise Template',
        version: 'v1',
        description: 'Enterprise-grade template with GoA Design System and dual authentication',
        features: {
          authentication: ['Mock', 'SAML 2.0', 'MS Entra ID'],
          security: ['Helmet CSP', 'CSRF Protection', 'Rate Limiting', 'Input Validation', 'Secure Logging'],
          design: 'Alberta Government Design System (GoA)',
        },
        endpoints: {
          health: '/api/v1/health',
          info: '/api/v1/info',
          csrfToken: '/api/v1/csrf-token',
          auth: '/api/v1/auth',
        },
      },
    })
  })

  // Auth routes
  app.use('/api/v1/auth', authRoutes)

  // CSRF-protected write endpoints
  if (dbPool) {
    const contactCtrl = createContactController(dbPool)
    app.post('/api/v1/contact', contactCtrl.submitInquiry)

    // Organization registration (UC-08)
    const orgCtrl = createOrganizationsController(dbPool)
    app.post('/api/v1/organizations', orgCtrl.registerOrganization)

    // Application management (UC-09+)
    const appCtrl = createApplicationsController(dbPool)
    app.post('/api/v1/applications', appCtrl.startApplication)
    app.post('/api/v1/applications/:id/submit', appCtrl.submit)
    app.patch('/api/v1/applications/:id/type', appCtrl.selectType)
    app.patch('/api/v1/applications/:id', appCtrl.saveDraft)

    // Document write routes (UC-13) — multipart upload uses multer middleware
    const docCtrl = createDocumentsController(dbPool)
    app.post('/api/v1/applications/:id/documents', uploadMiddleware, docCtrl.upload)
    app.delete('/api/v1/applications/:id/documents/:docId', docCtrl.remove)

    // Message write routes (UC-19)
    const msgCtrl = createMessagesController(dbPool)
    app.post('/api/v1/applications/:id/messages', msgCtrl.send)

    // Admin write routes (UC-21, UC-22, UC-23, UC-25)
    const adminCtrl = createAdminController(dbPool)
    app.post('/api/v1/admin/applications/:id/notes', adminCtrl.addNote)
    app.post('/api/v1/admin/applications/:id/messages', adminCtrl.sendMessage)
    app.patch('/api/v1/admin/applications/:id/status', adminCtrl.updateStatus)
    app.post('/api/v1/admin/funded-shelters', adminCtrl.createShelter)
    app.patch('/api/v1/admin/funded-shelters/:id', adminCtrl.updateShelter)
  }

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const currentDir = path.dirname(fileURLToPath(import.meta.url))
    const webDistPath = path.resolve(currentDir, '../../web/dist')

    // Serve static assets
    app.use(express.static(webDistPath))

    // SPA fallback - serve index.html for all non-API routes
    // Note: Express 5 requires named wildcard parameters
    app.get('/{*splat}', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next()
      }
      res.sendFile(path.join(webDistPath, 'index.html'))
    })
  }

  // 404 handler (for API routes only in production)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Endpoint not found',
        code: 'NOT_FOUND',
      },
    })
  })

  // Global error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    // Log error securely without PII
    logError(err, req)

    res.status(500).json({
      success: false,
      error: {
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    })
  })

  return app
}
