// These tests check the home feed controller with a pretend database (no real one needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFeedController } from "../../controllers/feed.js";
import { SETTING } from "../../utils/settings.js";
import { fakeUsers } from "../helpers/fakes.js";
import { createFakePool } from "../helpers/fakePool.js";
import { createRes } from "../helpers/http.js";

// The settings that name the "going" answer and the host type, as the server would read them from its environment.
process.env[SETTING.attendingStatus] = "going-word";
process.env[SETTING.hostUserType] = fakeUsers.host.user_type;

const setup = (answers) => {
  const pool = createFakePool(answers);
  return { pool, controller: createFeedController({ pool }) };
};

const lists = [{ rows: [{ event_id: 1 }] }, { rows: [{ event_id: 2 }] }, { rows: [{ event_id: 3 }] }];

describe("getFeed", () => {
  it("gives an attendee three lists: their groups' events, events near them, and events they are going to", async () => {
    const { pool, controller } = setup(lists);
    const res = createRes();
    await controller.getFeed({ query: {}, user: fakeUsers.attendee }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { byGroups: [{ event_id: 1 }], byCity: [{ event_id: 2 }], yourEvents: [{ event_id: 3 }] });
    assert.equal(pool.calls.length, 3);
    // Each list only holds events that have not started yet.
    assert.ok(pool.calls.every((call) => call.sql.includes("localtimestamp")));
    assert.match(pool.calls[0].sql, /EXISTS \(SELECT 1 FROM members/);
    assert.match(pool.calls[2].sql, /going\.rsvp_status = \$1/);
  });

  it("looks in the visitor's state first and puts their own city at the top", async () => {
    const { pool, controller } = setup(lists);
    await controller.getFeed({ query: {}, user: fakeUsers.attendee }, createRes());

    assert.deepEqual(pool.calls[1].values, ["going-word", fakeUsers.attendee.user_id, fakeUsers.attendee.state, fakeUsers.attendee.city]);
    assert.match(pool.calls[1].sql, /venues\.state = \$3/);
    assert.match(pool.calls[1].sql, /ORDER BY \(venues\.city = \$4\) DESC/);
  });

  it("uses only the visitor's city when their state is not known", async () => {
    const { pool, controller } = setup(lists);
    await controller.getFeed({ query: {}, user: { ...fakeUsers.attendee, state: null } }, createRes());

    assert.deepEqual(pool.calls[1].values, ["going-word", fakeUsers.attendee.user_id, fakeUsers.attendee.city]);
    assert.match(pool.calls[1].sql, /venues\.city = \$3/);
  });

  it("adds a list of the events a host organizes, and only for hosts", async () => {
    const { pool, controller } = setup([...lists, { rows: [{ event_id: 4 }] }]);
    const res = createRes();
    await controller.getFeed({ query: {}, user: fakeUsers.host }, res);

    assert.deepEqual(res.body.hosting, [{ event_id: 4 }]);
    assert.match(pool.calls[3].sql, /groups\.organizer_id = \$2/);

    const attendeeRes = createRes();
    await setup(lists).controller.getFeed({ query: {}, user: fakeUsers.attendee }, attendeeRes);
    assert.equal("hosting" in attendeeRes.body, false);
  });

  it("shortens every list when a limit is sent, and refuses a limit that is not a whole number", async () => {
    const limited = setup(lists);
    await limited.controller.getFeed({ query: { limit: "5" }, user: fakeUsers.attendee }, createRes());
    assert.match(limited.pool.calls[0].sql, /LIMIT \$3$/);
    assert.equal(limited.pool.calls[0].values.at(-1), "5");

    const bad = setup([]);
    const res = createRes();
    await bad.controller.getFeed({ query: { limit: "many" }, user: fakeUsers.attendee }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(bad.pool.calls.length, 0);
  });
});

describe("time zones in the feed", () => {
  it("gives each event the time zone of its venue", async () => {
    const withPlace = { event_id: 1, latitude: 30.2672, longitude: -97.7431 };
    const { controller } = setup([{ rows: [withPlace] }, { rows: [] }, { rows: [] }]);
    const res = createRes();
    await controller.getFeed({ query: {}, user: fakeUsers.attendee }, res);

    assert.equal(res.body.byGroups[0].timezone, "America/Chicago");
  });
});
