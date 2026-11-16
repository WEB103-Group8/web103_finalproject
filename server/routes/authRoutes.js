import express from 'express'
import passport from '../config/passport.js'
import { getMe, handleCallback, loginLocal, logout, registerLocal } from '../controllers/auth.js'

const router = express.Router()

router.post('/register', registerLocal)
router.post('/login', loginLocal)

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }))

router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: `${process.env.CLIENT_URL || 'https://client-f5ji.onrender.com'}/login`,
  }),
  handleCallback
)

router.get('/me', getMe)

router.get('/logout', logout)

export default router
