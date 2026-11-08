// These tests check the RSVP controller with a pretend database (no real one needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRsvpsController } from "../../controllers/rsvps.js";
import { SETTING } from "../../utils/settings.js";
import { fakeUsers } from "../helpers/fakes.js";
import { createFakePool } from "../helpers/fakePool.js";
import { createRes, withQuietErrors } from "../helpers/http.js";

// The setting that names the answer meaning "going", and made-up database rules listing the allowed answers.
process.env[SETTING.attendingStatus] = "going-word";
const rules = { allowedWords: { "rsvps.rsvp_status": ["going-word", "not-going"] }, maxLengths: {}, maxIntegers: {} };

// Build a controller wired to a pretend database that gives these answers in order.
const setup = (answers = []) => {
  const pool = createFakePool(answers);
  return { pool, controller: createRsvpsController({ pool, loadRules: async () => rules }) };
};

const user = fakeUsers.attendee;
const open = { rows: [{ capacity: 2, started: false }] };
const request = (body) => ({ params: { eventId: "9" }, body, user });
// Pick out the steps a transaction took, by the first word of each query.
const steps = (pool) => pool.calls.map((call) => call.sql.split(" ")[0]);

describe("createRsvp", () => {
  it("answers 404 for a bad event id and 400 for an answer the database does not allow, without starting a transaction", async () => {
    const bad = setup();
    const badRes = createRes();
    await bad.controller.createRsvp({ params: { eventId: "x" }, body: {}, user }, badRes);
    assert.equal(badRes.statusCode, 404);

    const wrong = setup();
    const wrongRes = createRes();
    await wrong.controller.createRsvp(request({ rsvp_status: "maybe" }), wrongRes);
    assert.equal(wrongRes.statusCode, 400);
    assert.ok(wrongRes.body.details.rsvp_status);
    assert.equal(bad.pool.connects + wrong.pool.connects, 0);
  });

  it("says the person is going when no answer is sent, counting the places first", async () => {
    const { pool, controller } = setup([{}, open, { rows: [] }, { rows: [{ attending: 1 }] }, { rows: [{ rsvp_id: 5 }] }, {}]);
    const res = createRes();
    await controller.createRsvp(request({}), res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(steps(pool), ["BEGIN", "SELECT", "SELECT", "SELECT", "INSERT", "COMMIT"]);
    // The event is locked while its places are counted.
    assert.match(pool.calls[1].sql, /FOR UPDATE/);
    assert.deepEqual(pool.calls[4].values, [user.user_id, "9", "going-word"]);
    assert.equal(pool.released, 1);
  });

  it("does not count places for an answer that is not 'going'", async () => {
    const { pool, controller } = setup([{}, open, { rows: [] }, { rows: [{ rsvp_id: 6 }] }, {}]);
    const res = createRes();
    await controller.createRsvp(request({ rsvp_status: "not-going" }), res);

    assert.equal(res.statusCode, 201);
    assert.equal(pool.calls.some((call) => call.sql.includes("COUNT")), false);
  });

  it("answers 409 when the event is full, and saves nothing", async () => {
    const { pool, controller } = setup([{}, open, { rows: [] }, { rows: [{ attending: 2 }] }, {}]);
    const res = createRes();
    await controller.createRsvp(request({}), res);

    assert.equal(res.statusCode, 409);
    assert.match(res.body.error, /full/);
    assert.equal(pool.calls.some((call) => call.sql.startsWith("INSERT")), false);
  });

  it("answers 409 when the person already answered, 400 when the event started, and 404 when it does not exist", async () => {
    const answered = setup([{}, open, { rows: [{}] }, {}]);
    const answeredRes = createRes();
    await answered.controller.createRsvp(request({}), answeredRes);
    assert.equal(answeredRes.statusCode, 409);

    const started = setup([{}, { rows: [{ capacity: 2, started: true }] }, {}]);
    const startedRes = createRes();
    await started.controller.createRsvp(request({}), startedRes);
    assert.equal(startedRes.statusCode, 400);

    const missing = setup([{}, { rows: [] }, {}]);
    const missingRes = createRes();
    await missing.controller.createRsvp(request({}), missingRes);
    assert.equal(missingRes.statusCode, 404);
  });

  it("undoes everything and answers 500 when a step fails", async () => {
    const { pool, controller } = setup([{}, open, { rows: [] }, { rows: [{ attending: 0 }] }, new Error("database is down"), {}]);
    const res = createRes();
    await withQuietErrors(() => controller.createRsvp(request({}), res));

    assert.equal(res.statusCode, 500);
    assert.ok(pool.calls.some((call) => call.sql === "ROLLBACK"));
    assert.equal(pool.released, 1);
  });
});

describe("updateRsvp", () => {
  const answered = (status) => ({ rows: [{ rsvp_id: 5, rsvp_status: status }] });

  it("refuses a missing or unknown answer before starting a transaction", async () => {
    const { pool, controller } = setup();
    for (const body of [{}, { rsvp_status: "maybe" }]) {
      const res = createRes();
      await controller.updateRsvp(request(body), res);
      assert.equal(res.statusCode, 400);
    }
    assert.equal(pool.connects, 0);
  });

  it("answers 404 when the person has not answered yet", async () => {
    const res = createRes();
    await setup([{}, open, { rows: [] }, {}]).controller.updateRsvp(request({ rsvp_status: "going-word" }), res);
    assert.equal(res.statusCode, 404);
  });

  it("changes nothing when the same answer is sent again", async () => {
    const { pool, controller } = setup([{}, open, answered("going-word"), {}]);
    const res = createRes();
    await controller.updateRsvp(request({ rsvp_status: "going-word" }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(pool.calls.some((call) => call.sql.startsWith("UPDATE")), false);
  });

  it("checks the places when switching to 'going', and answers 409 if the event is full", async () => {
    const { controller } = setup([{}, open, answered("not-going"), { rows: [{ attending: 2 }] }, {}]);
    const res = createRes();
    await controller.updateRsvp(request({ rsvp_status: "going-word" }), res);
    assert.equal(res.statusCode, 409);
  });

  it("switches to 'going' when there is room, and to another answer without counting", async () => {
    const toGoing = setup([{}, open, answered("not-going"), { rows: [{ attending: 1 }] }, { rows: [{ rsvp_id: 5, rsvp_status: "going-word" }] }, {}]);
    const goingRes = createRes();
    await toGoing.controller.updateRsvp(request({ rsvp_status: "going-word" }), goingRes);
    assert.equal(goingRes.statusCode, 200);
    assert.deepEqual(toGoing.pool.calls[4].values, ["going-word", 5]);

    const toNotGoing = setup([{}, open, answered("going-word"), { rows: [{ rsvp_id: 5, rsvp_status: "not-going" }] }, {}]);
    const notGoingRes = createRes();
    await toNotGoing.controller.updateRsvp(request({ rsvp_status: "not-going" }), notGoingRes);
    assert.equal(notGoingRes.statusCode, 200);
    assert.equal(toNotGoing.pool.calls.some((call) => call.sql.includes("COUNT")), false);
  });

  it("refuses a change once the event has started", async () => {
    const { controller } = setup([{}, { rows: [{ capacity: 2, started: true }] }, answered("going-word"), {}]);
    const res = createRes();
    await controller.updateRsvp(request({ rsvp_status: "not-going" }), res);
    assert.equal(res.statusCode, 400);
  });
});

describe("deleteRsvp", () => {
  it("answers 204 when the answer is removed, and 404 when there was none or the id is bad", async () => {
    const removed = createRes();
    await setup([{ rowCount: 1 }]).controller.deleteRsvp(request({}), removed);
    assert.deepEqual([removed.statusCode, removed.ended], [204, true]);

    const none = createRes();
    await setup([{ rowCount: 0 }]).controller.deleteRsvp(request({}), none);
    assert.equal(none.statusCode, 404);

    const bad = createRes();
    await setup().controller.deleteRsvp({ params: { eventId: "x" }, user }, bad);
    assert.equal(bad.statusCode, 404);
  });
});

describe("getEventRsvps", () => {
  it("answers 404 for a missing event", async () => {
    const res = createRes();
    await setup([{ rows: [] }]).controller.getEventRsvps({ params: { eventId: "9" } }, res);
    assert.equal(res.statusCode, 404);
  });

  it("lists who answered, with the capacity, the number going and a count for every answer", async () => {
    const rows = [
      { user_id: 1, rsvp_status: "going-word" },
      { user_id: 2, rsvp_status: "not-going" },
      { user_id: 3, rsvp_status: "going-word" },
    ];
    const { pool, controller } = setup([{ rows: [{ capacity: 30 }] }, { rows }]);
    const res = createRes();
    await controller.getEventRsvps({ params: { eventId: "9" } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { capacity: 30, attending: 2, counts: { "going-word": 2, "not-going": 1 }, rsvps: rows });
    assert.match(pool.calls[1].sql, /JOIN users ON users\.user_id = rsvps\.user_id/);
  });
});
