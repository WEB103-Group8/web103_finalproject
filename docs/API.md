# Orbit API

Everything below is served by the Express server in `server/`. All requests and answers are JSON. The examples were captured from the running API (using the seeded data), so the shapes match what the server really returns. Long lists show only their first item, and long text is shortened with `…`.

- [Conventions](#conventions)
- [Who can do what](#who-can-do-what)
- [Status](#status)
- [Users](#users)
- [Groups](#groups)
- [Venues](#venues) (and [how addresses are looked up](#venue-lookup-and-geocoding))
- [Events](#events)
- [RSVPs](#rsvps)
- [Map pins, answers, feed, cities and categories](#map-pins-rsvp-answers-feed-cities-and-categories)
- [Login routes](#login-routes)

## Conventions

**Base address.** `http://localhost:3000` while developing. The React app in `client/` reaches the API through the Vite proxy (`/api` and `/auth`), so the browser always talks to its own address.

**Logging in.** Orbit uses the GitHub login (Passport session cookie). The `curl` examples for logged-in routes send that cookie with `-b cookies.txt`; save the cookie from a logged-in browser session into that file first.

**Success codes.** `200` read or update, `201` created, `204` deleted (no body).

**Error answers.** Every error is `{ "error": "message" }`. Validation errors add `details`, one reason per field:

```json
{ "error": "Please fix the highlighted fields.", "details": { "limit": "limit must be a whole number." } }
```

| Status | Meaning |
|---|---|
| 400 | A value is missing or not valid (`details` says which). |
| 401 | Not logged in. The answer also has `needsOnboarding`, which is `true` for a GitHub person who has not finished signing up. |
| 403 | Logged in, but not allowed (for example an attendee creating a group). |
| 404 | The thing does not exist, or its id is not a number. |
| 409 | A conflict: already joined, already answered, venue already exists, or the event is full. |
| 422 | An address could not be located. |
| 500 | Something unexpected went wrong. The real problem is only written to the server log. |
| 503 | The address-lookup service is unavailable or not set up. |

**Access levels** used in the tables:
- **public**: anyone, even without logging in.
- **user**: logged in and finished signing up.
- **host**: a user whose type is the host type.
- **organizer**: the host who organizes that group (or the group an event belongs to).
- **self**: the logged-in person, about themselves.

**Times.** Event times are the venue's local clock time as plain text with no time zone, such as `2026-11-14T18:30:00`, shown exactly as stored. Each event (and map pin) also has a `timezone` field, such as `America/Chicago`, so a page can show the zone and count down to the exact moment. Membership times (`joined_at`) are full UTC timestamps.

**Privacy.** No answer ever contains a password. A person's email, country and ZIP code are only returned to that person.

**Settings.** The server reads these from `server/.env`. Nothing that names a role, an answer or an outside service is typed in the code:

| Variable | Meaning |
|---|---|
| `HOST_USER_TYPE` | the user type that means "host" |
| `ATTENDING_RSVP_STATUS` | the RSVP answer that means "going" |
| `GEOCODER_URL`, `GEOCODER_USER_AGENT`, `GEOCODER_COUNTRY_CODE`, `GEOCODER_TIMEOUT_MS`, `GEOCODER_MIN_GAP_MS` | the address-lookup service |

The text-length limits and the allowed RSVP answers and user types are read from the database's own rules, not typed in the code.

## Who can do what

| Capability | Anonymous | Attendee | Host |
|---|:-:|:-:|:-:|
| Read groups, venues, events, pins, cities, categories, public profiles | yes | yes | yes |
| Join or leave a group, answer an event, edit your own profile | 401 | yes | yes |
| Create, edit or delete a group | 401 | 403 | own groups only |
| Create, edit or delete an event | 401 | 403 | events of own groups only |
| Create a venue or look up an address | 401 | 403 | yes |
| See who answered for an event | 401 | 403 | own events only |

## Status

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | public | Names the API and lists its main addresses. |
| GET | `/health` | public | Checks the database connection. |

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok", "database": "connected" }
```

## Users

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/users` | public | Every person's public details. |
| GET | `/api/users/me` | self | Your own profile, with `is_host`. |
| PATCH | `/api/users/me` | self | Change your own profile. |
| GET | `/api/users/:id` | public | One person's profile. |
| GET | `/api/users/:id/events` | public | Events a person hosts or goes to. |
| GET | `/api/users/:id/groups` | public | Groups a person belongs to. |

`GET /api/users/me` comes before `/:id`, so `me` is never read as an id.

### GET /api/users/:id

Public details: `user_id`, `full_name`, `city`, `state`, `user_image_url`, `user_type`. When the person asks about themself the answer also has `email`, `country` and `zipcode`. Errors: `404`.

```bash
curl http://localhost:3000/api/users/1
```

```json
{
  "user_id": 1,
  "full_name": "Taylor Adams",
  "city": "Birmingham",
  "state": "AL",
  "user_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&crop=faces&q=80",
  "user_type": "host"
}
```

### GET /api/users

The same public details for every person, ordered by id.

### GET /api/users/me

Your own details plus `is_host`, which the server works out from the `HOST_USER_TYPE` setting so pages know which buttons to show. Errors: `401` (with `needsOnboarding`).

```bash
curl -b cookies.txt http://localhost:3000/api/users/me
```

```json
{
  "user_id": 1,
  "full_name": "Taylor Adams",
  "city": "Birmingham",
  "state": "AL",
  "user_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&crop=faces&q=80",
  "user_type": "host",
  "email": "host1.birmingham-al@example.test",
  "country": "United States",
  "zipcode": "35203",
  "is_host": true
}
```

Without a login:

```json
{ "error": "Please log in or sign up first.", "needsOnboarding": false }
```

### PATCH /api/users/me

Body: any of `full_name`, `city`, `state`, `country`, `zipcode`, `user_image_url`. Any other field (including `user_type`, `email` and `password_hash`) is refused, so nobody can change their own role or email.

| Field | Rule |
|---|---|
| `full_name`, `city` | text, cannot be emptied |
| `state` | must be a state that has venues on Orbit; an empty value clears it |
| `zipcode` | five digits, optionally followed by a dash and four more; an empty value clears it |
| `country`, `user_image_url` | `user_image_url` must be a web address (http or https); empty values clear them |

Returns `200` with the updated profile, including your email, country and ZIP code. Errors: `400`, `401`.

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/users/me \
  -H "Content-Type: application/json" \
  -d '{"city":"Austin","state":"TX","zipcode":"78701","country":"USA"}'
```

```json
{
  "user_id": 3,
  "full_name": "Sage Young",
  "city": "Austin",
  "state": "TX",
  "user_image_url": "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=faces&q=80",
  "user_type": "attendee",
  "email": "attendee2.birmingham-al@example.test",
  "country": "USA",
  "zipcode": "78701"
}
```

Trying to change the role:

```json
{ "error": "Please fix the highlighted fields.", "details": { "user_type": "This field cannot be changed." } }
```

### GET /api/users/:id/events

Query: `role=created` (events in groups the person organizes) or `role=attending` (events they said they are going to). With no `role` both are returned. Each item is an [event](#the-event-object) plus a `role` (`created` or `attending`), ordered by start time. Errors: `400` (unknown role), `404`.

```bash
curl "http://localhost:3000/api/users/1/events?role=created"
```

```json
[
  {
    "event_id": 2,
    "group_id": 2,
    "venue_id": 2,
    "event_title": "Open Studio Evening",
    "start_time": "2026-12-19T09:00:00",
    "end_time": "2026-12-19T11:00:00",
    "capacity": 95,
    "rsvp_count": 4,
    "my_rsvp": null,
    "is_attending": false,
    "role": "created"
  }
]
```

(Only some fields of the event object are shown here; see [the event object](#the-event-object) for all of them.)

### GET /api/users/:id/groups

The groups the person belongs to, the ones they organize included. Each item is a [group](#the-group-object) with `organizer_name`, `member_count` and `is_organizer` (true when the person organizes it). Errors: `404`.

```bash
curl http://localhost:3000/api/users/1/groups
```

```json
[
  {
    "group_id": 1,
    "organizer_id": 1,
    "group_name": "Birmingham Code & Coffee",
    "description": "A friendly meetup for people curious about technology in Birmingham. Bring a laptop or just your questions.",
    "category": "Technology",
    "group_image_url": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&h=600&fit=crop&q=80",
    "organizer_name": "Taylor Adams",
    "member_count": 9,
    "is_organizer": true
  }
]
```

## Groups

### The group object

`group_id`, `organizer_id`, `group_name`, `description`, `category`, `group_image_url`, plus (in lists and single reads) `organizer_name`, `organizer_image_url`, `organizer_city`, `organizer_state` and `member_count`. A single group read by a logged-in person also has `is_member`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/groups` | public | List and filter groups. |
| POST | `/api/groups` | host | Create a group. |
| GET | `/api/groups/:id` | public | One group. |
| PATCH | `/api/groups/:id` | organizer | Change a group. |
| DELETE | `/api/groups/:id` | organizer | Delete a group, its events and their RSVPs. |
| GET | `/api/groups/:id/members` | public | The people in a group. |
| POST | `/api/groups/:id/members` | user | Join a group. |
| DELETE | `/api/groups/:id/members/me` | user | Leave a group. |

### GET /api/groups

Query filters (all optional, combinable, and comparing words without caring about capital letters):

| Parameter | Meaning |
|---|---|
| `q` | words that must each appear in the name or description |
| `category` | the category |
| `city`, `state`, `zipcode` | the organizer's city, state and ZIP code |
| `from`, `to` | `YYYY-MM-DD`; only groups that have an event in that time |
| `upcoming=true` | only groups that have an event that has not started |

All the date filters apply to one event, so a group matches only if a single event meets all of them. Groups are ordered by name. Errors: `400` (a date the database refuses).

```bash
curl "http://localhost:3000/api/groups?category=Technology&limit=1"
```

```json
[
  {
    "group_id": 81,
    "organizer_id": 281,
    "group_name": "Bangor Code & Coffee",
    "description": "A friendly meetup for people curious about technology in Bangor. Bring a laptop or just your questions.",
    "category": "Technology",
    "group_image_url": "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&q=80",
    "organizer_name": "Dakota Brown",
    "organizer_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&crop=faces&q=80",
    "organizer_city": "Bangor",
    "organizer_state": "ME",
    "member_count": 8
  }
]
```

### POST /api/groups

Body:

| Field | Type | Rule |
|---|---|---|
| `group_name` | text | required, at most 80 characters |
| `category` | text | required; any text. A new word becomes a new category, and a word that differs from an existing category only in capital letters uses the existing spelling |
| `description` | text | optional |
| `group_image_url` | text | optional, a web address (http or https) |

The organizer becomes the group's first member. Returns `201` with the new group. Errors: `400`, `401`, `403`.

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/groups \
  -H "Content-Type: application/json" \
  -d '{"group_name":"Board Game Club","category":"Games","description":"Weekly game nights."}'
```

```json
{
  "group_id": 215,
  "organizer_id": 1,
  "group_name": "Board Game Club",
  "description": "Weekly game nights.",
  "category": "Games",
  "group_image_url": null
}
```

Errors:

```json
{ "error": "Please fix the highlighted fields.", "details": { "group_name": "Group name is required.", "category": "Category is required." } }
```

An attendee gets `403`:

```json
{ "error": "Only hosts can do this." }
```

### GET /api/groups/:id

One group with its organizer's details and `member_count`. For a logged-in person it also has `is_member`. Errors: `404`.

```bash
curl http://localhost:3000/api/groups/1
```

```json
{
  "group_id": 1,
  "organizer_id": 1,
  "group_name": "Birmingham Code & Coffee",
  "description": "A friendly meetup for people curious about technology in Birmingham. Bring a laptop or just your questions.",
  "category": "Technology",
  "group_image_url": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&h=600&fit=crop&q=80",
  "organizer_name": "Taylor Adams",
  "organizer_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&crop=faces&q=80",
  "organizer_city": "Birmingham",
  "organizer_state": "AL",
  "member_count": 9
}
```

### PATCH /api/groups/:id

Body: any of the POST fields, with the same rules. At least one field is needed. Returns `200` with the updated group. Errors: `400`, `401`, `403` (not the organizer), `404`.

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/groups/215 \
  -H "Content-Type: application/json" \
  -d '{"description":"Game nights every Friday."}'
```

```json
{
  "group_id": 215,
  "organizer_id": 1,
  "group_name": "Board Game Club",
  "description": "Game nights every Friday.",
  "category": "Games",
  "group_image_url": null
}
```

A different host gets `403`:

```json
{ "error": "Only the organizer can do this." }
```

### DELETE /api/groups/:id

Deletes the group, its events and every RSVP for them. Returns `204`. Errors: `401`, `403`, `404`.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/groups/215
```

### GET /api/groups/:id/members

The people in a group, with the time they joined. Errors: `404`.

```bash
curl http://localhost:3000/api/groups/1/members
```

```json
[
  {
    "user_id": 1,
    "full_name": "Taylor Adams",
    "user_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&crop=faces&q=80",
    "joined_at": "2026-08-10T00:00:00.000Z"
  }
]
```

### POST /api/groups/:id/members

Join a group as the logged-in person. No body. Returns `201`. Errors: `401`, `404`, `409` (already a member).

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/groups/215/members
```

```json
{ "membership_id": 1629, "user_id": 2, "group_id": 215, "joined_at": "2026-11-08T12:50:32.080Z" }
```

```json
{ "error": "You have already joined this group." }
```

### DELETE /api/groups/:id/members/me

Leave a group. Returns `204`. Errors: `401`, `403` (the organizer cannot leave their own group), `404`.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/groups/215/members/me
```

```json
{ "error": "Organizers cannot leave their own group." }
```

## Venues

### The venue object

`venue_id`, `venue_name`, `address`, `city`, `state` (two letters), `postal_code`, `latitude`, `longitude`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/venues` | public | List and filter venues. |
| POST | `/api/venues/lookup` | host | Find an address on the map without saving anything. |
| POST | `/api/venues` | host | Save a venue from just a name and an address. |
| GET | `/api/venues/:id` | public | One venue. |

Venues are shared places, so there is no edit or delete. `POST /api/venues/lookup` comes before `/:id`.

### GET /api/venues

Query: `q` (words that must each appear in the name, address or city), `state`, `city`. Venues are ordered by state, city and name.

```bash
curl "http://localhost:3000/api/venues?state=TX"
```

```json
[
  {
    "venue_id": 184,
    "venue_name": "Austin Main Street Studio",
    "address": "762 Maple Dr",
    "city": "Austin",
    "state": "TX",
    "postal_code": "78701",
    "latitude": 30.284631,
    "longitude": -97.765201
  }
]
```

### GET /api/venues/:id

```bash
curl http://localhost:3000/api/venues/1
```

```json
{
  "venue_id": 1,
  "venue_name": "Birmingham Parkview Pavilion",
  "address": "672 Main St",
  "city": "Birmingham",
  "state": "AL",
  "postal_code": "35203",
  "latitude": 33.495748,
  "longitude": -86.812567
}
```

Errors: `404`.

### POST /api/venues/lookup

Body: `{ "address": "500 W 2nd St, Austin, TX 78701" }` (one line with the street, city and state). Nothing is saved. Returns `200` with the place that was found, so the page can show it on a small map. Errors: `400`, `401`, `403`, `422` (address not found), `503` (lookup unavailable).

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/venues/lookup \
  -H "Content-Type: application/json" \
  -d '{"address":"500 W 2nd St, Austin, TX 78701"}'
```

```json
{
  "address": "500 W 2nd St, Austin, TX 78701",
  "city": "Austin",
  "state": "TX",
  "postal_code": "78701",
  "latitude": 30.2672,
  "longitude": -97.7431
}
```

```json
{ "error": "We could not find that address.", "details": { "address": "We couldn't find that address. Include street, city and state." } }
```

### POST /api/venues

Body: `{ "venue_name": "City Hall", "address": "500 W 2nd St, Austin, TX 78701" }` and nothing else. `venue_name` is at most 100 characters and `address` at most 200. The server looks the address up and fills in `city`, `state`, `postal_code`, `latitude` and `longitude`. Coordinates, city, state or ZIP code sent by a client are ignored. The address is saved as typed (trimmed). Returns `201` with the full venue. Errors: `400`, `401`, `403`, `409`, `422`, `503`.

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/venues \
  -H "Content-Type: application/json" \
  -d '{"venue_name":"City Hall","address":"500 W 2nd St, Austin, TX 78701"}'
```

```json
{
  "venue_id": 215,
  "venue_name": "City Hall",
  "address": "500 W 2nd St, Austin, TX 78701",
  "city": "Austin",
  "state": "TX",
  "postal_code": "78701",
  "latitude": 30.2672,
  "longitude": -97.7431
}
```

The same name, address and city again is a conflict, and the answer points at the venue that already exists so the page can use it:

```json
{ "error": "That venue already exists.", "details": { "venue_id": 215 } }
```

### Venue lookup and geocoding

Addresses are turned into map positions by OpenStreetMap's Nominatim service, through one small module (`server/utils/geocoder.js`) with one function.

- The service's web address, the name Orbit identifies itself with, the country code, the timeout and the minimum gap between requests all come from the `GEOCODER_*` settings. Nothing about the service is typed in the code.
- Lookups are queued so the minimum gap holds even when several requests arrive together.
- The result must be in the configured country and have a city (city, town, village or hamlet), a state and a postal code. If it does not, the answer is `422` with the message `We couldn't find that address. Include street, city and state.` and nothing is saved.
- If the service times out or fails, the answer is `503` with `Address lookup is unavailable right now. Try again in a moment.` and nothing is saved. If a setting is missing, the answer is also `503`, the problem is written to the server log, and the rest of the API keeps working.
- Venues that are already in the database (the seeded ones) already have coordinates; nothing is looked up when the database is set up.

## Events

### The event object

Every event answer has the same shape:

| Field | Meaning |
|---|---|
| `event_id`, `group_id` | ids |
| `venue_id` | the venue's id, or `null` for an online event |
| `meeting_link` | the meeting link of an online event (`null` for an event at a venue). Only people who are logged in get it; visitors always see `null` |
| `event_title`, `description`, `event_image_url` | what the host wrote (the image can be `null`) |
| `start_time`, `end_time` | the venue's local clock time, such as `2026-11-17T09:00:00` |
| `timezone` | the venue's time zone, such as `America/Chicago`, worked out from its map position (the pages show it as CST, CDT and so on). An online event has no venue, so it has no `timezone` |
| `capacity` | how many people can attend |
| `group_name`, `category` | the group the event belongs to, and its category |
| `host_id`, `host_name`, `host_image_url` | the group's organizer, who is the host |
| `venue_name`, `address`, `city`, `state`, `postal_code`, `latitude`, `longitude` | where it happens; all `null` for an online event |
| `rsvp_count` | how many people are going |
| `my_rsvp` | the logged-in person's own answer, or `null` |
| `is_attending` | `true` when that answer means "going" (`false` for visitors), so a page never needs to know the word |

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/events` | public | List and filter events. |
| POST | `/api/events` | organizer (host) | Create an event in one of your groups. |
| GET | `/api/events/:id` | public | One event. |
| PATCH | `/api/events/:id` | organizer | Change an event. |
| DELETE | `/api/events/:id` | organizer | Delete an event and its RSVPs. |

The fixed addresses `/api/events/pins` and `/api/events/rsvp-statuses` come before `/:id`.

### GET /api/events

Query filters (all optional and combinable; `state`, `city`, `zipcode` and `category` ignore capital letters):

| Parameter | Meaning |
|---|---|
| `q` | words that must each appear in the title, description, group name, venue name or city |
| `state`, `city`, `zipcode` | the venue's state, city and ZIP code |
| `category` | the group's category |
| `group_id`, `venue_id` | one group or one venue |
| `from`, `to` | `YYYY-MM-DD` bounds on the start time (`to` includes that whole day) |
| `upcoming=true` | only events that have not started |
| `sort` | `date` (default, soonest first) or `newest` (newest first) |
| `limit`, `offset` | optional whole numbers; no limit is built in |

Errors: `400` (`limit`, `offset` or a date is not valid).

```bash
curl "http://localhost:3000/api/events?state=AL&upcoming=true&limit=1"
```

```json
[
  {
    "event_id": 5,
    "group_id": 4,
    "venue_id": 4,
    "event_title": "Sunrise Trail Walk",
    "description": "Join Huntsville Paddle Pals for this event. Get outside with people who love the trails near Huntsville. Bring water and good shoes.",
    "start_time": "2026-11-17T09:00:00",
    "end_time": "2026-11-17T11:00:00",
    "capacity": 102,
    "event_image_url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop&q=80",
    "meeting_link": null,
    "group_name": "Huntsville Paddle Pals",
    "category": "Outdoors",
    "host_id": 8,
    "host_name": "Emerson Wilson",
    "host_image_url": "https://images.unsplash.com/photo-1573497491208-6b1acb260507?w=400&h=400&fit=crop&crop=faces&q=80",
    "venue_name": "Huntsville Union Loft",
    "address": "175 Cedar Ln",
    "city": "Huntsville",
    "state": "AL",
    "postal_code": "35801",
    "latitude": 34.752095,
    "longitude": -86.571982,
    "rsvp_count": 4,
    "my_rsvp": null,
    "is_attending": false,
    "timezone": "America/Chicago"
  }
]
```

```json
{ "error": "Please fix the highlighted fields.", "details": { "limit": "limit must be a whole number." } }
```

### GET /api/events/:id

One [event](#the-event-object). Errors: `404`.

```bash
curl http://localhost:3000/api/events/5
```

The answer has the same shape as the list item above. An unknown id:

```json
{ "error": "Event not found." }
```

### POST /api/events

Body:

| Field | Type | Rule |
|---|---|---|
| `group_id` | number | required; a group you organize (otherwise `403`) |
| `venue_id` | number | an existing venue. Send either this or `meeting_link`, never both |
| `meeting_link` | text | the meeting link of an online event, a web address (http or https). Send either this or `venue_id`, never both |
| `event_title` | text | required, at most 100 characters |
| `description` | text | required |
| `date` | `YYYY-MM-DD` | required; a real date |
| `time` | `HH:MM` | required; a real time of day. The event must start in the future (venue time, compared with the server's clock) |
| `duration_minutes` | whole number | required; above 0. The end is the start plus this, so an event can last several days |
| `capacity` | whole number | required; above 0 and small enough for the column |
| `event_image_url` | text | optional, a web address (http or https) |

Returns `201` with the new [event](#the-event-object). Errors: `400` (with `details`), `401`, `403` (not a host, or not your group).

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"group_id":215,"venue_id":215,"event_title":"Friday Game Night","description":"Bring a game.","date":"2026-12-08","time":"18:30","duration_minutes":150,"capacity":2,"event_image_url":"https://example.com/cover.png"}'
```

```json
{
  "event_id": 322,
  "group_id": 215,
  "venue_id": 215,
  "event_title": "Friday Game Night",
  "description": "Bring a game.",
  "start_time": "2026-12-08T18:30:00",
  "end_time": "2026-12-08T21:00:00",
  "capacity": 2,
  "event_image_url": "https://example.com/cover.png",
  "meeting_link": null,
  "group_name": "Board Game Club",
  "category": "Games",
  "host_id": 1,
  "host_name": "Taylor Adams",
  "host_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&crop=faces&q=80",
  "venue_name": "City Hall",
  "address": "500 W 2nd St, Austin, TX 78701",
  "city": "Austin",
  "state": "TX",
  "postal_code": "78701",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "rsvp_count": 0,
  "my_rsvp": null,
  "is_attending": false,
  "timezone": "America/Chicago"
}
```

An online event has a `meeting_link` and no `venue_id`. Its venue fields come back `null`, it has no `timezone`, and it gets no map pin:

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"group_id":1,"meeting_link":"https://meet.example.com/orbit-room","event_title":"Online Book Club","description":"Meet from anywhere.","date":"2026-11-22","time":"19:00","duration_minutes":60,"capacity":20}'
```

```json
{
  "event_id": 322,
  "group_id": 1,
  "venue_id": null,
  "event_title": "Online Book Club",
  "description": "Meet from anywhere.",
  "start_time": "2026-11-22T19:00:00",
  "end_time": "2026-11-22T20:00:00",
  "capacity": 20,
  "event_image_url": null,
  "meeting_link": "https://meet.example.com/orbit-room",
  "group_name": "Birmingham Code & Coffee",
  "category": "Technology",
  "host_id": 1,
  "host_name": "Taylor Adams",
  "host_image_url": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&crop=faces&q=80",
  "venue_name": null,
  "address": null,
  "city": null,
  "state": null,
  "postal_code": null,
  "latitude": null,
  "longitude": null,
  "rsvp_count": 0,
  "my_rsvp": null,
  "is_attending": false
}
```

Sending both, or neither, is refused:

```json
{ "error": "Please fix the highlighted fields.", "details": { "meeting_link": "Choose a venue or enter a meeting link, not both." } }
```

```json
{ "error": "Please fix the highlighted fields.", "details": { "venue_id": "Choose a venue or enter a meeting link." } }
```

The same event read without logging in has `"meeting_link": null`, because the link is only given to logged-in people.

A missing title and a capacity of 0 (nothing is created):

```json
{ "error": "Please fix the highlighted fields.", "details": { "event_title": "Title is required.", "capacity": "Capacity must be a whole number above 0 and at most 2147483647." } }
```

### PATCH /api/events/:id

Body: any of the POST fields, with the same rules. To move an event between a venue and online, send `{ "venue_id": null, "meeting_link": "https://..." }` or `{ "venue_id": 5, "meeting_link": null }`; after the change the event must have a venue or a meeting link, not both and not neither. A `date`, `time` or `duration_minutes` that is sent on its own keeps the other two from the saved event. The "must start in the future" rule is only checked when `date` or `time` is sent, so a new length alone is allowed on an event that has already started. `capacity` cannot drop below the number of people already attending. Returns `200` with the updated [event](#the-event-object). Errors: `400`, `401`, `403` (not the organizer), `404`.

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/events/322 \
  -H "Content-Type: application/json" \
  -d '{"capacity":3}'
```

The answer is the full event with `"capacity": 3`. A different host gets `403`:

```json
{ "error": "Only the organizer can do this." }
```

### DELETE /api/events/:id

Deletes the event and every RSVP for it. Returns `204`. Errors: `401`, `403`, `404`.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/events/322
```

## RSVPs

An RSVP is a person's answer for one event. The answers are the two words stored in the database (`GET /api/events/rsvp-statuses` tells a page what they are), and by default a new answer means "going".

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/events/:id/rsvps` | user | Answer an event (join). |
| PATCH | `/api/events/:id/rsvps/me` | user | Change your own answer. |
| DELETE | `/api/events/:id/rsvps/me` | user | Remove your own answer. |
| GET | `/api/events/:id/rsvps` | organizer | Who answered, with counts. |

### POST /api/events/:id/rsvps

Body: `{}` or `{ "rsvp_status": "<answer>" }`; without an answer it means "going". Places are counted while the event is locked, so two people cannot take the last place together. Returns `201`. Errors: `400` (an answer that is not allowed, or the event has already started), `401`, `404`, `409` (you already answered, or the event is full).

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/events/322/rsvps \
  -H "Content-Type: application/json" -d '{}'
```

```json
{ "rsvp_id": 1285, "user_id": 2, "event_id": 322, "rsvp_status": "attending" }
```

```json
{ "error": "You have already answered for this event." }
```

### PATCH /api/events/:id/rsvps/me

Body: `{ "rsvp_status": "<answer>" }`. Switching to "going" checks that there is still room. Returns `200`. Errors: `400`, `401`, `404`, `409` (full).

```bash
curl -b cookies.txt -X PATCH http://localhost:3000/api/events/322/rsvps/me \
  -H "Content-Type: application/json" -d '{"rsvp_status":"not_attending"}'
```

```json
{ "rsvp_id": 1285, "user_id": 2, "event_id": 322, "rsvp_status": "not_attending" }
```

### DELETE /api/events/:id/rsvps/me

Removes your answer. Returns `204`. Errors: `401`, `404`.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/events/322/rsvps/me
```

### GET /api/events/:id/rsvps

For the host who organizes the event: its capacity, how many are going, a count for every answer, and each person with their answer. There is no public list of who is going. Errors: `401`, `403` (not the organizer), `404`.

```bash
curl -b cookies.txt http://localhost:3000/api/events/322/rsvps
```

```json
{
  "capacity": 3,
  "attending": 0,
  "counts": { "not_attending": 1 },
  "rsvps": [
    {
      "rsvp_id": 1285,
      "rsvp_status": "not_attending",
      "user_id": 2,
      "full_name": "Peyton Kim",
      "user_image_url": "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=400&fit=crop&crop=faces&q=80"
    }
  ]
}
```

## Map pins, RSVP answers, feed, cities and categories

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/events/pins` | public | One small item per event for the map. |
| GET | `/api/events/rsvp-statuses` | public | The two RSVP answers. |
| GET | `/api/feed` | user | Events for the logged-in person. |
| GET | `/api/cities` | public | Every city that has a venue. |
| GET | `/api/categories` | public | Every group category. |

### GET /api/events/pins

One item per event that has a venue, with just what a map pin needs (including the venue's `timezone`, for the tooltip). Online events have no position, so they have no pin. It takes the same filters as [`GET /api/events`](#get-apievents). Items are ordered by start time.

```bash
curl "http://localhost:3000/api/events/pins?state=AL&limit=2"
```

```json
[
  {
    "event_id": 5,
    "event_title": "Sunrise Trail Walk",
    "start_time": "2026-11-17T09:00:00",
    "category": "Outdoors",
    "latitude": 34.752095,
    "longitude": -86.571982,
    "rsvp_count": 4,
    "timezone": "America/Chicago"
  }
]
```

### GET /api/events/rsvp-statuses

The answer that means "going" (from the `ATTENDING_RSVP_STATUS` setting) and the other answer the database allows, so a page never types the words.

```bash
curl http://localhost:3000/api/events/rsvp-statuses
```

```json
{ "attending": "attending", "notAttending": "not_attending" }
```

### GET /api/feed

Events for the logged-in person. Optional query `limit` (a whole number) shortens each list. Errors: `400`, `401`.

| Field | Contents |
|---|---|
| `byGroups` | upcoming events of the groups the person belongs to |
| `byCity` | upcoming events in the person's state, with the ones in their own city first (only their city when their state is not known) |
| `yourEvents` | upcoming events the person said they are going to |
| `hosting` | only for hosts: events of the groups they organize |

Each item is an [event](#the-event-object).

```bash
curl -b cookies.txt "http://localhost:3000/api/feed?limit=1"
```

```json
{
  "byGroups": [ { "event_id": 2, "event_title": "Open Studio Evening", "start_time": "2026-12-19T09:00:00", "...": "the rest of the event object" } ],
  "byCity": [ { "event_id": 2, "...": "the rest of the event object" } ],
  "yourEvents": []
}
```

### GET /api/cities

Every city that has a venue, once each, ordered by state and city.

```bash
curl http://localhost:3000/api/cities
```

```json
[
  { "city": "Anchorage", "state": "AK", "zipcode": "99501" },
  { "city": "Fairbanks", "state": "AK", "zipcode": "99701" }
]
```

### GET /api/categories

The different categories the groups use, in order. A category appears here as soon as a group uses it.

```bash
curl http://localhost:3000/api/categories
```

```json
["Arts", "Career", "Community", "Education", "Food", "Games", "Music", "Outdoors", "Technology", "Wellness"]
```

## Login routes

The GitHub login (`GET /auth/github`, `GET /auth/github/callback`, `GET /auth/me`, `GET /auth/logout`) and `POST /api/users/onboarding` belong to the login system and are not documented here. They create the session cookie that the logged-in routes above read.
