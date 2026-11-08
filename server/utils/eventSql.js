// events joined with their group, the group's organizer (the host), their venue, how many people are attending,
// and the logged-in visitor's own answer; $1 is the "going" answer and $2 is the visitor's id (or nothing)
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
           COUNT(rsvps.rsvp_id) FILTER (WHERE rsvps.rsvp_status = $1)::int AS rsvp_count,
           (SELECT mine.rsvp_status FROM rsvps AS mine WHERE mine.event_id = events.event_id AND mine.user_id = $2) AS my_rsvp
    FROM events
    JOIN groups ON groups.group_id = events.group_id
    JOIN users ON users.user_id = groups.organizer_id
    JOIN venues ON venues.venue_id = events.venue_id
    LEFT JOIN rsvps ON rsvps.event_id = events.event_id`

// one row per event, even though each event can join many RSVPs
const ONE_ROW_PER_EVENT = ' GROUP BY events.event_id, groups.group_id, users.user_id, venues.venue_id'

// the small version for the map: just what a pin needs; $1 is the "going" answer
const EVENT_PINS = `
    SELECT events.event_id,
           events.event_title,
           events.start_time,
           groups.category,
           venues.latitude,
           venues.longitude,
           COUNT(rsvps.rsvp_id) FILTER (WHERE rsvps.rsvp_status = $1)::int AS rsvp_count
    FROM events
    JOIN groups ON groups.group_id = events.group_id
    JOIN venues ON venues.venue_id = events.venue_id
    LEFT JOIN rsvps ON rsvps.event_id = events.event_id`

// one row per pin
const ONE_ROW_PER_PIN = ' GROUP BY events.event_id, groups.group_id, venues.venue_id'

export { EVENTS_WITH_DETAILS, ONE_ROW_PER_EVENT, EVENT_PINS, ONE_ROW_PER_PIN }
