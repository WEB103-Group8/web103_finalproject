// These tests check who is let through by the access checks (no database needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requireHost, requireOrganizer, requireUser } from "../../utils/access.js";
import { SETTING } from "../../utils/settings.js";
import { fakeUsers } from "../helpers/fakes.js";
import { withQuietErrors } from "../helpers/http.js";

// The setting that names what a host is called, set to match the fake host.
process.env[SETTING.hostUserType] = fakeUsers.host.user_type;

// Run a check with a fake request and report what happened: the status code sent, or "next" if it let the request through.
async function run(check, user) {
  let outcome = "nothing";
  const res = {
    status(code) {
      outcome = code;
      return this;
    },
    json() {},
  };
  await check({ user }, res, () => {
    outcome = "next";
  });
  return outcome;
}

describe("requireUser", () => {
  it("stops people who are not logged in, including GitHub users who have not finished onboarding", async () => {
    assert.equal(await run(requireUser, fakeUsers.anonymous), 401);
    assert.equal(await run(requireUser, fakeUsers.newUser), 401);
  });

  it("lets attendees and hosts through", async () => {
    assert.equal(await run(requireUser, fakeUsers.attendee), "next");
    assert.equal(await run(requireUser, fakeUsers.host), "next");
  });
});

describe("requireHost", () => {
  it("asks anonymous visitors to log in, and refuses attendees", async () => {
    assert.equal(await run(requireHost, fakeUsers.anonymous), 401);
    assert.equal(await run(requireHost, fakeUsers.newUser), 401);
    assert.equal(await run(requireHost, fakeUsers.attendee), 403);
  });

  it("lets hosts through", async () => {
    assert.equal(await run(requireHost, fakeUsers.host), "next");
    assert.equal(await run(requireHost, fakeUsers.otherHost), "next");
  });

  it("follows the setting for what a host is called, and answers 500 if it is missing", async () => {
    const saved = process.env[SETTING.hostUserType];
    try {
      // A different word makes the fake host stop counting as a host.
      process.env[SETTING.hostUserType] = "organizer";
      assert.equal(await run(requireHost, fakeUsers.host), 403);

      // With no setting at all, the server cannot decide and says so.
      delete process.env[SETTING.hostUserType];
      assert.equal(await withQuietErrors(() => run(requireHost, fakeUsers.host)), 500);
    } finally {
      process.env[SETTING.hostUserType] = saved;
    }
  });
});

describe("requireOrganizer", () => {
  // Pretend the thing in the request is organized by the host with id 2 (ids can arrive as text).
  const organizedByHost = requireOrganizer(async () => String(fakeUsers.host.user_id));

  it("asks people who are not logged in to log in", async () => {
    assert.equal(await run(organizedByHost, fakeUsers.anonymous), 401);
    assert.equal(await run(organizedByHost, fakeUsers.newUser), 401);
  });

  it("lets only the organizer through", async () => {
    assert.equal(await run(organizedByHost, fakeUsers.host), "next");
    assert.equal(await run(organizedByHost, fakeUsers.otherHost), 403);
    assert.equal(await run(organizedByHost, fakeUsers.attendee), 403);
  });

  it("answers 404 when the thing does not exist", async () => {
    const missing = requireOrganizer(async () => null);
    assert.equal(await run(missing, fakeUsers.host), 404);
  });

  it("answers 500 instead of crashing when the lookup fails", async () => {
    const broken = requireOrganizer(async () => {
      throw new Error("database is down");
    });
    // Silence the expected error log for this test.
    const originalError = console.error;
    console.error = () => {};
    try {
      assert.equal(await run(broken, fakeUsers.host), 500);
    } finally {
      console.error = originalError;
    }
  });
});
