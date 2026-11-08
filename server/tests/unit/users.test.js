// These tests check the users controller with a pretend database (no real one needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createUsersController } from "../../controllers/users.js";
import { SETTING } from "../../utils/settings.js";
import { fakeUsers } from "../helpers/fakes.js";
import { createFakePool } from "../helpers/fakePool.js";
import { createRes } from "../helpers/http.js";

// The setting that names the answer meaning "going", and made-up database rules.
process.env[SETTING.attendingStatus] = "going-word";
const rules = { allowedWords: {}, maxLengths: { "users.full_name": 20 }, maxIntegers: {} };

// Build a controller wired to a pretend database that gives these answers in order.
const setup = (answers = []) => {
  const pool = createFakePool(answers);
  return { pool, controller: createUsersController({ pool, loadRules: async () => rules }) };
};

const me = fakeUsers.attendee;

describe("getUsers", () => {
  it("lists people with only their public details", async () => {
    const { pool, controller } = setup([{ rows: [{ user_id: 1 }] }]);
    const res = createRes();
    await controller.getUsers({}, res);
    assert.deepEqual([res.statusCode, res.body], [200, [{ user_id: 1 }]]);
    assert.doesNotMatch(pool.calls[0].sql, /email|password|github|zipcode/);
  });
});

describe("getMe", () => {
  it("returns the person's own details, including whether they are a host", async () => {
    // The setting that names what a host is called, set to match the fake host.
    process.env[SETTING.hostUserType] = fakeUsers.host.user_type;

    const host = setup([{ rows: [{ user_id: fakeUsers.host.user_id, user_type: fakeUsers.host.user_type }] }]);
    const hostRes = createRes();
    await host.controller.getMe({ user: fakeUsers.host }, hostRes);
    assert.equal(hostRes.statusCode, 200);
    assert.equal(hostRes.body.is_host, true);
    assert.match(host.pool.calls[0].sql, /users\.email/);
    assert.doesNotMatch(host.pool.calls[0].sql, /password|github/);
    assert.deepEqual(host.pool.calls[0].values, [fakeUsers.host.user_id]);

    const attendee = setup([{ rows: [{ user_id: me.user_id, user_type: me.user_type }] }]);
    const attendeeRes = createRes();
    await attendee.controller.getMe({ user: me }, attendeeRes);
    assert.equal(attendeeRes.body.is_host, false);
  });

  it("answers 404 if the person no longer exists", async () => {
    const res = createRes();
    await setup([{ rows: [] }]).controller.getMe({ user: me }, res);
    assert.equal(res.statusCode, 404);
  });
});

describe("getUserById", () => {
  it("answers 404 for a bad id or a missing person", async () => {
    const bad = setup();
    const badRes = createRes();
    await bad.controller.getUserById({ params: { userId: "x" }, user: null }, badRes);
    assert.equal(badRes.statusCode, 404);
    assert.equal(bad.pool.calls.length, 0);

    const missing = setup([{ rows: [] }]);
    const missingRes = createRes();
    await missing.controller.getUserById({ params: { userId: "5" }, user: null }, missingRes);
    assert.equal(missingRes.statusCode, 404);
  });

  it("shows the email, country and ZIP code only to the person themself", async () => {
    const stranger = setup([{ rows: [{ user_id: 5 }] }]);
    await stranger.controller.getUserById({ params: { userId: "5" }, user: me }, createRes());
    assert.doesNotMatch(stranger.pool.calls[0].sql, /users\.email/);

    const anonymous = setup([{ rows: [{ user_id: 5 }] }]);
    await anonymous.controller.getUserById({ params: { userId: "5" }, user: null }, createRes());
    assert.doesNotMatch(anonymous.pool.calls[0].sql, /users\.email/);

    const self = setup([{ rows: [{ user_id: me.user_id }] }]);
    await self.controller.getUserById({ params: { userId: String(me.user_id) }, user: me }, createRes());
    assert.match(self.pool.calls[0].sql, /users\.email/);
    assert.match(self.pool.calls[0].sql, /users\.zipcode/);
    // The password and GitHub columns are never selected, even for the person themself.
    assert.doesNotMatch(self.pool.calls[0].sql, /password|github/);
  });
});

describe("getUserGroups", () => {
  it("answers 404 for a bad id or a missing person, without asking for groups", async () => {
    const bad = setup();
    const badRes = createRes();
    await bad.controller.getUserGroups({ params: { userId: "x" } }, badRes);

    const missing = setup([{ rows: [] }]);
    const missingRes = createRes();
    await missing.controller.getUserGroups({ params: { userId: "5" } }, missingRes);

    assert.deepEqual([badRes.statusCode, missingRes.statusCode], [404, 404]);
    assert.equal(bad.pool.calls.length + missing.pool.calls.length, 1);
  });

  it("gives the groups the person belongs to, with their member counts and whether the person organizes each", async () => {
    const { pool, controller } = setup([{ rows: [{}] }, { rows: [{ group_id: 1, is_organizer: true, member_count: 4 }] }]);
    const res = createRes();
    await controller.getUserGroups({ params: { userId: "5" } }, res);

    assert.deepEqual([res.statusCode, res.body], [200, [{ group_id: 1, is_organizer: true, member_count: 4 }]]);
    assert.match(pool.calls[1].sql, /FROM members AS mine/);
    assert.match(pool.calls[1].sql, /groups\.organizer_id = mine\.user_id\) AS is_organizer/);
    assert.deepEqual(pool.calls[1].values, ["5"]);
  });
});

describe("getUserEvents", () => {
  const request = (query) => ({ params: { userId: "5" }, query, user: me });

  it("refuses an unknown role and answers 404 for a bad id or a missing person", async () => {
    const role = setup();
    const roleRes = createRes();
    await role.controller.getUserEvents(request({ role: "spectator" }), roleRes);
    assert.equal(roleRes.statusCode, 400);

    const bad = createRes();
    await setup().controller.getUserEvents({ params: { userId: "x" }, query: {}, user: me }, bad);
    assert.equal(bad.statusCode, 404);

    const missing = createRes();
    await setup([{ rows: [] }]).controller.getUserEvents(request({}), missing);
    assert.equal(missing.statusCode, 404);
  });

  it("returns the events a person organizes, tagged with the role", async () => {
    const { pool, controller } = setup([{ rows: [{}] }, { rows: [{ event_id: 1 }] }]);
    const res = createRes();
    await controller.getUserEvents(request({ role: "created" }), res);

    assert.deepEqual(res.body, [{ event_id: 1, role: "created" }]);
    assert.match(pool.calls[1].sql, /groups\.organizer_id = \$3/);
    assert.deepEqual(pool.calls[1].values, ["going-word", me.user_id, "5"]);
  });

  it("returns the events a person is going to when the role is attending", async () => {
    const { pool, controller } = setup([{ rows: [{}] }, { rows: [{ event_id: 2 }] }]);
    const res = createRes();
    await controller.getUserEvents(request({ role: "attending" }), res);

    assert.deepEqual(res.body, [{ event_id: 2, role: "attending" }]);
    assert.match(pool.calls[1].sql, /going\.rsvp_status = \$1/);
  });

  it("returns both kinds, each tagged, when no role is asked for", async () => {
    const { pool, controller } = setup([{ rows: [{}] }, { rows: [{ event_id: 1 }] }, { rows: [{ event_id: 2 }] }]);
    const res = createRes();
    await controller.getUserEvents({ params: { userId: "5" }, query: {}, user: null }, res);

    assert.deepEqual(res.body, [{ event_id: 1, role: "created" }, { event_id: 2, role: "attending" }]);
    // An anonymous visitor has no personal answer on the events.
    assert.equal(pool.calls[1].values[1], null);
  });
});

describe("updateMe", () => {
  const request = (body) => ({ body, user: me });

  it("refuses fields that may not be changed, such as the role and the email, without touching the database", async () => {
    const { pool, controller } = setup();
    const res = createRes();
    await controller.updateMe(request({ user_type: "host", email: "x@y.z", password_hash: "x", city: "Austin" }), res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(Object.keys(res.body.details).sort(), ["email", "password_hash", "user_type"]);
    assert.equal(pool.calls.length, 0);
  });

  it("refuses an empty edit, an emptied name and a bad ZIP code", async () => {
    const { controller } = setup();
    const empty = createRes();
    await controller.updateMe(request({}), empty);
    assert.ok(empty.body.details.body);

    const bad = createRes();
    await controller.updateMe(request({ full_name: "  ", zipcode: "ABC" }), bad);
    assert.deepEqual(Object.keys(bad.body.details).sort(), ["full_name", "zipcode"]);
  });

  it("refuses a state that has no venues", async () => {
    const { controller } = setup([{ rows: [] }]);
    const res = createRes();
    await controller.updateMe(request({ state: "ZZ" }), res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.details.state);
  });

  it("changes only the fields that were sent, trims them, and saves empty optional fields as nothing", async () => {
    const saved = { user_id: me.user_id, full_name: "New Name" };
    const { pool, controller } = setup([{ rows: [{}] }, { rows: [saved] }]);
    const res = createRes();
    await controller.updateMe(request({ full_name: "  New Name  ", state: "TX", country: "", zipcode: "78701" }), res);

    assert.deepEqual([res.statusCode, res.body], [200, saved]);
    assert.match(pool.calls[1].sql, /^UPDATE users SET full_name = \$1, state = \$2, country = \$3, zipcode = \$4 WHERE user_id = \$5 RETURNING /);
    assert.deepEqual(pool.calls[1].values, ["New Name", "TX", null, "78701", me.user_id]);
    // The answer includes the person's private details but never the password or GitHub columns.
    assert.match(pool.calls[1].sql, /RETURNING .*email/);
    assert.doesNotMatch(pool.calls[1].sql, /password|github/);
  });
});

describe("time zones on a person's events", () => {
  it("gives each event the time zone of its venue, next to the role", async () => {
    const { controller } = setup([{ rows: [{}] }, { rows: [{ event_id: 1, latitude: 40.7128, longitude: -74.006 }] }]);
    const res = createRes();
    await controller.getUserEvents({ params: { userId: "5" }, query: { role: "created" }, user: me }, res);

    assert.equal(res.body[0].timezone, "America/New_York");
    assert.equal(res.body[0].role, "created");
  });
});
