import express from 'express'
import CategoriesController from '../controllers/categories.js'

// Create a new router instance
const router = express.Router()

// Define a route to get the group categories
router.get('/', CategoriesController.getCategories)

export default router
