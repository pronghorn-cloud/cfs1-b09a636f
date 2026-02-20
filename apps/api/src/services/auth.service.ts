/**
 * Authentication Service
 *
 * Business logic for authentication operations.
 * Uses lazy initialization to ensure environment variables are loaded
 * before the auth driver is constructed (ESM import order issue).
 */

import {
  BaseAuthDriver,
  MockAuthDriver,
  SamlAuthDriver,
  EntraIdAuthDriver,
  type AuthUser
} from '@template/auth'
import type { Request, Response } from 'express'

export class AuthService {
  private driver: BaseAuthDriver | null = null

  /**
   * Construct the auth callback URL from environment variables
   * Priority: AUTH_CALLBACK_URL > API_URL > RENDER_EXTERNAL_URL > HOST/PORT derivation
   */
  private static getCallbackUrl(): string {
    // 1. If explicitly set, use it
    if (process.env.AUTH_CALLBACK_URL) {
      return process.env.AUTH_CALLBACK_URL
    }

    // 2. If API_URL is set, derive from it
    if (process.env.API_URL) {
      const apiUrl = process.env.API_URL.replace(/\/$/, '') // Remove trailing slash
      return `${apiUrl}/api/v1/auth/callback`
    }

    // 3. Render.com provides RENDER_EXTERNAL_URL automatically
    if (process.env.RENDER_EXTERNAL_URL) {
      const renderUrl = process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')
      return `${renderUrl}/api/v1/auth/callback`
    }

    // 4. Render.com also provides just the hostname
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
      return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/api/v1/auth/callback`
    }

    // 5. Derive from HOST and PORT (local development fallback)
    const host = process.env.HOST || 'localhost'
    const port = process.env.PORT || '3000'
    const isProduction = process.env.NODE_ENV === 'production'

    // Use HTTPS in production, HTTP otherwise
    const protocol = isProduction ? 'https' : 'http'

    // In production behind a proxy, don't include port (use standard 443/80)
    // For local development, include the port
    const hostWithPort = isProduction && (host !== 'localhost' && host !== '127.0.0.1')
      ? host
      : `${host}:${port}`

    return `${protocol}://${hostWithPort}/api/v1/auth/callback`
  }

  /**
   * Lazy-initialize the auth driver on first use.
   * This ensures dotenv has loaded env vars before driver construction.
   */
  private getDriver(): BaseAuthDriver {
    if (this.driver) return this.driver

    const authDriver = process.env.AUTH_DRIVER || 'mock'
    const callbackUrl = AuthService.getCallbackUrl()

    switch (authDriver) {
      case 'mock':
        this.driver = new MockAuthDriver({
          callbackUrl,
          mockUsers: [
            {
              id: 'mock-applicant-1',
              email: 'jdoe@safehaven.org',
              name: 'Jane Doe',
              roles: ['applicant'],
              attributes: {
                myAlbertaId: 'MA-ORG-10001',
                organizationName: 'Safe Haven Women\'s Shelter',
                verificationStatus: 'Verified'
              }
            },
            {
              id: 'mock-applicant-new',
              email: 'mchen@newstart.org',
              name: 'Maria Chen',
              roles: ['applicant'],
              attributes: {
                myAlbertaId: 'MA-ORG-10099',
                organizationName: 'New Start Shelter Society',
                verificationStatus: 'Verified'
              }
            },
            {
              id: 'mock-cfs-admin',
              email: 'admin.cfs@gov.ab.ca',
              name: 'Sarah Thompson',
              roles: ['cfs_admin'],
              attributes: {
                department: 'Children and Family Services',
                employeeId: 'GOA-CFS-001'
              }
            }
          ]
        })
        break

      case 'saml':
        this.driver = new SamlAuthDriver({
          callbackUrl
        })
        break

      case 'entra-id':
        this.driver = new EntraIdAuthDriver({
          callbackUrl
        })
        break

      default:
        throw new Error(`Unsupported auth driver: ${authDriver}. Valid options: mock, saml, entra-id`)
    }

    return this.driver
  }

  /**
   * Get the driver (public accessor for status endpoint)
   */
  getDriverPublic(): BaseAuthDriver {
    return this.getDriver()
  }

  /**
   * Initiate login
   */
  async login(req: Request, res: Response): Promise<void> {
    return this.getDriver().login(req, res)
  }

  /**
   * Handle auth callback
   */
  async callback(req: Request, res: Response): Promise<AuthUser> {
    return this.getDriver().callback(req, res)
  }

  /**
   * Perform logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    return this.getDriver().logout(req, res)
  }

  /**
   * Get current user
   */
  getCurrentUser(req: Request): AuthUser | null {
    return this.getDriver().getUser(req)
  }

  /**
   * Check if user has role
   */
  hasRole(req: Request, role: string | string[]): boolean {
    const user = this.getCurrentUser(req)
    return this.getDriver().hasRole(user, role)
  }

  /**
   * Mock login - directly authenticate a user by index (no redirect chain).
   * Only works when AUTH_DRIVER=mock.
   * If customData is provided, overrides the base mock user fields.
   */
  mockLogin(req: Request, userIndex: number, customData?: {
    displayName?: string
    email?: string
    roles?: string[]
    attributes?: Record<string, any>
  }): AuthUser | null {
    const driver = this.getDriver()
    if (driver.getDriverName() !== 'mock') return null

    const mockDriver = driver as MockAuthDriver
    const users = mockDriver.getMockUsers()
    const baseUser = users[userIndex] || users[0]
    if (!baseUser) return null

    // If custom data is provided, override the base mock user
    const user: AuthUser = customData?.displayName || customData?.email || customData?.roles || customData?.attributes
      ? {
          id: customData.attributes?.myAlbertaId || baseUser.id,
          email: customData.email || baseUser.email,
          name: customData.displayName || baseUser.name,
          roles: customData.roles || baseUser.roles,
          attributes: { ...baseUser.attributes, ...customData.attributes }
        }
      : baseUser

    // Save to session directly (same as what callback does)
    ;(req.session as any).user = user
    return user
  }
}

// Singleton instance
export const authService = new AuthService()
