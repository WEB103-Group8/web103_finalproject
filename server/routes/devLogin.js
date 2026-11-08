import express from 'express'
import DevLoginController from '../controllers/devLogin.js'

// TEMPORARY: only mounted when DEV_LOGIN=true, so it can never be reached on the live site
const router = express.Router()

// Define a route to list seeded people to log in as
router.get('/users', DevLoginController.getTestUsers)

// Define a route to log in as one of them
router.post('/login', DevLoginController.loginAs)

export default router
