// These tests check that the test helpers themselves work.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFakeGeocoder, fakeUsers, sampleAddress } from "../helpers/fakes.js";

describe("test harness", () => {
  it("provides one fake user per role", () => {
    // Check each fake user has the right role and the two hosts are different people.
    assert.equal(fakeUsers.anonymous, null);
    assert.equal(fakeUsers.attendee.user_type, "attendee");
    assert.equal(fakeUsers.host.user_type, "host");
    assert.equal(fakeUsers.newUser.isNewUser, true);
    assert.notEqual(fakeUsers.host.user_id, fakeUsers.otherHost.user_id);
  });

  it("fake geocoder answers known addresses and records calls", async () => {
    // Look up a known address and check we get the canned answer back.
    const geocode = createFakeGeocoder({ [sampleAddress.address]: sampleAddress.result });
    const result = await geocode(sampleAddress.address);
    assert.equal(result.state, "TX");

    // Check the lookup was recorded.
    assert.deepEqual(geocode.calls, [sampleAddress.address]);
  });

  it("fake geocoder rejects unknown addresses and outages with error codes", async () => {
    // Set up one address that pretends the service is down.
    const geocode = createFakeGeocoder({ down: "unavailable" });

    // An unknown address and an outage must fail with their own error codes.
    await assert.rejects(() => geocode("nowhere"), { code: "ADDRESS_NOT_FOUND" });
    await assert.rejects(() => geocode("down"), { code: "GEOCODER_UNAVAILABLE" });
  });
});
