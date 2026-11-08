import express from 'express'
import EventsController from '../controllers/events.js'

// Create a new router instance
const router = express.Router()

// Define a route to get all events
router.get('/', EventsController.getEvents)

// Define a route to get a specific event by its ID
router.get('/:eventId', EventsController.getEventById)

export default router
