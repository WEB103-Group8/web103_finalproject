import express from 'express'
import UsersController from '../controllers/users.js'

// Create a new router instance
const router = express.Router()

// Define a route to get all users
router.get('/', UsersController.getUsers)

// Define a route to get a specific user by their ID
router.get('/:userId', UsersController.getUserById)

export default router
