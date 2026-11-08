import { pool as defaultPool } from '../config/database.js'
import { sendDatabaseError, sendNotFound, sendValidationError } from '../utils/http.js'
import { createRulesLoader } from '../utils/schemaRules.js'
import { SETTING, requireSetting } from '../utils/settings.js'
import { isValidId } from '../utils/validators.js'

// the database and rules can be swapped out, so tests never need a real one
const createRsvpsController = ({ pool = defaultPool, loadRules = createRulesLoader(pool) } = {}) => {
    // run the steps in one transaction; each step finishes by returning the answer to send back
    const inTransaction = async (steps) => {
        const client = await pool.connect()
        try {
            await client.query('BEGIN')
            const reply = await steps(client)
            await client.query('COMMIT')
            return reply
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {})
            throw error
        } finally {
            client.release()
        }
    }

    // lock the event while its places are counted, so two people cannot take the last place together
    const lockEvent = (client, eventId) =>
        client.query('SELECT capacity, (start_time <= localtimestamp) AS started FROM events WHERE event_id = $1 FOR UPDATE', [eventId])

    // true when every place is already taken by people who are going
    const isFull = async (client, eventId, capacity, attendingStatus) => {
        const counted = await client.query('SELECT COUNT(*)::int AS attending FROM rsvps WHERE event_id = $1 AND rsvp_status = $2', [eventId, attendingStatus])
        return counted.rows[0].attending >= capacity
    }

    // check an answer against the words the database allows; returns a problem or null
    const checkStatus = async (status) => {
        const allowed = (await loadRules()).allowedWords['rsvps.rsvp_status'] ?? []
        return allowed.includes(status) ? null : { rsvp_status: `Answer must be one of: ${allowed.join(', ')}.` }
    }

    const createRsvp = async (req, res) => {
        try {
            const eventId = req.params.eventId
            if (!isValidId(eventId)) return sendNotFound(res, 'Event')

            // with no answer sent, the person is saying they are going
            const attendingStatus = requireSetting(SETTING.attendingStatus)
            const status = req.body?.rsvp_status ?? attendingStatus
            const problem = await checkStatus(status)
            if (problem) return sendValidationError(res, problem)

            const reply = await inTransaction(async (client) => {
                const event = await lockEvent(client, eventId)
                if (event.rows.length === 0) return { status: 404, body: { error: 'Event not found.' } }
                if (event.rows[0].started) return { status: 400, body: { error: 'This event has already started.' } }

                const existing = await client.query('SELECT 1 FROM rsvps WHERE user_id = $1 AND event_id = $2', [req.user.user_id, eventId])
                if (existing.rowCount > 0) return { status: 409, body: { error: 'You have already answered for this event.' } }

                if (status === attendingStatus && (await isFull(client, eventId, event.rows[0].capacity, attendingStatus))) {
                    return { status: 409, body: { error: 'This event is full.' } }
                }

                const created = await client.query(
                    'INSERT INTO rsvps (user_id, event_id, rsvp_status) VALUES ($1, $2, $3) RETURNING *',
                    [req.user.user_id, eventId, status]
                )
                return { status: 201, body: created.rows[0] }
            })

            res.status(reply.status).json(reply.body)
        } catch (error) {
            sendDatabaseError(res, 'save your answer', error)
        }
    }

    const updateRsvp = async (req, res) => {
        try {
            const eventId = req.params.eventId
            if (!isValidId(eventId)) return sendNotFound(res, 'Event')

            const status = req.body?.rsvp_status
            const problem = await checkStatus(status)
            if (problem) return sendValidationError(res, problem)

            const attendingStatus = requireSetting(SETTING.attendingStatus)

            const reply = await inTransaction(async (client) => {
                const event = await lockEvent(client, eventId)
                if (event.rows.length === 0) return { status: 404, body: { error: 'Event not found.' } }

                const existing = await client.query('SELECT rsvp_id, rsvp_status FROM rsvps WHERE user_id = $1 AND event_id = $2', [req.user.user_id, eventId])
                if (existing.rows.length === 0) return { status: 404, body: { error: 'You have not answered for this event yet.' } }

                // the same answer again changes nothing
                if (existing.rows[0].rsvp_status === status) return { status: 200, body: existing.rows[0] }

                if (event.rows[0].started) return { status: 400, body: { error: 'This event has already started.' } }

                if (status === attendingStatus && (await isFull(client, eventId, event.rows[0].capacity, attendingStatus))) {
                    return { status: 409, body: { error: 'This event is full.' } }
                }

                const updated = await client.query('UPDATE rsvps SET rsvp_status = $1 WHERE rsvp_id = $2 RETURNING *', [status, existing.rows[0].rsvp_id])
                return { status: 200, body: updated.rows[0] }
            })

            res.status(reply.status).json(reply.body)
        } catch (error) {
            sendDatabaseError(res, 'change your answer', error)
        }
    }

    const deleteRsvp = async (req, res) => {
        try {
            const eventId = req.params.eventId
            if (!isValidId(eventId)) return sendNotFound(res, 'Event')

            const removed = await pool.query('DELETE FROM rsvps WHERE user_id = $1 AND event_id = $2', [req.user.user_id, eventId])
            if (removed.rowCount === 0) return res.status(404).json({ error: 'You have not answered for this event.' })

            res.status(204).send()
        } catch (error) {
            sendDatabaseError(res, 'remove your answer', error)
        }
    }

    // the people who answered for an event, with the totals the organizer needs
    const getEventRsvps = async (req, res) => {
        try {
            const eventId = req.params.eventId
            if (!isValidId(eventId)) return sendNotFound(res, 'Event')

            const event = await pool.query('SELECT capacity FROM events WHERE event_id = $1', [eventId])
            if (event.rows.length === 0) return sendNotFound(res, 'Event')

            // answers joined with the people who gave them
            const results = await pool.query(
                `SELECT rsvps.rsvp_id, rsvps.rsvp_status, users.user_id, users.full_name, users.user_image_url
                 FROM rsvps
                 JOIN users ON users.user_id = rsvps.user_id
                 WHERE rsvps.event_id = $1
                 ORDER BY users.full_name ASC`,
                [eventId]
            )

            // how many people gave each answer
            const counts = {}
            for (const row of results.rows) counts[row.rsvp_status] = (counts[row.rsvp_status] ?? 0) + 1

            res.status(200).json({
                capacity: event.rows[0].capacity,
                attending: counts[requireSetting(SETTING.attendingStatus)] ?? 0,
                counts,
                rsvps: results.rows
            })
        } catch (error) {
            sendDatabaseError(res, 'fetch the answers', error)
        }
    }

    return { createRsvp, updateRsvp, deleteRsvp, getEventRsvps }
}

export { createRsvpsController }
export default createRsvpsController()
