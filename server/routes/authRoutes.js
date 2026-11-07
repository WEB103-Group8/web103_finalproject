import express from 'express'
import passport from '../config/passport.js'
import { getMe, handleCallback, logout } from '../controllers/auth.js'

const router = express.Router()

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }))

router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
  }),
  handleCallback
)

router.get('/me', getMe)

router.get('/logout', logout)

export default router
