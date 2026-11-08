import { pool as defaultPool } from '../config/database.js'
import { isLoggedIn } from '../utils/access.js'
import { EVENTS_WITH_DETAILS, EVENT_PINS, ONE_ROW_PER_EVENT, ONE_ROW_PER_PIN } from '../utils/eventSql.js'
import { sendDatabaseError, sendNotFound, sendValidationError } from '../utils/http.js'
import { createRulesLoader } from '../utils/schemaRules.js'
import { addSearchConditions } from '../utils/search.js'
import { addTimezone, addTimezones } from '../utils/timezone.js'
import { SETTING, requireSetting } from '../utils/settings.js'
import { buildSchedule, isValidId, validateEventInput } from '../utils/validators.js'

// the query-string filters people can use, and the column each one checks
const FILTER_COLUMNS = {
    state: 'venues.state',
    city: 'venues.city',
    zipcode: 'venues.postal_code',
    category: 'groups.category',
    group_id: 'events.group_id',
    venue_id: 'events.venue_id'
}

// the filters that compare words, so "austin" finds "Austin"
const TEXT_FILTERS = new Set(['state', 'city', 'zipcode', 'category'])

// the columns the search words are matched against
const SEARCH_COLUMNS = ['events.event_title', 'events.description', 'groups.group_name', 'venues.venue_name', 'venues.city']

// the event fields that are saved as they are (the date, time and duration are saved as start and end times)
const DIRECT_FIELDS = ['group_id', 'venue_id', 'meeting_link', 'event_title', 'description', 'capacity', 'event_image_url']

// add the conditions for every filter, search word and date that was sent in the query string
const addEventFilters = (query, values, conditions) => {
    for (const [name, column] of Object.entries(FILTER_COLUMNS)) {
        if (query[name]) {
            values.push(query[name])
            conditions.push(TEXT_FILTERS.has(name) ? `LOWER(${column}) = LOWER($${values.length})` : `${column} = $${values.length}`)
        }
    }
    addSearchConditions(query.q, SEARCH_COLUMNS, values, conditions)

    // events from a date on, up to the end of a date, or only the ones still to come
    if (query.from) {
        values.push(query.from)
        conditions.push(`events.start_time >= $${values.length}`)
    }
    if (query.to) {
        values.push(query.to)
        conditions.push(`events.start_time < ($${values.length}::date + 1)`)
    }
    if (query.upcoming === 'true') conditions.push('events.start_time >= localtimestamp')
}

// the database, rules and clock can be swapped out, so tests never need a real one
const createEventsController = ({ pool = defaultPool, loadRules = createRulesLoader(pool), now = Date.now } = {}) => {
    // the id of the logged-in visitor, or nothing for anonymous visitors
    const visitorId = (req) => (isLoggedIn(req) ? req.user.user_id : null)

    // find one event with all its joined details
    const findEvent = async (req, eventId) => {
        const results = await pool.query(EVENTS_WITH_DETAILS + ' WHERE events.event_id = $3' + ONE_ROW_PER_EVENT, [
            requireSetting(SETTING.attendingStatus),
            visitorId(req),
            eventId
        ])
        return results.rows[0] && addTimezone(results.rows[0])
    }

    // check that a group exists and belongs to the visitor; returns a problem or null
    const checkGroup = async (groupId, userId) => {
        const group = await pool.query('SELECT organizer_id FROM groups WHERE group_id = $1', [groupId])
        if (group.rows.length === 0) return { status: 400, message: 'Group not found.' }
        if (String(group.rows[0].organizer_id) !== String(userId)) return { status: 403, message: 'You can only use groups you organize.' }
        return null
    }

    // check that a venue exists; returns a problem or null
    const checkVenue = async (venueId) => {
        const venue = await pool.query('SELECT venue_id FROM venues WHERE venue_id = $1', [venueId])
        return venue.rows.length === 0 ? { status: 400, message: 'Venue not found.' } : null
    }

    // answer with the right status for a group or venue problem
    const sendReferenceProblem = (res, field, problem) =>
        problem.status === 403 ? res.status(403).json({ error: problem.message }) : sendValidationError(res, { [field]: problem.message })

    const getEvents = async (req, res) => {
        try {
            // $1 is the answer that counts as going (named in the settings) and $2 is the visitor, so filters start at $3
            const values = [requireSetting(SETTING.attendingStatus), visitorId(req)]
            const conditions = []
            addEventFilters(req.query, values, conditions)

            // paging is optional, and when it is used both numbers must be whole numbers
            const paging = {}
            for (const name of ['limit', 'offset']) {
                if (req.query[name] === undefined) continue
                if (!/^\d+$/.test(String(req.query[name]))) {
                    return sendValidationError(res, { [name]: `${name} must be a whole number.` })
                }
                paging[name] = req.query[name]
            }

            const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
            const order = req.query.sort === 'newest' ? ' ORDER BY events.event_id DESC' : ' ORDER BY events.start_time ASC'
            let tail = ''
            for (const [name, value] of Object.entries(paging)) {
                values.push(value)
                tail += ` ${name.toUpperCase()} $${values.length}`
            }

            const results = await pool.query(EVENTS_WITH_DETAILS + where + ONE_ROW_PER_EVENT + order + tail, values)
            res.status(200).json(addTimezones(results.rows))
        } catch (error) {
            sendDatabaseError(res, 'fetch events', error)
        }
    }

    // one small record per event for the map, filtered the same way as the list
    const getEventPins = async (req, res) => {
        try {
            const values = [requireSetting(SETTING.attendingStatus)]
            const conditions = []
            addEventFilters(req.query, values, conditions)

            const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''
            const results = await pool.query(EVENT_PINS + where + ONE_ROW_PER_PIN + ' ORDER BY events.start_time ASC', values)
            res.status(200).json(addTimezones(results.rows))
        } catch (error) {
            sendDatabaseError(res, 'fetch the map pins', error)
        }
    }

    const getEventById = async (req, res) => {
        try {
            const eventId = req.params.eventId
            if (!isValidId(eventId)) return sendNotFound(res, 'Event')

            const event = await findEvent(req, eventId)
            if (!event) return sendNotFound(res, 'Event')

            res.status(200).json(event)
        } catch (error) {
            sendDatabaseError(res, 'fetch the event', error)
        }
    }

    const createEvent = async (req, res) => {
        try {
            const rules = await loadRules()
            const body = req.body ?? {}

            // check every field, then check the date and time together
            const details = validateEventInput(body, rules)
            let schedule
            if (Object.keys(details).length === 0) {
                schedule = buildSchedule(body, now())
                if (!schedule) details.duration_minutes = 'That duration is too long.'
                else if (!schedule.startsInFuture) details.date = 'The event must start in the future.'
            }
            if (Object.keys(details).length > 0) return sendValidationError(res, details)

            // the group must be one the host organizes, and the venue must exist
            const groupProblem = await checkGroup(body.group_id, req.user.user_id)
            if (groupProblem) return sendReferenceProblem(res, 'group_id', groupProblem)
            // an online event has no venue, only a meeting link
            const isOnline = body.venue_id === undefined || body.venue_id === null || body.venue_id === ''
            if (!isOnline) {
                const venueProblem = await checkVenue(body.venue_id)
                if (venueProblem) return sendReferenceProblem(res, 'venue_id', venueProblem)
            }

            const created = await pool.query(
                `INSERT INTO events (group_id, venue_id, meeting_link, event_title, description, start_time, end_time, capacity, event_image_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING event_id`,
                [
                    body.group_id,
                    isOnline ? null : body.venue_id,
                    isOnline ? body.meeting_link.trim() : null,
                    body.event_title.trim(),
                    body.description.trim(),
                    schedule.start_time,
                    schedule.end_time,
                    body.capacity,
                    body.event_image_url?.trim() || null
                ]
            )

            res.status(201).json(await findEvent(req, created.rows[0].event_id))
        } catch (error) {
            sendDatabaseError(res, 'create the event', error)
        }
    }

    const updateEvent = async (req, res) => {
        try {
            const eventId = req.params.eventId
            const rules = await loadRules()
            const body = req.body ?? {}

            const details = validateEventInput(body, rules, { partial: true })
            if (Object.keys(details).length > 0) return sendValidationError(res, details)

            // the current date, time and length, so a change to one of them keeps the others
            const current = await pool.query(
                `SELECT to_char(start_time, 'YYYY-MM-DD') AS date,
                        to_char(start_time, 'HH24:MI') AS time,
                        (EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::int AS duration_minutes,
                        group_id, venue_id, meeting_link
                 FROM events WHERE event_id = $1`,
                [eventId]
            )
            if (current.rows.length === 0) return sendNotFound(res, 'Event')
            const existing = current.rows[0]

            // the columns to change, starting with the fields that are saved as they are
            const changes = {}
            for (const field of DIRECT_FIELDS) {
                if (body[field] === undefined) continue
                const value = typeof body[field] === 'string' ? body[field].trim() : body[field]
                changes[field] = (field === 'event_image_url' || field === 'meeting_link') && value === '' ? null : value
            }

            // a new date, time or length changes both start and end; only a new date or time must be in the future
            if (['date', 'time', 'duration_minutes'].some((field) => body[field] !== undefined)) {
                const schedule = buildSchedule({ ...existing, ...body }, now())
                if (!schedule) return sendValidationError(res, { duration_minutes: 'That duration is too long.' })
                if ((body.date !== undefined || body.time !== undefined) && !schedule.startsInFuture) {
                    return sendValidationError(res, { date: 'The event must start in the future.' })
                }
                changes.start_time = schedule.start_time
                changes.end_time = schedule.end_time
            }

            // moving to another group is allowed only to a group the host organizes
            if (body.group_id !== undefined && String(body.group_id) !== String(existing.group_id)) {
                const groupProblem = await checkGroup(body.group_id, req.user.user_id)
                if (groupProblem) return sendReferenceProblem(res, 'group_id', groupProblem)
            }
            // the venue must exist, and after the change the event must be either at a venue or online (a meeting link), not both
            if (body.venue_id !== undefined && body.venue_id !== null) {
                const venueProblem = await checkVenue(body.venue_id)
                if (venueProblem) return sendReferenceProblem(res, 'venue_id', venueProblem)
            }
            const venueAfter = body.venue_id !== undefined ? body.venue_id : existing.venue_id
            const linkAfter = body.meeting_link !== undefined ? changes.meeting_link : existing.meeting_link
            if (!venueAfter && !linkAfter) return sendValidationError(res, { venue_id: 'Choose a venue or enter a meeting link.' })
            if (venueAfter && linkAfter) return sendValidationError(res, { meeting_link: 'Choose a venue or enter a meeting link, not both.' })

            // the capacity may not drop below the number of people who already said they are going
            if (body.capacity !== undefined) {
                const attending = await pool.query(
                    'SELECT COUNT(*)::int AS attending FROM rsvps WHERE event_id = $1 AND rsvp_status = $2',
                    [eventId, requireSetting(SETTING.attendingStatus)]
                )
                const count = attending.rows[0].attending
                if (Number(body.capacity) < count) {
                    return sendValidationError(res, { capacity: `Capacity cannot be lower than the ${count} people already attending.` })
                }
            }

            // the column names come from the fixed lists above, never from what the visitor typed
            const assignments = Object.keys(changes).map((column, index) => `${column} = $${index + 1}`)
            const values = [...Object.values(changes), eventId]
            await pool.query(`UPDATE events SET ${assignments.join(', ')} WHERE event_id = $${values.length}`, values)

            res.status(200).json(await findEvent(req, eventId))
        } catch (error) {
            sendDatabaseError(res, 'update the event', error)
        }
    }

    const deleteEvent = async (req, res) => {
        try {
            const results = await pool.query('DELETE FROM events WHERE event_id = $1', [req.params.eventId])
            if (results.rowCount === 0) return sendNotFound(res, 'Event')

            res.status(204).send()
        } catch (error) {
            sendDatabaseError(res, 'delete the event', error)
        }
    }

    // tells the access check who organizes the event in the request (through its group), or null if there is no such event
    const getEventOrganizerId = async (req) => {
        if (!isValidId(req.params.eventId)) return null

        const results = await pool.query(
            `SELECT groups.organizer_id
             FROM events
             JOIN groups ON groups.group_id = events.group_id
             WHERE events.event_id = $1`,
            [req.params.eventId]
        )
        return results.rows[0]?.organizer_id ?? null
    }

    return { getEvents, getEventPins, getEventById, createEvent, updateEvent, deleteEvent, getEventOrganizerId }
}

export { createEventsController }
export default createEventsController()
