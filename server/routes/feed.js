import express from 'express'
import FeedController from '../controllers/feed.js'
import { requireUser } from '../utils/access.js'

// Create a new router instance
const router = express.Router()

// Define a route for a logged-in person's own feed of events
router.get('/', requireUser, FeedController.getFeed)

export default router
