import { pool } from '../config/database.js'

// the RSVP answer that counts as someone going to the event
const ATTENDING = 'attending'

// the public details of a person (never the email, password or GitHub columns)
const PUBLIC_USER_COLUMNS = 'users.user_id, users.full_name, users.city, users.state, users.user_image_url, users.user_type'

// events joined with their group and venue
const EVENTS_WITH_GROUP_AND_VENUE = `
    SELECT events.*,
           groups.group_name,
           venues.venue_name,
           venues.city,
           venues.state
    FROM events
    JOIN groups ON groups.group_id = events.group_id
    JOIN venues ON venues.venue_id = events.venue_id`

const getUsers = async (req, res) => {
    try {
        const results = await pool.query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users ORDER BY users.user_id ASC`)
        res.status(200).json(results.rows)
    } catch (error) {
        console.error('Failed to fetch users:', error.code || error.message)
        res.status(500).json({ error: 'Unable to fetch users.' })
    }
}

const getUserById = async (req, res) => {
    try {
        const userId = req.params.userId
        const userResults = await pool.query(`SELECT ${PUBLIC_USER_COLUMNS} FROM users WHERE users.user_id = $1`, [userId])

        if (userResults.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' })
        }

        // the events in groups this person organizes, and the events they said they are attending
        const [organizedEvents, attendingEvents] = await Promise.all([
            pool.query(`${EVENTS_WITH_GROUP_AND_VENUE} WHERE groups.organizer_id = $1 ORDER BY events.start_time ASC`, [userId]),
            pool.query(
                `${EVENTS_WITH_GROUP_AND_VENUE}
                 JOIN rsvps ON rsvps.event_id = events.event_id
                 WHERE rsvps.user_id = $1 AND rsvps.rsvp_status = $2
                 ORDER BY events.start_time ASC`,
                [userId, ATTENDING]
            )
        ])

        res.status(200).json({
            ...userResults.rows[0],
            organized_events: organizedEvents.rows,
            attending_events: attendingEvents.rows
        })
    } catch (error) {
        console.error('Failed to fetch user:', error.code || error.message)
        res.status(500).json({ error: 'Unable to fetch user.' })
    }
}

export default {
    getUsers,
    getUserById
}
