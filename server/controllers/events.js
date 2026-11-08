import { pool } from '../config/database.js'

// the RSVP answer that counts as someone going to the event
const ATTENDING = 'attending'

// the query-string filters people can use, and the column each one checks
const FILTER_COLUMNS = {
    state: 'venues.state',
    city: 'venues.city',
    category: 'groups.category',
    group_id: 'events.group_id',
    venue_id: 'events.venue_id'
}

// events joined with their group, the group's organizer (the host), their venue and how many people are attending
const EVENTS_WITH_DETAILS = `
    SELECT events.*,
           groups.group_name,
           groups.category,
           users.user_id AS host_id,
           users.full_name AS host_name,
           users.user_image_url AS host_image_url,
           venues.venue_name,
           venues.address,
           venues.city,
           venues.state,
           venues.postal_code,
           venues.latitude,
           venues.longitude,
           COUNT(rsvps.rsvp_id) FILTER (WHERE rsvps.rsvp_status = $1)::int AS rsvp_count
    FROM events
    JOIN groups ON groups.group_id = events.group_id
    JOIN users ON users.user_id = groups.organizer_id
    JOIN venues ON venues.venue_id = events.venue_id
    LEFT JOIN rsvps ON rsvps.event_id = events.event_id`

// one row per event, even though each event can join many RSVPs
const ONE_ROW_PER_EVENT = ' GROUP BY events.event_id, groups.group_id, users.user_id, venues.venue_id'

const getEvents = async (req, res) => {
    try {
        // $1 is always the "attending" answer, so filter values start at $2
        const values = [ATTENDING]
        const conditions = []

        // add a condition for every filter that was sent in the query string
        for (const [name, column] of Object.entries(FILTER_COLUMNS)) {
            if (req.query[name]) {
                values.push(req.query[name])
                conditions.push(`${column} = $${values.length}`)
            }
        }

        const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
        const results = await pool.query(EVENTS_WITH_DETAILS + where + ONE_ROW_PER_EVENT + ' ORDER BY events.start_time ASC', values)
        res.status(200).json(results.rows)
    } catch (error) {
        console.error('Failed to fetch events:', error.code || error.message)
        res.status(500).json({ error: 'Unable to fetch events.' })
    }
}

const getEventById = async (req, res) => {
    try {
        const eventId = req.params.eventId
        const results = await pool.query(EVENTS_WITH_DETAILS + ' WHERE events.event_id = $2' + ONE_ROW_PER_EVENT, [ATTENDING, eventId])

        if (results.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' })
        }

        res.status(200).json(results.rows[0])
    } catch (error) {
        console.error('Failed to fetch event:', error.code || error.message)
        res.status(500).json({ error: 'Unable to fetch event.' })
    }
}

export default {
    getEvents,
    getEventById
}
