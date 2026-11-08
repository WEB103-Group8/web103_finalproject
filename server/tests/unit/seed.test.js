// These tests check the data files in server/data against the specs (no database needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TABLES } from "../../config/reset.js";
import eventData from "../../data/events.js";
import groupData from "../../data/groups.js";
import memberData from "../../data/members.js";
import rsvpData from "../../data/rsvps.js";
import userData from "../../data/users.js";
import venueData from "../../data/venues.js";

// The columns each table must have, copied from the ERD (in the same order).
const ERD_COLUMNS = {
  users: ["user_id", "full_name", "email", "password_hash", "city", "state", "country", "zipcode", "user_image_url", "user_type", "github_id", "github_username", "is_onboarded"],
  venues: ["venue_id", "venue_name", "address", "city", "state", "postal_code", "latitude", "longitude"],
  groups: ["group_id", "organizer_id", "group_name", "description", "category", "group_image_url"],
  members: ["membership_id", "user_id", "group_id", "joined_at"],
  events: ["event_id", "group_id", "venue_id", "event_title", "description", "start_time", "end_time", "capacity", "event_image_url"],
  rsvps: ["rsvp_id", "user_id", "event_id", "rsvp_status"],
};

// The fixed choices from the data model.
const USER_TYPES = ["host", "attendee"];
const RSVP_STATUSES = ["attending", "not_attending"];
const CATEGORIES = ["Technology", "Arts", "Food", "Outdoors", "Career", "Community", "Music", "Wellness", "Education", "Games"];

// Put the data files in one object so the tests can loop over them.
const data = { users: userData, venues: venueData, groups: groupData, members: memberData, events: eventData, rsvps: rsvpData };

// Put a list of records into a Map keyed by their id column.
const byId = (rows, idColumn) => new Map(rows.map((row) => [row[idColumn], row]));

// Look up records by id, the same way a SQL join would.
const users = byId(userData, "user_id");
const groups = byId(groupData, "group_id");
const venues = byId(venueData, "venue_id");
const events = byId(eventData, "event_id");

describe("reset table list", () => {
  it("fills the tables in an order where each one only points at earlier tables", () => {
    // Check the order matches the order the foreign keys need.
    assert.deepEqual(TABLES.map((table) => table.name), ["users", "venues", "groups", "members", "events", "rsvps"]);
  });

  it("uses the data files as its records", () => {
    // Check each table in the list holds the same records as its data file.
    for (const table of TABLES) assert.equal(table.rows, data[table.name], table.name);
  });
});

describe("data files", () => {
  it("are not empty", () => {
    // Every table needs at least one record.
    for (const [table, rows] of Object.entries(data)) assert.ok(rows.length > 0, `${table} is empty`);
  });

  it("give every record exactly the columns from the ERD", () => {
    // Compare each record's column names with the ERD list.
    for (const [table, columns] of Object.entries(ERD_COLUMNS)) {
      for (const row of data[table]) {
        assert.deepEqual(Object.keys(row), columns, `${table} record ${JSON.stringify(row).slice(0, 60)}`);
      }
    }
  });

  it("number every table's ids 1, 2, 3... in order", () => {
    // Check each table's id column counts up from 1 with no gaps.
    for (const [table, rows] of Object.entries(data)) {
      const idColumn = ERD_COLUMNS[table][0];
      assert.deepEqual(rows.map((row) => row[idColumn]), rows.map((_, index) => index + 1), table);
    }
  });

  it("point every link at a record that exists", () => {
    for (const group of groupData) assert.ok(users.has(group.organizer_id), `group ${group.group_id} organizer`);
    for (const member of memberData) assert.ok(users.has(member.user_id) && groups.has(member.group_id), `member ${member.membership_id}`);
    for (const event of eventData) assert.ok(groups.has(event.group_id) && venues.has(event.venue_id), `event ${event.event_id}`);
    for (const rsvp of rsvpData) assert.ok(users.has(rsvp.user_id) && events.has(rsvp.event_id), `rsvp ${rsvp.rsvp_id}`);
  });
});

describe("users", () => {
  it("have unique emails and only allowed types", () => {
    // Put all emails in a set and compare sizes.
    const emails = userData.map((user) => user.email);
    assert.equal(new Set(emails).size, emails.length);
    assert.ok(emails.every((email) => email.endsWith("@example.test")));
    assert.ok(userData.every((user) => USER_TYPES.includes(user.user_type)));
  });

  it("have a full location, no password and no GitHub login", () => {
    for (const user of userData) {
      assert.equal(user.password_hash, null);
      assert.equal(user.github_id, null);
      assert.equal(user.country, "United States");
      assert.match(user.zipcode, /^\d{5}$/);
      assert.match(user.state, /^[A-Z]{2}$/);
      assert.ok(user.city);
    }
  });

  it("include at least one host and one attendee in every city", () => {
    // Group the users by city and state, then count each type.
    const cities = new Map();
    for (const user of userData) {
      const key = `${user.city}|${user.state}`;
      cities.set(key, [...(cities.get(key) ?? []), user.user_type]);
    }
    for (const [city, types] of cities) {
      assert.ok(types.includes("host") && types.includes("attendee"), `${city} needs a host and an attendee`);
    }
  });
});

describe("venues", () => {
  it("cover all 50 states plus DC, with at least 2 cities per state except DC", () => {
    // Collect the cities seen in each state.
    const citiesByState = new Map();
    for (const venue of venueData) {
      citiesByState.set(venue.state, new Set([...(citiesByState.get(venue.state) ?? []), venue.city]));
    }
    assert.equal(citiesByState.size, 51);
    assert.ok(citiesByState.has("DC"));
    for (const [state, cities] of citiesByState) {
      if (state !== "DC") assert.ok(cities.size >= 2, `${state} has only ${cities.size} cities`);
    }
  });

  it("have valid coordinates, a ZIP code and a unique name, address and city", () => {
    const seen = new Set();
    for (const venue of venueData) {
      assert.ok(venue.latitude >= -90 && venue.latitude <= 90, `venue ${venue.venue_id} latitude`);
      assert.ok(venue.longitude >= -180 && venue.longitude <= 180, `venue ${venue.venue_id} longitude`);
      assert.match(venue.postal_code, /^\d{5}$/);
      assert.match(venue.state, /^[A-Z]{2}$/);

      // No two venues may share the same name, address and city.
      const id = `${venue.venue_name}|${venue.address}|${venue.city}`;
      assert.equal(seen.has(id), false, `duplicate venue ${id}`);
      seen.add(id);
    }
  });
});

describe("groups", () => {
  it("are run by hosts and use only allowed categories", () => {
    for (const group of groupData) {
      assert.equal(users.get(group.organizer_id).user_type, "host");
      assert.ok(CATEGORIES.includes(group.category), `group ${group.group_id} category`);
    }
  });

  it("use every category at least once", () => {
    assert.equal(new Set(groupData.map((group) => group.category)).size, CATEGORIES.length);
  });
});

describe("members", () => {
  it("have no duplicate memberships", () => {
    // Check no user joins the same group twice.
    const pairs = memberData.map((member) => `${member.user_id}|${member.group_id}`);
    assert.equal(new Set(pairs).size, pairs.length);
  });

  it("include every organizer in their own groups", () => {
    // Build a set of "user|group" pairs for quick checks.
    const pairs = new Set(memberData.map((member) => `${member.user_id}|${member.group_id}`));
    for (const group of groupData) {
      assert.ok(pairs.has(`${group.organizer_id}|${group.group_id}`), `group ${group.group_id} organizer is not a member`);
    }
  });
});

describe("events", () => {
  it("end after they start and have a positive capacity", () => {
    for (const event of eventData) {
      assert.ok(event.end_time > event.start_time, `event ${event.event_id} times`);
      assert.ok(event.capacity > 0, `event ${event.event_id} capacity`);
    }
  });

  it("happen at a venue in their organizer's city", () => {
    for (const event of eventData) {
      const organizer = users.get(groups.get(event.group_id).organizer_id);
      const venue = venues.get(event.venue_id);
      assert.equal(venue.city, organizer.city);
      assert.equal(venue.state, organizer.state);
    }
  });

  it("cover every state and every category", () => {
    assert.equal(new Set(eventData.map((event) => venues.get(event.venue_id).state)).size, 51);
    assert.equal(new Set(eventData.map((event) => groups.get(event.group_id).category)).size, CATEGORIES.length);
  });
});

describe("rsvps", () => {
  it("have no duplicates and only allowed statuses", () => {
    // Check no user RSVPs to the same event twice.
    const pairs = rsvpData.map((rsvp) => `${rsvp.user_id}|${rsvp.event_id}`);
    assert.equal(new Set(pairs).size, pairs.length);
    assert.ok(rsvpData.every((rsvp) => RSVP_STATUSES.includes(rsvp.rsvp_status)));
  });

  it("never put more attending people at an event than its capacity", () => {
    // Count attending RSVPs per event.
    const attending = new Map();
    for (const rsvp of rsvpData) {
      if (rsvp.rsvp_status === "attending") attending.set(rsvp.event_id, (attending.get(rsvp.event_id) || 0) + 1);
    }
    // Compare each count with the event's capacity.
    for (const event of eventData) {
      assert.ok((attending.get(event.event_id) || 0) <= event.capacity, `event ${event.event_id} is over capacity`);
    }
  });
});
