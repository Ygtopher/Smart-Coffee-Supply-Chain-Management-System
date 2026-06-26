import { Router } from 'express';
import {
  login, register, verifyMfa, resendMfaCode, forgotPassword, resetPassword, searchCooperatives, getPublicWashingStations,
  getCurrentUser, updateCurrentUser, updateCurrentUserMfa, createAccessRequest, getMyAccessRequests
} from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';
import { createRateLimit } from '../middlewares/rateLimitMiddleware';

const router = Router();
const authenticationLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many authentication attempts. Please try again later.',
});
const passwordResetLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many password-reset requests. Please try again later.',
});

// POST /api/auth/login
router.post('/login', authenticationLimit, login);

// POST /api/auth/register
router.post('/register', register);

// GET /api/auth/cooperatives?q=...
router.get('/cooperatives', searchCooperatives);

// GET /api/auth/washing-stations
router.get('/washing-stations', getPublicWashingStations);

// Current user settings
router.get('/me', authenticate, getCurrentUser);
router.patch('/me', authenticate, updateCurrentUser);
router.patch('/me/mfa', authenticate, updateCurrentUserMfa);
router.get('/me/access-requests', authenticate, getMyAccessRequests);
router.post('/me/access-requests', authenticate, createAccessRequest);

// POST /api/auth/mfa/verify
router.post('/mfa/verify', authenticationLimit, verifyMfa);
router.post('/mfa/resend', authenticationLimit, resendMfaCode);

// POST /api/auth/forgot-password
router.post('/forgot-password', passwordResetLimit, forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

export default router;
