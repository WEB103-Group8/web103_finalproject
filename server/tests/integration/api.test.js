// These tests run every real route against a real Postgres (in a throwaway schema), as different kinds of visitors.
import "../helpers/useTestSchema.js";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { pool, setUpTestDatabase, tearDownTestDatabase } from "../helpers/testDatabase.js";
import { startFakeGeocoder, startTestServer } from "../helpers/testServer.js";
import categoriesRouter from "../../routes/categories.js";
import citiesRouter from "../../routes/cities.js";
import eventsRouter from "../../routes/events.js";
import feedRouter from "../../routes/feed.js";
import groupsRouter from "../../routes/groups.js";
import usersRouter from "../../routes/users.js";
import venuesRouter from "../../routes/venues.js";
import { SETTING_NAMES } from "../../utils/geocoder.js";
import { SETTING } from "../../utils/settings.js";

// Where each router is mounted, as in server.js.
const mounts = [
  ["/api/categories", categoriesRouter],
  ["/api/cities", citiesRouter],
  ["/api/events", eventsRouter],
  ["/api/feed", feedRouter],
  ["/api/groups", groupsRouter],
  ["/api/users", usersRouter],
  ["/api/venues", venuesRouter],
];

// An address the pretend lookup service knows, and the place it answers with.
const ADDRESS = "500 W 2nd St, Austin, TX 78701";
const austin = {
  lat: "30.2672",
  lon: "-97.7431",
  address: { road: "W 2nd St", city: "Austin", state: "Texas", "ISO3166-2-lvl4": "US-TX", postcode: "78701", country_code: "us" },
};

// A date a number of days from now, like 2026-11-14.
const dayFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

let call;
let hits;
let bodies;
let server;
let geocoder;
const state = {};

// Get a few people of one kind from the loaded data.
const people = async (type, limit) => (await pool.query("SELECT * FROM users WHERE user_type = $1 ORDER BY user_id LIMIT $2", [type, limit])).rows;

// Get one group that a person organizes.
const groupOf = async (person) => (await pool.query("SELECT group_id FROM groups WHERE organizer_id = $1 ORDER BY group_id LIMIT 1", [person.user_id])).rows[0].group_id;

before(async () => {
  await setUpTestDatabase();

  // The settings the app reads from its environment; the address lookup points at the pretend service.
  process.env[SETTING.hostUserType] = "host";
  process.env[SETTING.attendingStatus] = "attending";
  geocoder = await startFakeGeocoder({ [ADDRESS]: austin });
  process.env[SETTING_NAMES.url] = geocoder.url;
  process.env[SETTING_NAMES.userAgent] = "IntegrationTest/1.0";
  process.env[SETTING_NAMES.countryCode] = "us";
  process.env[SETTING_NAMES.timeoutMs] = "2000";
  process.env[SETTING_NAMES.minGapMs] = "1";

  // The people the requests can pretend to be.
  const [host, otherHost] = await people("host", 2);
  const [attendee, attendee2, attendee3] = await people("attendee", 3);
  // Plus someone who signed in with GitHub but has not finished onboarding.
  const users = { host, otherHost, attendee, attendee2, attendee3, newcomer: { isNewUser: true, github_id: "1" } };
  Object.assign(state, { users, hostGroup: await groupOf(host), otherGroup: await groupOf(otherHost) });
  state.venueId = (await pool.query("SELECT venue_id FROM venues ORDER BY venue_id LIMIT 1")).rows[0].venue_id;
  state.category = (await pool.query("SELECT category FROM groups LIMIT 1")).rows[0].category;

  ({ call, hits, bodies, close: server } = await startTestServer({ mounts, users }));
});

after(async () => {
  await server();
  await geocoder.close();
  await tearDownTestDatabase();
});

describe("reading, open to everyone", () => {
  it("lists events with their group, venue, host and attendee count, in the right shapes", async () => {
    const { status, body } = await call("GET", "/api/events");
    const total = (await pool.query("SELECT COUNT(*)::int AS total FROM events")).rows[0].total;

    assert.equal(status, 200);
    assert.equal(body.length, total);
    const event = body[0];
    assert.equal(typeof event.event_id, "number");
    assert.match(event.start_time, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    for (const key of ["group_name", "category", "host_name", "venue_name", "city", "state"]) assert.equal(typeof event[key], "string", key);
    assert.equal(typeof event.latitude, "number");
    assert.equal(typeof event.rsvp_count, "number");
    assert.match(event.timezone, /^[A-Za-z_]+\/[A-Za-z_]+/);
    assert.equal(event.my_rsvp, null);
    assert.equal(event.is_attending, false);
  });

  it("filters, searches, sorts and pages events", async () => {
    const texas = await call("GET", "/api/events?state=TX");
    assert.ok(texas.body.length > 0 && texas.body.every((event) => event.state === "TX"));

    const searched = await call("GET", "/api/events?q=open%20source");
    const total = (await call("GET", "/api/events")).body.length;
    assert.ok(searched.body.length > 0 && searched.body.length < total);

    const newest = await call("GET", "/api/events?sort=newest&limit=3");
    assert.equal(newest.body.length, 3);
    assert.ok(newest.body[0].event_id > newest.body[1].event_id);

    assert.equal((await call("GET", "/api/events?from=2000-01-01&to=2099-12-31")).body.length, total);
    assert.equal((await call("GET", "/api/events?from=not-a-date")).status, 400);
    assert.equal((await call("GET", "/api/events?limit=abc")).status, 400);
  });

  it("tells the page the two answers a person can give, read from the settings and the database", async () => {
    const statuses = await call("GET", "/api/events/rsvp-statuses");

    assert.equal(statuses.status, 200);
    assert.equal(statuses.body.attending, process.env[SETTING.attendingStatus]);
    assert.equal(typeof statuses.body.notAttending, "string");
    assert.notEqual(statuses.body.notAttending, statuses.body.attending);
  });

  it("gives the map one small record per event, filtered like the list", async () => {
    const list = await call("GET", "/api/events?state=TX");
    const pins = await call("GET", "/api/events/pins?state=TX");

    assert.equal(pins.status, 200);
    assert.equal(pins.body.length, list.body.length);
    assert.deepEqual(Object.keys(pins.body[0]).sort(), ["category", "event_id", "event_title", "latitude", "longitude", "rsvp_count", "start_time", "timezone"]);
    assert.equal(typeof pins.body[0].longitude, "number");
  });

  it("gets one event, and answers 404 for an id that is missing or not a number", async () => {
    const first = (await call("GET", "/api/events?limit=1")).body[0];
    assert.equal((await call("GET", `/api/events/${first.event_id}`)).body.event_id, first.event_id);
    assert.equal((await call("GET", "/api/events/999999")).status, 404);
    assert.equal((await call("GET", "/api/events/abc")).status, 404);
  });

  it("lists groups, venues, cities and people, hiding private details", async () => {
    const groups = await call("GET", "/api/groups?category=" + encodeURIComponent(state.category));
    assert.ok(groups.body.length > 0 && groups.body.every((group) => typeof group.member_count === "number" && group.category === state.category));

    const one = await call("GET", `/api/groups/${state.hostGroup}`);
    assert.equal(one.body.group_id, state.hostGroup);
    assert.equal("is_member" in one.body, false);
    const members = await call("GET", `/api/groups/${state.hostGroup}/members`);
    assert.ok(members.body.length > 0);

    assert.ok((await call("GET", "/api/venues?state=TX")).body.length > 0);
    assert.equal((await call("GET", `/api/venues/${state.venueId}`)).body.venue_id, state.venueId);

    const cityTotal = (await pool.query("SELECT COUNT(*)::int AS total FROM (SELECT DISTINCT city, state, postal_code FROM venues) AS cities")).rows[0].total;
    assert.equal((await call("GET", "/api/cities")).body.length, cityTotal);

    const categories = await call("GET", "/api/categories");
    assert.ok(categories.body.length > 0 && categories.body.includes(state.category));

    const everyone = await call("GET", "/api/users");
    assert.ok(everyone.body.length > 0 && everyone.body.every((person) => !("email" in person)));
    const stranger = await call("GET", `/api/users/${state.users.attendee.user_id}`);
    assert.equal("email" in stranger.body, false);
  });

  it("lists the events a person organizes or is going to, tagged with the role", async () => {
    const created = await call("GET", `/api/users/${state.users.host.user_id}/events?role=created`);
    assert.ok(created.body.length > 0 && created.body.every((event) => event.role === "created"));

    const both = await call("GET", `/api/users/${state.users.attendee.user_id}/events`);
    assert.ok(both.body.every((event) => ["created", "attending"].includes(event.role)));

    assert.equal((await call("GET", `/api/users/${state.users.host.user_id}/events?role=spectator`)).status, 400);
    assert.equal((await call("GET", "/api/users/999999/events")).status, 404);
  });

  it("lists the groups a person belongs to, marking the ones they organize", async () => {
    const hostGroups = await call("GET", `/api/users/${state.users.host.user_id}/groups`);
    assert.equal(hostGroups.status, 200);
    assert.ok(hostGroups.body.length > 0);
    assert.ok(hostGroups.body.every((group) => typeof group.member_count === "number" && typeof group.is_organizer === "boolean"));
    assert.ok(hostGroups.body.some((group) => group.is_organizer === true));

    assert.equal((await call("GET", "/api/users/999999/groups")).status, 404);
    assert.equal((await call("GET", "/api/users/abc/groups")).status, 404);
  });
});

describe("groups", () => {
  it("lets only hosts create a group, who becomes its first member", async () => {
    const body = { group_name: "Integration Group", category: state.category, description: "Made by a test" };
    assert.equal((await call("POST", "/api/groups", { body })).status, 401);
    assert.equal((await call("POST", "/api/groups", { as: "attendee", body })).status, 403);
    assert.equal((await call("POST", "/api/groups", { as: "host", body: { ...body, category: "  " } })).body.details.category !== undefined, true);

    const created = await call("POST", "/api/groups", { as: "host", body });
    assert.equal(created.status, 201);
    state.groupId = created.body.group_id;

    const members = await call("GET", `/api/groups/${state.groupId}/members`);
    assert.deepEqual(members.body.map((member) => member.user_id), [state.users.host.user_id]);
  });

  it("lets a host start a brand-new category, which then shows up for everyone, and reuses the spelling of an existing one", async () => {
    const brandNew = await call("POST", "/api/groups", { as: "host", body: { group_name: "Category Test", category: "Zzz Brand New" } });
    assert.equal(brandNew.status, 201);
    assert.equal(brandNew.body.category, "Zzz Brand New");
    assert.ok((await call("GET", "/api/categories")).body.includes("Zzz Brand New"));

    const sameWord = await call("POST", "/api/groups", { as: "host", body: { group_name: "Category Test Two", category: "zzz brand new" } });
    assert.equal(sameWord.body.category, "Zzz Brand New");

    await call("DELETE", `/api/groups/${brandNew.body.group_id}`, { as: "host" });
    await call("DELETE", `/api/groups/${sameWord.body.group_id}`, { as: "host" });
  });

  it("lets only the organizer edit or delete the group", async () => {
    const path = `/api/groups/${state.groupId}`;
    assert.equal((await call("PATCH", path, { as: "otherHost", body: { group_name: "Hijacked" } })).status, 403);
    assert.equal((await call("PATCH", path, { as: "attendee", body: { group_name: "Hijacked" } })).status, 403);
    assert.equal((await call("PATCH", path, { as: "host", body: {} })).status, 400);
    assert.equal((await call("PATCH", "/api/groups/999999", { as: "host", body: { group_name: "x" } })).status, 404);

    const renamed = await call("PATCH", path, { as: "host", body: { group_name: "Renamed Group" } });
    assert.deepEqual([renamed.status, renamed.body.group_name], [200, "Renamed Group"]);
  });

  it("lets a logged-in person join and leave, but not twice, and never the organizer", async () => {
    const members = `/api/groups/${state.groupId}/members`;
    assert.equal((await call("POST", members)).status, 401);
    assert.equal((await call("POST", members, { as: "attendee" })).status, 201);
    assert.equal((await call("POST", members, { as: "attendee" })).status, 409);

    const seen = await call("GET", `/api/groups/${state.groupId}`, { as: "attendee" });
    assert.deepEqual([seen.body.is_member, seen.body.member_count], [true, 2]);

    assert.equal((await call("DELETE", `${members}/me`, { as: "attendee" })).status, 204);
    assert.equal((await call("DELETE", `${members}/me`, { as: "attendee" })).status, 404);
    assert.equal((await call("DELETE", `${members}/me`, { as: "host" })).status, 403);
  });

  it("deletes a group only for its organizer", async () => {
    const path = `/api/groups/${state.groupId}`;
    assert.equal((await call("DELETE", path, { as: "otherHost" })).status, 403);
    assert.equal((await call("DELETE", path, { as: "host" })).status, 204);
    assert.equal((await call("GET", path)).status, 404);
  });
});

describe("venues", () => {
  it("lets only hosts look up an address, using the lookup service", async () => {
    assert.equal((await call("POST", "/api/venues/lookup", { body: { address: ADDRESS } })).status, 401);
    assert.equal((await call("POST", "/api/venues/lookup", { as: "attendee", body: { address: ADDRESS } })).status, 403);
    assert.equal((await call("POST", "/api/venues/lookup", { as: "host", body: { address: "   " } })).status, 400);
    assert.equal((await call("POST", "/api/venues/lookup", { as: "host", body: { address: "Nowhere Land" } })).status, 422);

    const found = await call("POST", "/api/venues/lookup", { as: "host", body: { address: ADDRESS } });
    assert.deepEqual([found.status, found.body.city, found.body.state, found.body.postal_code], [200, "Austin", "TX", "78701"]);
  });

  it("saves a venue from only a name and an address, ignoring anything else sent, and refuses a repeat", async () => {
    const body = { venue_name: "Integration Hall", address: ADDRESS, city: "Fake City", state: "ZZ", latitude: 1, longitude: 2 };
    assert.equal((await call("POST", "/api/venues", { as: "attendee", body })).status, 403);

    const created = await call("POST", "/api/venues", { as: "host", body });
    assert.equal(created.status, 201);
    assert.deepEqual([created.body.city, created.body.state, created.body.latitude, created.body.longitude], ["Austin", "TX", 30.2672, -97.7431]);
    state.newVenueId = created.body.venue_id;

    const repeat = await call("POST", "/api/venues", { as: "host", body });
    assert.deepEqual([repeat.status, repeat.body.details.venue_id], [409, state.newVenueId]);
    assert.equal((await call("POST", "/api/venues", { as: "host", body: { venue_name: "Lost", address: "Nowhere Land" } })).status, 422);
  });
});

describe("events", () => {
  const eventBody = (changes = {}) => ({
    group_id: state.hostGroup,
    venue_id: state.venueId,
    event_title: "Integration Meetup",
    description: "Created by a test.",
    date: dayFromNow(1),
    time: "18:30",
    duration_minutes: 90,
    capacity: 2,
    ...changes,
  });

  it("lets only hosts create events, for their own groups, with valid details", async () => {
    assert.equal((await call("POST", "/api/events", { body: eventBody() })).status, 401);
    assert.equal((await call("POST", "/api/events", { as: "attendee", body: eventBody() })).status, 403);
    assert.equal((await call("POST", "/api/events", { as: "host", body: eventBody({ group_id: state.otherGroup }) })).status, 403);

    const invalid = await call("POST", "/api/events", { as: "host", body: eventBody({ date: dayFromNow(-2), capacity: 0, event_title: "" }) });
    assert.equal(invalid.status, 400);
    // The date is only judged once the other fields are valid, so it is not reported alongside them.
    assert.deepEqual(Object.keys(invalid.body.details).sort(), ["capacity", "event_title"]);

    const past = await call("POST", "/api/events", { as: "host", body: eventBody({ date: dayFromNow(-2) }) });
    assert.match(past.body.details.date, /future/);

    const noVenue = await call("POST", "/api/events", { as: "host", body: eventBody({ venue_id: 999999 }) });
    assert.ok(noVenue.body.details.venue_id);

    const created = await call("POST", "/api/events", { as: "host", body: eventBody() });
    assert.equal(created.status, 201);
    assert.deepEqual([created.body.start_time, created.body.end_time, created.body.rsvp_count], [`${dayFromNow(1)}T18:30:00`, `${dayFromNow(1)}T20:00:00`, 0]);
    state.eventId = created.body.event_id;
  });

  it("lets only the organizer edit the event, keeping the date and length when only the time changes", async () => {
    const path = `/api/events/${state.eventId}`;
    assert.equal((await call("PATCH", path, { as: "otherHost", body: { event_title: "Hijacked" } })).status, 403);
    assert.equal((await call("PATCH", path, { as: "host", body: {} })).status, 400);
    assert.equal((await call("PATCH", path, { as: "host", body: { date: dayFromNow(-1) } })).status, 400);

    const retitled = await call("PATCH", path, { as: "host", body: { event_title: "Changed Title" } });
    assert.deepEqual([retitled.status, retitled.body.event_title], [200, "Changed Title"]);

    const later = await call("PATCH", path, { as: "host", body: { time: "19:00" } });
    assert.deepEqual([later.body.start_time, later.body.end_time], [`${dayFromNow(1)}T19:00:00`, `${dayFromNow(1)}T20:30:00`]);

    assert.equal((await call("GET", `/api/events?group_id=${state.hostGroup}`)).body.some((event) => event.event_id === state.eventId), true);
  });

  it("answers for the event: places are limited, answers can change, and only the organizer sees who answered", async () => {
    const rsvps = `/api/events/${state.eventId}/rsvps`;
    assert.equal((await call("POST", rsvps)).status, 401);
    assert.equal((await call("POST", rsvps, { as: "attendee" })).status, 201);
    assert.equal((await call("POST", rsvps, { as: "attendee" })).status, 409);
    assert.equal((await call("POST", rsvps, { as: "attendee2" })).status, 201);

    // The event has two places and both are taken.
    const full = await call("POST", rsvps, { as: "attendee3" });
    assert.deepEqual([full.status, full.body.error], [409, "This event is full."]);
    assert.equal((await call("POST", rsvps, { as: "attendee3", body: { rsvp_status: "maybe" } })).status, 400);

    // The organizer cannot cut the capacity below the people already going.
    assert.equal((await call("PATCH", `/api/events/${state.eventId}`, { as: "host", body: { capacity: 1 } })).status, 400);

    // Stepping back frees a place, and stepping in again is refused once the place is taken.
    assert.equal((await call("PATCH", `${rsvps}/me`, { as: "attendee", body: { rsvp_status: "not_attending" } })).status, 200);
    assert.equal((await call("POST", rsvps, { as: "attendee3" })).status, 201);
    assert.equal((await call("PATCH", `${rsvps}/me`, { as: "attendee", body: { rsvp_status: "attending" } })).status, 409);
    assert.equal((await call("PATCH", `${rsvps}/me`, { as: "attendee", body: {} })).status, 400);

    assert.equal((await call("GET", rsvps, { as: "attendee" })).status, 403);
    const listing = await call("GET", rsvps, { as: "host" });
    assert.deepEqual([listing.body.capacity, listing.body.attending, listing.body.counts], [2, 2, { attending: 2, not_attending: 1 }]);

    assert.equal((await call("GET", `/api/events/${state.eventId}`, { as: "attendee2" })).body.my_rsvp, "attending");
    assert.equal((await call("GET", `/api/events/${state.eventId}`, { as: "attendee2" })).body.is_attending, true);
    assert.equal((await call("DELETE", `${rsvps}/me`, { as: "attendee" })).status, 204);
    assert.equal((await call("DELETE", `${rsvps}/me`, { as: "attendee" })).status, 404);
  });

  it("refuses to take a new answer for an event that has already started", async () => {
    const past = (await pool.query("SELECT event_id FROM events WHERE start_time < localtimestamp ORDER BY event_id LIMIT 1")).rows[0];
    assert.ok(past, "the data should include at least one event that has already started");
    assert.equal((await call("POST", `/api/events/${past.event_id}/rsvps`, { as: "attendee" })).status, 400);
  });

  it("lets only the organizer delete the event, taking its answers with it", async () => {
    const path = `/api/events/${state.eventId}`;
    assert.equal((await call("DELETE", path, { as: "otherHost" })).status, 403);
    assert.equal((await call("DELETE", path, { as: "host" })).status, 204);
    assert.equal((await call("GET", path)).status, 404);
    assert.equal((await pool.query("SELECT COUNT(*)::int AS total FROM rsvps WHERE event_id = $1", [state.eventId])).rows[0].total, 0);
  });
});

describe("online events", () => {
  const onlineBody = (changes = {}) => ({
    group_id: state.hostGroup,
    meeting_link: "https://meet.example.com/orbit-test",
    event_title: "Online Integration Meetup",
    description: "Created by a test, with no venue.",
    date: dayFromNow(2),
    time: "19:00",
    duration_minutes: 60,
    capacity: 5,
    ...changes,
  });

  it("lets a host create an event with a meeting link instead of a venue, and only logged-in people see the link", async () => {
    const created = await call("POST", "/api/events", { as: "host", body: onlineBody() });
    assert.equal(created.status, 201);
    assert.equal(created.body.venue_id, null);
    assert.equal(created.body.venue_name, null);
    assert.equal(created.body.meeting_link, "https://meet.example.com/orbit-test");
    assert.equal("timezone" in created.body, false);
    state.onlineEventId = created.body.event_id;

    const asVisitor = await call("GET", `/api/events/${state.onlineEventId}`);
    assert.equal(asVisitor.status, 200);
    assert.equal(asVisitor.body.meeting_link, null);
    assert.equal((await call("GET", `/api/events/${state.onlineEventId}`, { as: "attendee" })).body.meeting_link, "https://meet.example.com/orbit-test");
  });

  it("lists the online event, but gives it no pin on the map", async () => {
    const list = await call("GET", "/api/events?q=Online%20Integration");
    assert.ok(list.body.some((event) => event.event_id === state.onlineEventId));

    const pins = await call("GET", "/api/events/pins?q=Online%20Integration");
    assert.equal(pins.body.length, 0);
    assert.equal((await call("GET", "/api/events?state=TX&city=Nowhere")).body.some((event) => event.event_id === state.onlineEventId), false);
  });

  it("refuses an event with no venue and no meeting link, with both, or with a link that is not a web address", async () => {
    const neither = await call("POST", "/api/events", { as: "host", body: onlineBody({ meeting_link: undefined }) });
    assert.equal(neither.status, 400);
    assert.ok(neither.body.details.venue_id);

    const both = await call("POST", "/api/events", { as: "host", body: onlineBody({ venue_id: state.venueId }) });
    assert.equal(both.status, 400);
    assert.ok(both.body.details.meeting_link);

    const notALink = await call("POST", "/api/events", { as: "host", body: onlineBody({ meeting_link: "my zoom room" }) });
    assert.equal(notALink.status, 400);
    assert.ok(notALink.body.details.meeting_link);
  });

  it("moves an event between online and a venue, and never leaves it with neither", async () => {
    const path = `/api/events/${state.onlineEventId}`;

    const toVenue = await call("PATCH", path, { as: "host", body: { venue_id: state.venueId, meeting_link: null } });
    assert.equal(toVenue.status, 200);
    assert.equal(toVenue.body.venue_id, state.venueId);
    assert.equal(toVenue.body.meeting_link, null);
    assert.match(toVenue.body.timezone, /\//);

    const neither = await call("PATCH", path, { as: "host", body: { venue_id: null } });
    assert.equal(neither.status, 400);

    const backOnline = await call("PATCH", path, { as: "host", body: { venue_id: null, meeting_link: "https://meet.example.com/again" } });
    assert.equal(backOnline.status, 200);
    assert.equal(backOnline.body.venue_id, null);

    assert.equal((await call("DELETE", path, { as: "host" })).status, 204);
  });
});

describe("feed", () => {
  it("needs a login and gives each person their own lists, with hosting only for hosts", async () => {
    assert.equal((await call("GET", "/api/feed")).status, 401);

    const attendee = await call("GET", "/api/feed", { as: "attendee" });
    assert.deepEqual(Object.keys(attendee.body).sort(), ["byCity", "byGroups", "yourEvents"]);

    const host = await call("GET", "/api/feed", { as: "host" });
    assert.ok(Array.isArray(host.body.hosting) && host.body.hosting.length > 0);

    const limited = await call("GET", "/api/feed?limit=1", { as: "host" });
    assert.ok(Object.values(limited.body).every((list) => list.length <= 1));
    assert.equal((await call("GET", "/api/feed?limit=many", { as: "host" })).status, 400);
  });
});

describe("profiles", () => {
  it("tells pages who is logged in, whether they are a host, and whether a GitHub user must finish onboarding", async () => {
    const host = await call("GET", "/api/users/me", { as: "host" });
    assert.deepEqual([host.status, host.body.is_host, host.body.user_id], [200, true, state.users.host.user_id]);
    assert.equal(host.body.email, state.users.host.email);

    assert.equal((await call("GET", "/api/users/me", { as: "attendee" })).body.is_host, false);

    const visitor = await call("GET", "/api/users/me");
    assert.deepEqual([visitor.status, visitor.body.needsOnboarding], [401, false]);
    const newcomer = await call("GET", "/api/users/me", { as: "newcomer" });
    assert.deepEqual([newcomer.status, newcomer.body.needsOnboarding], [401, true]);
  });

  it("lets a person edit only their own allowed fields, and never their role", async () => {
    assert.equal((await call("PATCH", "/api/users/me", { body: { city: "Newtown" } })).status, 401);

    const edited = await call("PATCH", "/api/users/me", { as: "attendee2", body: { city: "Newtown", state: "TX", zipcode: "78701" } });
    assert.deepEqual([edited.status, edited.body.city, edited.body.email === state.users.attendee2.email], [200, "Newtown", true]);

    const refused = await call("PATCH", "/api/users/me", { as: "attendee2", body: { user_type: "host", email: "x@y.z" } });
    assert.equal(refused.status, 400);
    assert.equal((await call("PATCH", "/api/users/me", { as: "attendee2", body: { state: "ZZ" } })).status, 400);
    assert.equal((await call("PATCH", "/api/users/me", { as: "attendee2", body: { zipcode: "ABC" } })).status, 400);

    // Their role in the database is unchanged.
    const saved = await pool.query("SELECT user_type FROM users WHERE user_id = $1", [state.users.attendee2.user_id]);
    assert.equal(saved.rows[0].user_type, state.users.attendee2.user_type);
  });

  it("shows the email only to the person themself", async () => {
    const path = `/api/users/${state.users.attendee2.user_id}`;
    assert.equal("email" in (await call("GET", path, { as: "attendee2" })).body, true);
    assert.equal("email" in (await call("GET", path, { as: "host" })).body, false);
    assert.equal("email" in (await call("GET", path)).body, false);
  });
});

describe("the whole API", () => {
  it("never sends the password or GitHub columns in any answer", () => {
    const forbidden = ["password_hash", "github_id", "github_username", "is_onboarded"];
    const keysIn = (value) => (value && typeof value === "object" ? Object.entries(value).flatMap(([key, inner]) => [key, ...keysIn(inner)]) : []);
    assert.deepEqual(bodies.flatMap(keysIn).filter((key) => forbidden.includes(key)), []);
  });

  it("was tested route by route: every route in the routers was called at least once", () => {
    const routes = mounts.flatMap(([prefix, router]) =>
      router.stack
        .filter((layer) => layer.route)
        .flatMap((layer) => Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${prefix}${layer.route.path}`.replace(/:\w+/g, ":id").replace(/\/$/, ""))),
    );
    assert.ok(routes.length > 0);
    assert.deepEqual(routes.filter((route) => !hits.has(route)), []);
  });
});
