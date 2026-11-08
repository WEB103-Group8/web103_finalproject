// These tests check the temporary test-login controller with a pretend database (no real one needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDevLoginController } from "../../controllers/devLogin.js";
import { SETTING } from "../../utils/settings.js";
import { createFakePool } from "../helpers/fakePool.js";
import { createRes, withQuietErrors } from "../helpers/http.js";

process.env[SETTING.hostUserType] = "host-word";

describe("getTestUsers", () => {
  it("gives a few hosts and a few attendees, using the host word from the settings", async () => {
    const pool = createFakePool([{ rows: [{ user_id: 1 }] }, { rows: [{ user_id: 2 }] }]);
    const res = createRes();
    await createDevLoginController({ pool }).getTestUsers({}, res);

    assert.deepEqual([res.statusCode, res.body], [200, { hosts: [{ user_id: 1 }], attendees: [{ user_id: 2 }] }]);
    assert.ok(pool.calls.every((call) => call.values[0] === "host-word"));
  });
});

describe("loginAs", () => {
  it("logs the browser in as the chosen person", async () => {
    const pool = createFakePool([{ rows: [{ user_id: 4, full_name: "Ana Lee" }] }]);
    let loggedIn = null;
    const res = createRes();
    await createDevLoginController({ pool }).loginAs({ body: { user_id: 4 }, login: (user, done) => ((loggedIn = user), done()) }, res);

    assert.deepEqual([res.statusCode, res.body], [200, { user_id: 4, full_name: "Ana Lee" }]);
    assert.equal(loggedIn.user_id, 4);
  });

  it("answers 404 for a missing or unknown person without logging anyone in", async () => {
    const login = () => assert.fail("nobody should be logged in");
    const bad = createRes();
    await createDevLoginController({ pool: createFakePool([]) }).loginAs({ body: { user_id: "x" }, login }, bad);
    const unknown = createRes();
    await createDevLoginController({ pool: createFakePool([{ rows: [] }]) }).loginAs({ body: { user_id: 99 }, login }, unknown);

    assert.deepEqual([bad.statusCode, unknown.statusCode], [404, 404]);
  });

  it("answers 500 when the session cannot be started", async () => {
    const pool = createFakePool([{ rows: [{ user_id: 4 }] }]);
    const res = createRes();
    await withQuietErrors(() => createDevLoginController({ pool }).loginAs({ body: { user_id: 4 }, login: (user, done) => done(new Error("no session")) }, res));

    assert.equal(res.statusCode, 500);
  });
});
