/**
 * Authentication Routes
 *
 * Defines all authentication-related endpoints with rate limiting for security
 */

import express from 'express'
import { authController } from '../controllers/auth.controller.js'
import { createAuthRateLimiter } from '../middleware/rate-limit.middleware.js'

const router = express.Router()

// Create auth rate limiter at route registration time (after dotenv loads)
const authRateLimiter = createAuthRateLimiter()

/**
 * @route   GET /api/v1/auth/login
 * @desc    Initiate authentication flow
 * @access  Public
 * @rateLimit Configurable via AUTH_RATE_LIMIT_MAX (default 5 per 15 min)
 */
router.get('/login', authRateLimiter, (req, res) => authController.login(req, res))

/**
 * @route   GET /api/v1/auth/callback
 * @desc    Handle authentication callback from IdP
 * @access  Public
 * @rateLimit Configurable via AUTH_RATE_LIMIT_MAX (default 5 per 15 min)
 */
router.get('/callback', authRateLimiter, (req, res) => authController.callback(req, res))

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout and destroy session
 * @access  Private
 */
router.post('/logout', (req, res) => authController.logout(req, res))

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', (req, res) => authController.me(req, res))

/**
 * @route   GET /api/v1/auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', (req, res) => authController.status(req, res))

export default router
