// These tests check the event input rules and the start and end time maths (no database needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSchedule, validateEventInput } from "../../utils/validators.js";

// Made-up database rules, so these tests do not depend on any real limit.
const rules = { allowedWords: {}, maxLengths: { "events.event_title": 12 }, maxIntegers: { "events.capacity": 500 } };

const valid = { group_id: 3, venue_id: 4, event_title: "Trivia", description: "Fun", date: "2026-12-01", time: "18:30", duration_minutes: 90, capacity: 40 };

describe("validateEventInput", () => {
  it("accepts a complete event, with whole numbers sent as numbers or as digits", () => {
    assert.deepEqual(validateEventInput(valid, rules), {});
    assert.deepEqual(validateEventInput({ ...valid, group_id: "3", capacity: "40", duration_minutes: "90", event_image_url: "https://example.com/a.png" }, rules), {});
    assert.deepEqual(validateEventInput({ ...valid, event_image_url: "" }, rules), {});
  });

  it("reports every missing field on an empty event", () => {
    const details = validateEventInput({}, rules);
    assert.deepEqual(Object.keys(details).sort(), ["capacity", "date", "description", "duration_minutes", "event_title", "group_id", "time", "venue_id"]);
  });

  it("refuses a title that is blank or longer than the column allows", () => {
    assert.ok(validateEventInput({ ...valid, event_title: "   " }, rules).event_title);
    assert.match(validateEventInput({ ...valid, event_title: "x".repeat(13) }, rules).event_title, /at most 12/);
  });

  it("refuses dates and times that are not real", () => {
    for (const date of ["2026-02-31", "2026-13-01", "12/01/2026", "tomorrow", ""]) {
      assert.ok(validateEventInput({ ...valid, date }, rules).date, date);
    }
    for (const time of ["24:00", "18:60", "6pm", "18:5", ""]) {
      assert.ok(validateEventInput({ ...valid, time }, rules).time, time);
    }
  });

  it("refuses a duration or capacity that is not a whole number above zero", () => {
    for (const bad of [0, -5, 1.5, "abc", null]) {
      assert.ok(validateEventInput({ ...valid, duration_minutes: bad }, rules).duration_minutes, String(bad));
      assert.ok(validateEventInput({ ...valid, capacity: bad }, rules).capacity, String(bad));
    }
  });

  it("refuses a capacity larger than the column can hold", () => {
    assert.deepEqual(validateEventInput({ ...valid, capacity: 500 }, rules), {});
    assert.match(validateEventInput({ ...valid, capacity: 501 }, rules).capacity, /at most 500/);
  });

  it("refuses an image that is not a web address", () => {
    assert.ok(validateEventInput({ ...valid, event_image_url: "not a url" }, rules).event_image_url);
  });

  it("checks only the fields that were sent when editing, and refuses an edit that changes nothing", () => {
    assert.deepEqual(validateEventInput({ capacity: 10 }, rules, { partial: true }), {});
    assert.ok(validateEventInput({ capacity: 0 }, rules, { partial: true }).capacity);
    assert.ok(validateEventInput({}, rules, { partial: true }).body);
  });
});

describe("buildSchedule", () => {
  const nowMs = Date.parse("2026-11-08T12:00:00Z");

  it("works out the start and end as plain clock times", () => {
    const schedule = buildSchedule(valid, nowMs);
    assert.deepEqual([schedule.start_time, schedule.end_time], ["2026-12-01T18:30:00", "2026-12-01T20:00:00"]);
  });

  it("carries a long event past midnight into the next day", () => {
    assert.equal(buildSchedule({ ...valid, time: "23:00", duration_minutes: 120 }, nowMs).end_time, "2026-12-02T01:00:00");
  });

  it("says whether the event starts after the given moment", () => {
    assert.equal(buildSchedule(valid, nowMs).startsInFuture, true);
    assert.equal(buildSchedule({ ...valid, date: "2026-11-01" }, nowMs).startsInFuture, false);
  });

  it("gives nothing back when the duration is so long that the end is not a real time", () => {
    assert.equal(buildSchedule({ ...valid, duration_minutes: 1e15 }, nowMs), null);
  });
});
