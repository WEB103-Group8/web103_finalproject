// These tests check that an event or a map pin gets the time zone of its venue, worked out from the map position.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addTimezone, addTimezones, timezoneAt } from "../../utils/timezone.js";

describe("timezoneAt", () => {
  it("finds the time zone of well-known places, including ones that do not change their clocks", () => {
    assert.equal(timezoneAt(30.2672, -97.7431), "America/Chicago");
    assert.equal(timezoneAt(40.7128, -74.006), "America/New_York");
    assert.equal(timezoneAt(34.0522, -118.2437), "America/Los_Angeles");
    assert.equal(timezoneAt(33.4484, -112.074), "America/Phoenix");
    assert.equal(timezoneAt(61.2181, -149.9003), "America/Anchorage");
    assert.equal(timezoneAt(21.3069, -157.8583), "Pacific/Honolulu");
  });

  it("tells apart places in the same state that use different clocks", () => {
    assert.equal(timezoneAt(31.7619, -106.485), "America/Denver");
    assert.equal(timezoneAt(32.7767, -96.797), "America/Chicago");
  });

  it("gives nothing for a position that cannot be used", () => {
    assert.equal(timezoneAt(200, 500), null);
  });
});

describe("addTimezone", () => {
  it("adds the zone of the venue to an event or pin, keeping everything else", () => {
    assert.deepEqual(addTimezone({ event_id: 1, latitude: 30.2672, longitude: -97.7431 }), { event_id: 1, latitude: 30.2672, longitude: -97.7431, timezone: "America/Chicago" });
  });

  it("leaves a row without a map position exactly as it was", () => {
    assert.deepEqual(addTimezone({ event_id: 1 }), { event_id: 1 });
  });

  it("works on a whole list", () => {
    assert.deepEqual(
      addTimezones([
        { latitude: 40.7128, longitude: -74.006 },
        { latitude: 21.3069, longitude: -157.8583 },
      ]).map((row) => row.timezone),
      ["America/New_York", "Pacific/Honolulu"],
    );
  });
});
