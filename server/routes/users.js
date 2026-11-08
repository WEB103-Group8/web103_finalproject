import express from 'express'
import UsersController from '../controllers/users.js'
import { requireUser } from '../utils/access.js'

// Create a new router instance
const router = express.Router()

// Define a route to get all users
router.get('/', UsersController.getUsers)

// Define a route for a logged-in person to edit their own profile (this comes before the ID routes so "me" is not read as an ID)
router.patch('/me', requireUser, UsersController.updateMe)

// Define a route to get a specific user by their ID
router.get('/:userId', UsersController.getUserById)

// Define a route to get the events a user organizes or is going to
router.get('/:userId/events', UsersController.getUserEvents)

export default router
