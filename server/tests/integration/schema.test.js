// These tests check the real tables, constraints and rules in a real Postgres, inside a throwaway schema.
import "../helpers/useTestSchema.js";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { fillTestSchema, pool, setUpTestDatabase, tearDownTestDatabase, TABLES } from "../helpers/testDatabase.js";
import { loadSchemaRules } from "../../utils/schemaRules.js";

before(setUpTestDatabase);
after(tearDownTestDatabase);

// Count the rows in every table.
const countRows = async (client = pool) => {
  const counts = {};
  for (const { name } of TABLES) counts[name] = (await client.query(`SELECT COUNT(*)::int AS total FROM ${name}`)).rows[0].total;
  return counts;
};

// Run a query that the database must refuse, and return the error code it gave.
const refusedWith = async (sql, values = []) => {
  try {
    await pool.query(sql, values);
  } catch (error) {
    return error.code;
  }
  return "accepted";
};

describe("tables", () => {
  it("has exactly the tables from the ERD, and users have no map coordinates", async () => {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name");
    assert.deepEqual(tables.rows.map((row) => row.table_name), TABLES.map((table) => table.name).sort());

    const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users'");
    const names = columns.rows.map((row) => row.column_name);
    assert.ok(!names.includes("latitude") && !names.includes("longitude"));
    assert.ok(names.includes("password_hash") && names.includes("zipcode") && names.includes("github_id"));
  });

  it("holds every record from the data files", async () => {
    const counts = await countRows();
    for (const { name, rows } of TABLES) assert.equal(counts[name], rows.length, name);
  });

  it("joins up: every group, member, event and RSVP finds all its related records", async () => {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM groups) AS groups,
        (SELECT COUNT(*)::int FROM groups JOIN users ON users.user_id = groups.organizer_id) AS groups_joined,
        (SELECT COUNT(*)::int FROM members) AS members,
        (SELECT COUNT(*)::int FROM members JOIN users ON users.user_id = members.user_id JOIN groups ON groups.group_id = members.group_id) AS members_joined,
        (SELECT COUNT(*)::int FROM events) AS events,
        (SELECT COUNT(*)::int FROM events JOIN groups ON groups.group_id = events.group_id JOIN venues ON venues.venue_id = events.venue_id) AS events_joined,
        (SELECT COUNT(*)::int FROM rsvps) AS rsvps,
        (SELECT COUNT(*)::int FROM rsvps JOIN users ON users.user_id = rsvps.user_id JOIN events ON events.event_id = rsvps.event_id) AS rsvps_joined`);
    for (const name of ["groups", "members", "events", "rsvps"]) assert.equal(rows[0][name], rows[0][`${name}_joined`], name);
  });
});

describe("constraints", () => {
  it("refuses a second membership or RSVP for the same pair", async () => {
    assert.equal(await refusedWith("INSERT INTO members (user_id, group_id) SELECT user_id, group_id FROM members LIMIT 1"), "23505");
    assert.equal(await refusedWith("INSERT INTO rsvps (user_id, event_id, rsvp_status) SELECT user_id, event_id, rsvp_status FROM rsvps LIMIT 1"), "23505");
  });

  it("refuses a venue that repeats an existing name, address and city", async () => {
    assert.equal(
      await refusedWith("INSERT INTO venues (venue_name, address, city, state, postal_code, latitude, longitude) SELECT venue_name, address, city, state, postal_code, latitude, longitude FROM venues LIMIT 1"),
      "23505",
    );
  });

  it("refuses an event that ends when it starts, or has no places", async () => {
    const insert = (start, end, capacity) =>
      refusedWith(
        "INSERT INTO events (group_id, venue_id, event_title, description, start_time, end_time, capacity) SELECT group_id, venue_id, 'x', 'x', $1, $2, $3 FROM events LIMIT 1",
        [start, end, capacity],
      );
    assert.equal(await insert("2030-01-01 10:00", "2030-01-01 10:00", 5), "23514");
    assert.equal(await insert("2030-01-01 10:00", "2030-01-01 11:00", 0), "23514");
  });

  it("refuses words the columns do not allow", async () => {
    assert.equal(await refusedWith("INSERT INTO groups (organizer_id, group_name, category) SELECT organizer_id, 'x', 'Nonsense' FROM groups LIMIT 1"), "23514");
    assert.equal(await refusedWith("INSERT INTO rsvps (user_id, event_id, rsvp_status) SELECT user_id, event_id + 0, 'maybe' FROM rsvps LIMIT 1"), "23514");
    assert.equal(await refusedWith("INSERT INTO users (full_name, city, user_type) VALUES ('x', 'x', 'stranger')"), "23514");
  });

  it("refuses a state that is not two capital letters", async () => {
    assert.equal(
      await refusedWith("INSERT INTO venues (venue_name, address, city, state, postal_code, latitude, longitude) VALUES ('x', 'y', 'z', 'tx', '12345', 1, 1)"),
      "23514",
    );
  });
});

describe("relationships", () => {
  it("removes a group's events, members and the answers on those events when the group is deleted", async () => {
    const client = await pool.connect();
    try {
      // Pick a group that has events with answers, and delete it inside a transaction that is undone afterwards.
      const group = (await client.query("SELECT events.group_id FROM events JOIN rsvps ON rsvps.event_id = events.event_id LIMIT 1")).rows[0].group_id;
      const before = await countRows(client);

      await client.query("BEGIN");
      await client.query("DELETE FROM groups WHERE group_id = $1", [group]);
      const during = await countRows(client);
      await client.query("ROLLBACK");

      assert.ok(during.groups < before.groups && during.events < before.events && during.members < before.members && during.rsvps < before.rsvps);
      assert.deepEqual(await countRows(client), before);
    } finally {
      client.release();
    }
  });

  it("keeps the id counters in step with the loaded data, so a new record does not clash", async () => {
    const client = await pool.connect();
    try {
      const word = (await client.query("SELECT user_type FROM users LIMIT 1")).rows[0].user_type;
      const biggest = (await client.query("SELECT MAX(user_id) AS id FROM users")).rows[0].id;

      await client.query("BEGIN");
      const created = await client.query("INSERT INTO users (full_name, city, user_type) VALUES ('Counter Check', 'Nowhere', $1) RETURNING user_id", [word]);
      await client.query("ROLLBACK");

      assert.ok(created.rows[0].user_id > biggest);
    } finally {
      client.release();
    }
  });

  it("can be reset again and ends up with the same rows", async () => {
    const client = await pool.connect();
    try {
      const before = await countRows(client);
      await client.query("BEGIN");
      await fillTestSchema(client);
      await client.query("COMMIT");
      assert.deepEqual(await countRows(client), before);
    } finally {
      client.release();
    }
  });
});

describe("rules read back from the database", () => {
  it("finds the allowed words, the text lengths and the biggest whole numbers the API relies on", async () => {
    const rules = await loadSchemaRules(pool);

    // Allowed words match what the data files use.
    const used = (table, column) => [...new Set(TABLES.find((entry) => entry.name === table).rows.map((row) => row[column]))].sort();
    assert.deepEqual([...rules.allowedWords["groups.category"]].sort(), used("groups", "category"));
    assert.deepEqual([...rules.allowedWords["users.user_type"]].sort(), used("users", "user_type"));
    assert.deepEqual([...rules.allowedWords["rsvps.rsvp_status"]].sort(), used("rsvps", "rsvp_status"));

    // Text limits exist for the columns the validators check.
    for (const key of ["venues.venue_name", "venues.address", "groups.group_name", "events.event_title"]) {
      assert.ok(Number.isInteger(rules.maxLengths[key]) && rules.maxLengths[key] > 0, key);
    }

    // A 32-bit INTEGER column holds up to 2^31 - 1.
    assert.equal(rules.maxIntegers["events.capacity"], 2 ** 31 - 1);
  });
});
