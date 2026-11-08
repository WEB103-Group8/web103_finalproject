import express from 'express'
import UsersController from '../controllers/users.js'
import { requireUser } from '../utils/access.js'

// Create a new router instance
const router = express.Router()

// Define a route to get all users
router.get('/', UsersController.getUsers)

// Define routes for a logged-in person to see and edit their own profile (these come before the ID routes so "me" is not read as an ID)
router.get('/me', requireUser, UsersController.getMe)
router.patch('/me', requireUser, UsersController.updateMe)

// Define a route to get a specific user by their ID
router.get('/:userId', UsersController.getUserById)

// Define a route to get the events a user organizes or is going to
router.get('/:userId/events', UsersController.getUserEvents)

// Define a route to get the groups a user belongs to
router.get('/:userId/groups', UsersController.getUserGroups)

export default router
