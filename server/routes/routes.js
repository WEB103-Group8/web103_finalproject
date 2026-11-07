import express from 'express'
import { completeOnboarding } from '../controllers/auth.js'

const router = express.Router()

router.post('/users/onboarding', completeOnboarding)

export default router
