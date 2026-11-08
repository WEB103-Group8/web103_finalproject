import express from 'express'
import RsvpsController from '../controllers/rsvps.js'

// Create a new router instance
const router = express.Router()

// Define a route to get RSVPs for a user or an event (sent as query filters)
router.get('/', RsvpsController.getRsvps)

export default router
