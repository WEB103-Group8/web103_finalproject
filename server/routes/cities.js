import express from 'express'
import CitiesController from '../controllers/cities.js'

// Create a new router instance
const router = express.Router()

// Define a route to get all the cities that have venues
router.get('/', CitiesController.getCities)

export default router
