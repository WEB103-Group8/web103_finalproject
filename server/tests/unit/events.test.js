// These tests check the events controller with a pretend database and a fixed clock.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEventsController } from "../../controllers/events.js";
import { SETTING } from "../../utils/settings.js";
import { fakeUsers } from "../helpers/fakes.js";
import { createFakePool } from "../helpers/fakePool.js";
import { createRes, withQuietErrors } from "../helpers/http.js";

// The setting that names the answer meaning "going", as the server would read it from its environment.
process.env[SETTING.attendingStatus] = "going-word";

// A fixed "now", and made-up database rules, so these tests give the same answer every day.
const NOW = Date.parse("2026-11-08T12:00:00Z");
const rules = { allowedWords: {}, maxLengths: { "events.event_title": 30 }, maxIntegers: { "events.capacity": 1000 } };

// Build a controller wired to a pretend database that gives these answers in order.
const setup = (answers = []) => {
  const pool = createFakePool(answers);
  return { pool, controller: createEventsController({ pool, loadRules: async () => rules, now: () => NOW }) };
};

const body = { group_id: 3, venue_id: 4, event_title: " Trivia Night ", description: " Fun. ", date: "2026-12-01", time: "18:30", duration_minutes: 90, capacity: 40, event_image_url: "" };
const ownGroup = { rows: [{ organizer_id: String(fakeUsers.host.user_id) }] };
const venue = { rows: [{ venue_id: 4 }] };

describe("getEvents", () => {
  it("passes every filter, search word, date, sort and paging value as a value, never as SQL text", async () => {
    const { pool, controller } = setup([{ rows: [{ event_id: 1 }] }]);
    const res = createRes();
    const query = { state: "TX", q: "trivia night", from: "2026-12-01", to: "2026-12-31", upcoming: "true", sort: "newest", limit: "10", offset: "20" };
    await controller.getEvents({ query, user: fakeUsers.attendee }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(pool.calls[0].values, ["going-word", fakeUsers.attendee.user_id, "TX", "%trivia%", "%night%", "2026-12-01", "2026-12-31", "10", "20"]);
    assert.match(pool.calls[0].sql, /JOIN groups/);
    assert.match(pool.calls[0].sql, /JOIN venues/);
    assert.match(pool.calls[0].sql, /localtimestamp/);
    assert.match(pool.calls[0].sql, /ORDER BY events\.event_id DESC LIMIT \$\d+ OFFSET \$\d+/);
  });

  it("sorts by start time by default and gives anonymous visitors no personal answer", async () => {
    const { pool, controller } = setup([{ rows: [] }]);
    await controller.getEvents({ query: {}, user: null }, createRes());
    assert.match(pool.calls[0].sql, /ORDER BY events\.start_time ASC/);
    assert.deepEqual(pool.calls[0].values, ["going-word", null]);
  });

  it("refuses paging values that are not whole numbers before asking the database", async () => {
    const { pool, controller } = setup();
    const res = createRes();
    await controller.getEvents({ query: { limit: "abc" }, user: null }, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.details.limit);
    assert.equal(pool.calls.length, 0);
  });

  it("answers 400 when the database refuses a filter value such as a bad date", async () => {
    const { controller } = setup([Object.assign(new Error("bad date"), { code: "22007" })]);
    const res = createRes();
    await controller.getEvents({ query: { from: "not-a-date" }, user: null }, res);
    assert.equal(res.statusCode, 400);
  });
});

describe("event filters", () => {
  it("compare words without caring about capital letters, but ids exactly", async () => {
    const { pool, controller } = setup([{ rows: [] }]);
    await controller.getEvents({ query: { city: "austin", zipcode: "78701", category: "food", group_id: "3" }, user: null }, createRes());

    assert.match(pool.calls[0].sql, /LOWER\(venues\.postal_code\) = LOWER\(\$\d\)/);

    assert.match(pool.calls[0].sql, /LOWER\(venues\.city\) = LOWER\(\$3\)/);
    assert.match(pool.calls[0].sql, /LOWER\(groups\.category\) = LOWER\(\$\d\)/);
    assert.match(pool.calls[0].sql, /events\.group_id = \$\d/);
  });
});

describe("event details", () => {
  it("tell the page whether the visitor's own answer means going, so the page never needs the word", async () => {
    const { pool, controller } = setup([{ rows: [{ event_id: 1 }] }]);
    await controller.getEvents({ query: {}, user: null }, createRes());

    assert.match(pool.calls[0].sql, /mine\.rsvp_status = \$1 FROM rsvps.*\), false\) AS is_attending/s);
  });
});

describe("getEventPins", () => {
  it("returns one small record per event, filtered like the list, with nothing personal", async () => {
    const { pool, controller } = setup([{ rows: [{ event_id: 1 }] }]);
    const res = createRes();
    await controller.getEventPins({ query: { state: "TX", q: "trivia" } }, res);

    assert.deepEqual([res.statusCode, res.body], [200, [{ event_id: 1 }]]);
    assert.deepEqual(pool.calls[0].values, ["going-word", "TX", "%trivia%"]);
    assert.match(pool.calls[0].sql, /venues\.latitude/);
    assert.doesNotMatch(pool.calls[0].sql, /my_rsvp|JOIN users/);
  });
});

describe("getEventById", () => {
  it("answers 404 for a bad or missing id and 200 for a real event", async () => {
    const bad = setup();
    const badRes = createRes();
    await bad.controller.getEventById({ params: { eventId: "x" }, user: null }, badRes);
    assert.equal(badRes.statusCode, 404);
    assert.equal(bad.pool.calls.length, 0);

    const missing = setup([{ rows: [] }]);
    const missingRes = createRes();
    await missing.controller.getEventById({ params: { eventId: "5" }, user: null }, missingRes);
    assert.equal(missingRes.statusCode, 404);

    const found = setup([{ rows: [{ event_id: 5 }] }]);
    const foundRes = createRes();
    await found.controller.getEventById({ params: { eventId: "5" }, user: fakeUsers.attendee }, foundRes);
    assert.deepEqual([foundRes.statusCode, foundRes.body], [200, { event_id: 5 }]);
    assert.deepEqual(found.pool.calls[0].values, ["going-word", fakeUsers.attendee.user_id, "5"]);
  });
});

describe("createEvent", () => {
  const request = { body, user: fakeUsers.host };

  it("refuses a past date, a zero capacity and a missing title without touching the database", async () => {
    const { pool, controller } = setup();
    const res = createRes();
    await controller.createEvent({ body: { ...body, date: "2026-11-01", capacity: 0, event_title: "" }, user: fakeUsers.host }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(Object.keys(res.body.details).sort(), ["capacity", "event_title"]);
    assert.equal(pool.calls.length, 0);

    // With every field valid, a start in the past is the only problem left.
    const past = createRes();
    await controller.createEvent({ body: { ...body, date: "2026-11-01" }, user: fakeUsers.host }, past);
    assert.equal(past.statusCode, 400);
    assert.match(past.body.details.date, /future/);
    assert.equal(pool.calls.length, 0);
  });

  it("refuses a duration so long that the end is not a real time", async () => {
    const { controller } = setup();
    const res = createRes();
    await controller.createEvent({ body: { ...body, duration_minutes: 1e15 }, user: fakeUsers.host }, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.details.duration_minutes);
  });

  it("answers 400 for a group that does not exist and 403 for a group someone else organizes", async () => {
    const missing = setup([{ rows: [] }]);
    const missingRes = createRes();
    await missing.controller.createEvent(request, missingRes);
    assert.equal(missingRes.statusCode, 400);
    assert.ok(missingRes.body.details.group_id);

    const notYours = setup([{ rows: [{ organizer_id: fakeUsers.otherHost.user_id }] }]);
    const notYoursRes = createRes();
    await notYours.controller.createEvent(request, notYoursRes);
    assert.equal(notYoursRes.statusCode, 403);
    assert.equal(notYours.pool.calls.length, 1);
  });

  it("answers 400 for a venue that does not exist, saving nothing", async () => {
    const { pool, controller } = setup([ownGroup, { rows: [] }]);
    const res = createRes();
    await controller.createEvent(request, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.details.venue_id);
    assert.equal(pool.calls.some((call) => call.sql.startsWith("INSERT")), false);
  });

  it("saves the trimmed text, the worked-out start and end, and answers 201 with the joined event", async () => {
    const { pool, controller } = setup([ownGroup, venue, { rows: [{ event_id: 7 }] }, { rows: [{ event_id: 7, event_title: "Trivia Night" }] }]);
    const res = createRes();
    await controller.createEvent(request, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.event_id, 7);
    // Group, venue, no meeting link, trimmed title and description, start, end, capacity, and a blank picture saved as nothing.
    assert.deepEqual(pool.calls[2].values, [3, 4, null, "Trivia Night", "Fun.", "2026-12-01T18:30:00", "2026-12-01T20:00:00", 40, null]);
    assert.match(pool.calls[3].sql, /JOIN venues/);
  });

  it("answers 400 when the database refuses a value and 500 for any other failure", async () => {
    const outOfRange = setup([ownGroup, venue, Object.assign(new Error("out of range"), { code: "22003" })]);
    const outOfRangeRes = createRes();
    await outOfRange.controller.createEvent(request, outOfRangeRes);
    assert.equal(outOfRangeRes.statusCode, 400);

    const broken = setup([ownGroup, venue, new Error("database is down")]);
    const brokenRes = createRes();
    await withQuietErrors(() => broken.controller.createEvent(request, brokenRes));
    assert.equal(brokenRes.statusCode, 500);
  });
});

describe("updateEvent", () => {
  // The event as it is now: December 1st at 18:30 for 90 minutes, in group 3.
  const existing = { rows: [{ date: "2026-12-01", time: "18:30", duration_minutes: 90, group_id: 3, venue_id: 4, meeting_link: null }] };
  const joined = { rows: [{ event_id: 9 }] };
  const host = fakeUsers.host;

  it("refuses an empty or invalid edit before touching the database", async () => {
    const { pool, controller } = setup();
    const empty = createRes();
    await controller.updateEvent({ params: { eventId: "9" }, body: {}, user: host }, empty);
    assert.ok(empty.body.details.body);

    const invalid = createRes();
    await controller.updateEvent({ params: { eventId: "9" }, body: { capacity: 0 }, user: host }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(pool.calls.length, 0);
  });

  it("answers 404 when the event does not exist", async () => {
    const res = createRes();
    await setup([{ rows: [] }]).controller.updateEvent({ params: { eventId: "9" }, body: { event_title: "New" }, user: host }, res);
    assert.equal(res.statusCode, 404);
  });

  it("changes only the fields that were sent", async () => {
    const { pool, controller } = setup([existing, {}, joined]);
    const res = createRes();
    await controller.updateEvent({ params: { eventId: "9" }, body: { event_title: " New title " }, user: host }, res);

    assert.equal(res.statusCode, 200);
    assert.match(pool.calls[1].sql, /^UPDATE events SET event_title = \$1 WHERE event_id = \$2$/);
    assert.deepEqual(pool.calls[1].values, ["New title", "9"]);
  });

  it("keeps the date and the length when only the time changes", async () => {
    const { pool, controller } = setup([existing, {}, joined]);
    await controller.updateEvent({ params: { eventId: "9" }, body: { time: "19:00" }, user: host }, createRes());

    assert.match(pool.calls[1].sql, /SET start_time = \$1, end_time = \$2 WHERE event_id = \$3/);
    assert.deepEqual(pool.calls[1].values, ["2026-12-01T19:00:00", "2026-12-01T20:30:00", "9"]);
  });

  it("refuses a new date or time in the past, but lets a new length through on an event that already started", async () => {
    const past = setup([existing]);
    const pastRes = createRes();
    await past.controller.updateEvent({ params: { eventId: "9" }, body: { date: "2026-11-01" }, user: host }, pastRes);
    assert.equal(pastRes.statusCode, 400);
    assert.match(pastRes.body.details.date, /future/);

    // The event is on November 1st, already over, but only its length is changing.
    const started = { rows: [{ date: "2026-11-01", time: "18:30", duration_minutes: 90, group_id: 3, venue_id: 4, meeting_link: null }] };
    const { pool, controller } = setup([started, {}, joined]);
    const res = createRes();
    await controller.updateEvent({ params: { eventId: "9" }, body: { duration_minutes: 120 }, user: host }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(pool.calls[1].values, ["2026-11-01T18:30:00", "2026-11-01T20:30:00", "9"]);
  });

  it("refuses a capacity lower than the number of people already going", async () => {
    const { controller } = setup([existing, { rows: [{ attending: 5 }] }]);
    const res = createRes();
    await controller.updateEvent({ params: { eventId: "9" }, body: { capacity: 2 }, user: host }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.details.capacity, /5 people/);
  });

  it("refuses moving the event to a group the host does not organize, and to a venue that does not exist", async () => {
    const notYours = setup([existing, { rows: [{ organizer_id: fakeUsers.otherHost.user_id }] }]);
    const notYoursRes = createRes();
    await notYours.controller.updateEvent({ params: { eventId: "9" }, body: { group_id: 8 }, user: host }, notYoursRes);
    assert.equal(notYoursRes.statusCode, 403);

    const noVenue = setup([existing, { rows: [] }]);
    const noVenueRes = createRes();
    await noVenue.controller.updateEvent({ params: { eventId: "9" }, body: { venue_id: 99 }, user: host }, noVenueRes);
    assert.ok(noVenueRes.body.details.venue_id);
  });
});

describe("deleteEvent", () => {
  it("answers 204 when deleted and 404 when there was nothing to delete", async () => {
    const deleted = createRes();
    await setup([{ rowCount: 1 }]).controller.deleteEvent({ params: { eventId: "9" } }, deleted);
    assert.deepEqual([deleted.statusCode, deleted.ended], [204, true]);

    const missing = createRes();
    await setup([{ rowCount: 0 }]).controller.deleteEvent({ params: { eventId: "9" } }, missing);
    assert.equal(missing.statusCode, 404);
  });
});

describe("getEventOrganizerId", () => {
  it("returns the organizer of the event's group, or null for a bad id or a missing event", async () => {
    const found = setup([{ rows: [{ organizer_id: "7" }] }]);
    assert.equal(await found.controller.getEventOrganizerId({ params: { eventId: "9" } }), "7");
    assert.match(found.pool.calls[0].sql, /JOIN groups/);

    assert.equal(await setup([{ rows: [] }]).controller.getEventOrganizerId({ params: { eventId: "9" } }), null);

    const bad = setup();
    assert.equal(await bad.controller.getEventOrganizerId({ params: { eventId: "x" } }), null);
    assert.equal(bad.pool.calls.length, 0);
  });
});

describe("time zones on events and pins", () => {
  const austin = { event_id: 1, latitude: 30.2672, longitude: -97.7431 };

  it("gives every event in the list the time zone of its venue", async () => {
    const { controller } = setup([{ rows: [austin, { event_id: 2, latitude: 21.3069, longitude: -157.8583 }] }]);
    const res = createRes();
    await controller.getEvents({ query: {}, user: null }, res);

    assert.deepEqual(res.body.map((event) => event.timezone), ["America/Chicago", "Pacific/Honolulu"]);
  });

  it("gives one event the time zone of its venue", async () => {
    const { controller } = setup([{ rows: [austin] }]);
    const res = createRes();
    await controller.getEventById({ params: { eventId: "1" }, user: null }, res);

    assert.equal(res.body.timezone, "America/Chicago");
  });

  it("gives every map pin the time zone of its venue, for the tooltip", async () => {
    const { controller } = setup([{ rows: [austin] }]);
    const res = createRes();
    await controller.getEventPins({ query: {} }, res);

    assert.equal(res.body[0].timezone, "America/Chicago");
  });
});

describe("online events", () => {
  const online = { ...body, venue_id: undefined, meeting_link: " https://meet.example.com/abc " };
  const { venue_id, ...withoutVenue } = body;
  void venue_id;

  it("saves an online event with its meeting link and no venue, without looking for a venue", async () => {
    const { pool, controller } = setup([ownGroup, { rows: [{ event_id: 8 }] }, { rows: [{ event_id: 8, venue_id: null }] }]);
    const res = createRes();
    await controller.createEvent({ body: { ...withoutVenue, meeting_link: " https://meet.example.com/abc " }, user: fakeUsers.host }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(pool.calls.some((call) => call.sql.includes("FROM venues WHERE")), false);
    assert.deepEqual(pool.calls[1].values.slice(0, 3), [3, null, "https://meet.example.com/abc"]);
    assert.match(pool.calls[1].sql, /INSERT INTO events \(group_id, venue_id, meeting_link,/);
  });

  it("also accepts a venue of null for an online event", async () => {
    const { controller } = setup([ownGroup, { rows: [{ event_id: 8 }] }, { rows: [{ event_id: 8 }] }]);
    const res = createRes();
    await controller.createEvent({ body: { ...online, venue_id: null }, user: fakeUsers.host }, res);

    assert.equal(res.statusCode, 201);
  });

  it("refuses an event with neither a venue nor a meeting link, and one with both, saving nothing", async () => {
    const neither = setup();
    const neitherRes = createRes();
    await neither.controller.createEvent({ body: withoutVenue, user: fakeUsers.host }, neitherRes);
    assert.match(neitherRes.body.details.venue_id, /venue or enter a meeting link/);

    const both = setup();
    const bothRes = createRes();
    await both.controller.createEvent({ body: { ...body, meeting_link: "https://meet.example.com/abc" }, user: fakeUsers.host }, bothRes);
    assert.match(bothRes.body.details.meeting_link, /not both/);
    assert.equal(neither.pool.calls.length + both.pool.calls.length, 0);
  });

  it("refuses a meeting link that is not a web address", async () => {
    const { pool, controller } = setup();
    const res = createRes();
    await controller.createEvent({ body: { ...withoutVenue, meeting_link: "my zoom room" }, user: fakeUsers.host }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.details.meeting_link, /web address/);
    assert.equal(pool.calls.length, 0);
  });

  it("moves an event from a venue to online by sending no venue and a meeting link", async () => {
    const existing = { rows: [{ date: "2026-12-01", time: "18:30", duration_minutes: 90, group_id: 3, venue_id: 4, meeting_link: null }] };
    const { pool, controller } = setup([existing, {}, { rows: [{ event_id: 9 }] }]);
    const res = createRes();
    await controller.updateEvent({ params: { eventId: "9" }, body: { venue_id: null, meeting_link: "https://meet.example.com/abc" }, user: fakeUsers.host }, res);

    assert.equal(res.statusCode, 200);
    assert.match(pool.calls[1].sql, /SET venue_id = \$1, meeting_link = \$2 WHERE event_id = \$3/);
    assert.deepEqual(pool.calls[1].values, [null, "https://meet.example.com/abc", "9"]);
  });

  it("moves an online event to a venue by sending a venue and no meeting link", async () => {
    const existing = { rows: [{ date: "2026-12-01", time: "18:30", duration_minutes: 90, group_id: 3, venue_id: null, meeting_link: "https://meet.example.com/abc" }] };
    const { pool, controller } = setup([existing, venue, {}, { rows: [{ event_id: 9 }] }]);
    const res = createRes();
    await controller.updateEvent({ params: { eventId: "9" }, body: { venue_id: 4, meeting_link: null }, user: fakeUsers.host }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(pool.calls[2].values, [4, null, "9"]);
  });

  it("refuses an edit that would leave an event with neither a venue nor a meeting link, or with both", async () => {
    const atVenue = { rows: [{ date: "2026-12-01", time: "18:30", duration_minutes: 90, group_id: 3, venue_id: 4, meeting_link: null }] };

    const neither = setup([atVenue]);
    const neitherRes = createRes();
    await neither.controller.updateEvent({ params: { eventId: "9" }, body: { venue_id: null }, user: fakeUsers.host }, neitherRes);
    assert.match(neitherRes.body.details.venue_id, /venue or enter a meeting link/);

    const both = setup([atVenue]);
    const bothRes = createRes();
    await both.controller.updateEvent({ params: { eventId: "9" }, body: { meeting_link: "https://meet.example.com/abc" }, user: fakeUsers.host }, bothRes);
    assert.match(bothRes.body.details.meeting_link, /not both/);
  });

  it("asks for the events with a left join, so an event without a venue is still listed, and hides the meeting link from visitors", async () => {
    const { pool, controller } = setup([{ rows: [] }]);
    await controller.getEvents({ query: {}, user: null }, createRes());

    assert.match(pool.calls[0].sql, /LEFT JOIN venues/);
    assert.match(pool.calls[0].sql, /CASE WHEN \$2::bigint IS NOT NULL THEN events\.meeting_link END AS meeting_link/);
  });
});
