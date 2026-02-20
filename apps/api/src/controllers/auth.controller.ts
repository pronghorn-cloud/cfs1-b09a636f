/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication endpoints
 */

import type { Request, Response } from 'express'
import { authService } from '../services/auth.service.js'

export class AuthController {
  /**
   * GET /api/v1/auth/login
   * Initiate authentication flow
   */
  async login(req: Request, res: Response) {
    try {
      await authService.login(req, res)
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: 'Failed to initiate login',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * GET /api/v1/auth/callback
   * Handle authentication callback from IdP
   */
  async callback(req: Request, res: Response) {
    try {
      await authService.callback(req, res)

      // Explicitly save session before responding to ensure the cookie
      // is persisted (especially important with async stores like PostgreSQL)
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      // Use an HTML page with client-side redirect instead of a 302.
      // This ensures the browser fully processes the Set-Cookie header
      // before navigating — critical when behind the Vite dev proxy.
      const redirectUrl = process.env.WEB_URL || 'http://localhost:5173'
      const target = `${redirectUrl}/profile`
      res.setHeader('Content-Type', 'text/html')
      res.send(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${target}"></head>` +
        `<body><p>Redirecting...</p><script>window.location.replace("${target}")</script></body></html>`
      )
    } catch (error) {
      console.error('Callback error:', error)

      const redirectUrl = process.env.WEB_URL || 'http://localhost:5173'
      res.redirect(`${redirectUrl}/login?error=auth_failed`)
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logout and destroy session
   */
  async logout(req: Request, res: Response) {
    try {
      await authService.logout(req, res)

      res.json({
        success: true,
        message: 'Logged out successfully'
      })
    } catch (error) {
      console.error('Logout error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Failed to logout',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user
   */
  async me(req: Request, res: Response) {
    try {
      const user = authService.getCurrentUser(req)

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Not authenticated'
          }
        })
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles || [],
            attributes: user.attributes || {},
            organization: user.attributes?.organizationName || undefined
          }
        }
      })
    } catch (error) {
      console.error('Get user error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_ERROR',
          message: 'Failed to get user information'
        }
      })
    }
  }

  /**
   * POST /api/v1/auth/mock-login
   * Direct mock login — no redirect chain, returns JSON.
   * Only available when AUTH_DRIVER=mock.
   */
  async mockLogin(req: Request, res: Response) {
    try {
      const userIndex = parseInt(req.body?.userIndex ?? '0', 10)
      // Pass custom user data if provided in request body
      const customData = (req.body?.displayName || req.body?.email || req.body?.roles || req.body?.attributes)
        ? { displayName: req.body.displayName, email: req.body.email, roles: req.body.roles, attributes: req.body.attributes }
        : undefined
      const user = authService.mockLogin(req, userIndex, customData)

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'MOCK_UNAVAILABLE', message: 'Mock login not available' }
        })
      }

      // Ensure session is persisted before responding
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err)
          else resolve()
        })
      })

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles || [],
            attributes: user.attributes || {},
            organization: user.attributes?.organizationName || undefined
          }
        }
      })
    } catch (error) {
      console.error('Mock login error:', error)
      res.status(500).json({
        success: false,
        error: { code: 'LOGIN_ERROR', message: 'Failed to login' }
      })
    }
  }

  /**
   * GET /api/v1/auth/status
   * Check authentication status
   */
  async status(req: Request, res: Response) {
    const user = authService.getCurrentUser(req)

    res.json({
      success: true,
      data: {
        authenticated: !!user,
        driver: authService.getDriverPublic().getDriverName()
      }
    })
  }
}

export const authController = new AuthController()
