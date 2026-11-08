import { pool } from '../config/database.js'

// the query-string filters people can use, and the column each one checks
const FILTER_COLUMNS = {
    user_id: 'rsvps.user_id',
    event_id: 'rsvps.event_id'
}

// RSVPs joined with the person, the event, the event's group and the event's venue
const RSVPS_WITH_DETAILS = `
    SELECT rsvps.*,
           users.full_name,
           events.event_title,
           events.start_time,
           events.end_time,
           groups.group_name,
           venues.venue_name,
           venues.city,
           venues.state
    FROM rsvps
    JOIN users ON users.user_id = rsvps.user_id
    JOIN events ON events.event_id = rsvps.event_id
    JOIN groups ON groups.group_id = events.group_id
    JOIN venues ON venues.venue_id = events.venue_id`

const getRsvps = async (req, res) => {
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

        // asking for every RSVP in the app is not allowed, so at least one filter is required
        if (conditions.length === 0) {
            return res.status(400).json({ error: `Provide one of: ${Object.keys(FILTER_COLUMNS).join(', ')}.` })
        }

        const results = await pool.query(`${RSVPS_WITH_DETAILS} WHERE ${conditions.join(' AND ')} ORDER BY events.start_time ASC`, values)
        res.status(200).json(results.rows)
    } catch (error) {
        console.error('Failed to fetch RSVPs:', error.code || error.message)
        res.status(500).json({ error: 'Unable to fetch RSVPs.' })
    }
}

export default {
    getRsvps
}
