import { pool as defaultPool } from '../config/database.js'
import { EVENTS_WITH_DETAILS, ONE_ROW_PER_EVENT } from '../utils/eventSql.js'
import { sendDatabaseError, sendValidationError } from '../utils/http.js'
import { SETTING, requireSetting } from '../utils/settings.js'
import { addTimezones } from '../utils/timezone.js'

// only events that have not started yet
const UPCOMING = 'events.start_time >= localtimestamp'

// the database can be swapped out, so tests never need a real one
const createFeedController = ({ pool = defaultPool } = {}) => {
    const getFeed = async (req, res) => {
        try {
            // the visitor can ask for fewer events in each list with ?limit=
            const limit = req.query.limit
            if (limit !== undefined && !/^\d+$/.test(String(limit))) {
                return sendValidationError(res, { limit: 'limit must be a whole number.' })
            }

            const attending = requireSetting(SETTING.attendingStatus)
            const { user_id: userId, city, state, user_type: userType } = req.user

            // $1 is the "going" answer and $2 is the visitor; anything extra starts at $3
            const findEvents = async ({ conditions, extra = [], order = ' ORDER BY events.start_time ASC' }) => {
                const values = [attending, userId, ...extra]

                let tail = ''
                if (limit !== undefined) {
                    values.push(limit)
                    tail = ` LIMIT $${values.length}`
                }

                const results = await pool.query(EVENTS_WITH_DETAILS + ` WHERE ${conditions.join(' AND ')}` + ONE_ROW_PER_EVENT + order + tail, values)
                return addTimezones(results.rows)
            }

            // events near the visitor: their city first, then the rest of their state (or just their city if the state is unknown)
            const nearVisitor = state
                ? { conditions: [UPCOMING, 'venues.state = $3'], extra: [state, city], order: ' ORDER BY (venues.city = $4) DESC, events.start_time ASC' }
                : { conditions: [UPCOMING, 'venues.city = $3'], extra: [city] }

            const lists = await Promise.all([
                // events of the groups the visitor has joined
                findEvents({ conditions: [UPCOMING, 'EXISTS (SELECT 1 FROM members WHERE members.group_id = events.group_id AND members.user_id = $2)'] }),
                findEvents(nearVisitor),
                // events the visitor said they are going to
                findEvents({ conditions: [UPCOMING, 'EXISTS (SELECT 1 FROM rsvps AS going WHERE going.event_id = events.event_id AND going.user_id = $2 AND going.rsvp_status = $1)'] })
            ])
            const feed = { byGroups: lists[0], byCity: lists[1], yourEvents: lists[2] }

            // hosts also get the events of the groups they organize
            if (userType === requireSetting(SETTING.hostUserType)) {
                feed.hosting = await findEvents({ conditions: ['groups.organizer_id = $2'] })
            }

            res.status(200).json(feed)
        } catch (error) {
            sendDatabaseError(res, 'fetch the feed', error)
        }
    }

    return { getFeed }
}

export { createFeedController }
export default createFeedController()
