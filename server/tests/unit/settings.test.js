// These tests check the fixed user and RSVP values used by both the app and schema setup.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RSVP_STATUS, RSVP_STATUSES, USER_TYPE, USER_TYPES } from "../../domain/constants.js";

describe("domain constants", () => {
  it("defines the fixed user roles and attending RSVP status", () => {
    assert.equal(USER_TYPE.HOST, "host");
    assert.equal(USER_TYPE.ATTENDEE, "attendee");
    assert.deepEqual(USER_TYPES, [USER_TYPE.HOST, USER_TYPE.ATTENDEE]);
    assert.equal(RSVP_STATUS.ATTENDING, "attending");
    assert.equal(RSVP_STATUS.NOT_ATTENDING, "not_attending");
    assert.deepEqual(RSVP_STATUSES, [RSVP_STATUS.ATTENDING, RSVP_STATUS.NOT_ATTENDING]);
  });
});
