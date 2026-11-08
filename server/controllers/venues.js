import { pool as defaultPool } from '../config/database.js'
import defaultGeocode from '../utils/geocoder.js'
import { sendNotFound, sendServerError, sendValidationError } from '../utils/http.js'
import { createRulesLoader } from '../utils/schemaRules.js'
import { addSearchConditions } from '../utils/search.js'
import { isValidId, validateAddress, validateVenueInput } from '../utils/validators.js'

// the query-string filters people can use, and the column each one checks
const FILTER_COLUMNS = {
    state: 'venues.state',
    city: 'venues.city'
}

// the columns the search words are matched against
const SEARCH_COLUMNS = ['venues.venue_name', 'venues.address', 'venues.city']

// Postgres's error code for "that row already exists"
const UNIQUE_VIOLATION = '23505'

// answer a failed address lookup with the right message; returns false when the error was not a lookup problem
const sendLookupError = (res, error) => {
    if (error.code === 'ADDRESS_NOT_FOUND') {
        res.status(422).json({
            error: 'We could not find that address.',
            details: { address: "We couldn't find that address. Include street, city and state." }
        })
        return true
    }

    if (error.code === 'GEOCODER_UNAVAILABLE' || error.code === 'GEOCODER_NOT_CONFIGURED') {
        // a missing setting is our problem to fix, so it goes in the log
        if (error.code === 'GEOCODER_NOT_CONFIGURED') console.error('Address lookup is not set up:', error.message)
        res.status(503).json({ error: 'Address lookup is unavailable right now. Try again in a moment.' })
        return true
    }

    return false
}

// the database, address lookup and rules can be swapped out, so tests never need a real one
const createVenuesController = ({ pool = defaultPool, geocode = defaultGeocode, loadRules = createRulesLoader(pool) } = {}) => {
    const getVenues = async (req, res) => {
        try {
            const values = []
            const conditions = []

            // add a condition for every filter that was sent in the query string
            for (const [name, column] of Object.entries(FILTER_COLUMNS)) {
                if (req.query[name]) {
                    values.push(req.query[name])
                    conditions.push(`${column} = $${values.length}`)
                }
            }
            addSearchConditions(req.query.q, SEARCH_COLUMNS, values, conditions)

            const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
            const results = await pool.query(`SELECT venues.* FROM venues${where} ORDER BY venues.state ASC, venues.city ASC, venues.venue_name ASC`, values)
            res.status(200).json(results.rows)
        } catch (error) {
            sendServerError(res, 'fetch venues', error)
        }
    }

    const getVenueById = async (req, res) => {
        try {
            const venueId = req.params.venueId
            if (!isValidId(venueId)) return sendNotFound(res, 'Venue')

            const results = await pool.query('SELECT * FROM venues WHERE venue_id = $1', [venueId])
            if (results.rows.length === 0) return sendNotFound(res, 'Venue')

            res.status(200).json(results.rows[0])
        } catch (error) {
            sendServerError(res, 'fetch the venue', error)
        }
    }

    // find an address on the map without saving anything, so the host can check it first
    const lookupVenue = async (req, res) => {
        try {
            const rules = await loadRules()
            const body = req.body ?? {}

            const details = validateAddress(body.address, rules)
            if (Object.keys(details).length > 0) return sendValidationError(res, details)

            const address = body.address.trim()
            const place = await geocode(address)
            res.status(200).json({ address, ...place })
        } catch (error) {
            if (!sendLookupError(res, error)) sendServerError(res, 'look up the address', error)
        }
    }

    const createVenue = async (req, res) => {
        try {
            const rules = await loadRules()
            const body = req.body ?? {}

            const details = validateVenueInput(body, rules)
            if (Object.keys(details).length > 0) return sendValidationError(res, details)

            const venueName = body.venue_name.trim()
            const address = body.address.trim()

            // the city, state, ZIP and position always come from the lookup; anything the browser sent for them is ignored
            const place = await geocode(address)

            try {
                const created = await pool.query(
                    `INSERT INTO venues (venue_name, address, city, state, postal_code, latitude, longitude)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING *`,
                    [venueName, address, place.city, place.state, place.postal_code, place.latitude, place.longitude]
                )
                res.status(201).json(created.rows[0])
            } catch (error) {
                if (error.code !== UNIQUE_VIOLATION) throw error

                // the venue is already saved, so point the host at it
                const existing = await pool.query('SELECT venue_id FROM venues WHERE venue_name = $1 AND address = $2 AND city = $3', [venueName, address, place.city])
                res.status(409).json({ error: 'That venue already exists.', details: { venue_id: existing.rows[0]?.venue_id } })
            }
        } catch (error) {
            if (!sendLookupError(res, error)) sendServerError(res, 'create the venue', error)
        }
    }

    return { getVenues, getVenueById, lookupVenue, createVenue }
}

export { createVenuesController }
export default createVenuesController()
