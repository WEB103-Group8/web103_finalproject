import express from 'express'
import VenuesController from '../controllers/venues.js'
import { requireHost } from '../utils/access.js'

// Create a new router instance
const router = express.Router()

// Define a route to get all venues
router.get('/', VenuesController.getVenues)

// Define a route for a host to check an address on the map without saving it
router.post('/lookup', requireHost, VenuesController.lookupVenue)

// Define a route for a host to add a venue from its name and address
router.post('/', requireHost, VenuesController.createVenue)

// Define a route to get a specific venue by its ID
router.get('/:venueId', VenuesController.getVenueById)

export default router
