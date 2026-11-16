import { sendServerError } from './http.js'
import { USER_TYPE } from '../domain/constants.js'

// a person counts as logged in only after they finished onboarding (new GitHub users have not yet)
const isLoggedIn = (req) => Boolean(req.user) && !req.user.isNewUser

// let the request through only if someone is logged in
const requireUser = (req, res, next) => {
    if (!isLoggedIn(req)) {
        // someone who signed in with GitHub but has not finished onboarding is told so, so the page can send them to finish it
        return res.status(401).json({ error: 'Please log in or sign up first.', needsOnboarding: Boolean(req.user?.isNewUser) })
    }
    next()
}

// let the request through only if the logged-in person is a host
const requireHost = (req, res, next) => {
    requireUser(req, res, () => {
        if (req.user.user_type !== USER_TYPE.HOST) {
            return res.status(403).json({ error: 'Only hosts can do this.' })
        }
        next()
    })
}

// findOrganizerId(req) looks up who organizes the thing in the request: it returns their user id, or null if the thing does not exist
const requireOrganizer = (findOrganizerId) => async (req, res, next) => {
    if (!isLoggedIn(req)) {
        return res.status(401).json({ error: 'Please log in or sign up first.' })
    }

    try {
        const organizerId = await findOrganizerId(req)

        if (organizerId === null || organizerId === undefined) {
            return res.status(404).json({ error: 'Not found.' })
        }

        // ids from Postgres can arrive as text, so compare them as text
        if (String(organizerId) !== String(req.user.user_id)) {
            return res.status(403).json({ error: 'Only the organizer can do this.' })
        }

        next()
    } catch (error) {
        sendServerError(res, 'check permissions', error)
    }
}

export { isLoggedIn, requireUser, requireHost, requireOrganizer }
