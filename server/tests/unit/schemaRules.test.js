// These tests check that the allowed words and text lengths are read back from the database rules (no database needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRulesLoader, loadSchemaRules, parseAllowedWords } from "../../utils/schemaRules.js";

// A pretend database that answers the two rule queries with prepared rows.
const createRulesPool = ({ checks = [], lengths = [], integers = [] } = {}) => {
  const pool = {
    queries: 0,
    async query(sql) {
      pool.queries += 1;
      if (sql.includes("pg_constraint")) return { rows: checks };
      if (sql.includes("numeric_precision")) return { rows: integers };
      return { rows: lengths };
    },
  };
  return pool;
};

describe("parseAllowedWords", () => {
  it("reads the column and words from a CHECK rule on a text column", () => {
    const rule = "CHECK ((category = ANY (ARRAY['Arts'::text, 'Food'::text])))";
    assert.deepEqual(parseAllowedWords(rule), { column: "category", words: ["Arts", "Food"] });
  });

  it("reads the column and words from a CHECK rule on a varchar column", () => {
    const rule = "CHECK (((user_type)::text = ANY ((ARRAY['host'::character varying, 'attendee'::character varying])::text[])))";
    assert.deepEqual(parseAllowedWords(rule), { column: "user_type", words: ["host", "attendee"] });
  });

  it("keeps a quote inside a word", () => {
    const rule = "CHECK ((label = ANY (ARRAY['Chef''s Table'::text])))";
    assert.deepEqual(parseAllowedWords(rule), { column: "label", words: ["Chef's Table"] });
  });

  it("ignores rules that do not list words", () => {
    assert.equal(parseAllowedWords("CHECK (((latitude >= '-90'::numeric) AND (latitude <= '90'::numeric)))"), null);
    assert.equal(parseAllowedWords("CHECK ((capacity > 0))"), null);
  });
});

describe("loadSchemaRules", () => {
  it("collects allowed words, maximum lengths and the biggest whole numbers keyed by table and column", async () => {
    const pool = createRulesPool({
      checks: [
        { table_name: "groups", definition: "CHECK ((category = ANY (ARRAY['Arts'::text, 'Food'::text])))" },
        { table_name: "events", definition: "CHECK ((capacity > 0))" },
      ],
      lengths: [{ table_name: "venues", column_name: "venue_name", character_maximum_length: 100 }],
      integers: [
        { table_name: "events", column_name: "capacity", numeric_precision: 32 },
        { table_name: "users", column_name: "user_id", numeric_precision: 64 },
      ],
    });
    assert.deepEqual(await loadSchemaRules(pool), {
      allowedWords: { "groups.category": ["Arts", "Food"] },
      maxLengths: { "venues.venue_name": 100 },
      // A 32-bit column holds up to 2^31 - 1; a 64-bit one is capped at the largest number JavaScript compares exactly.
      maxIntegers: { "events.capacity": 2 ** 31 - 1, "users.user_id": Number.MAX_SAFE_INTEGER },
    });
  });
});

describe("createRulesLoader", () => {
  it("reads the rules once and reuses them", async () => {
    const pool = createRulesPool();
    const load = createRulesLoader(pool);
    await load();
    await load();
    // One read is three queries (the checks, the lengths and the whole numbers).
    assert.equal(pool.queries, 3);
  });

  it("tries again after a failed read", async () => {
    let fail = true;
    const pool = {
      async query() {
        if (fail) throw new Error("database is down");
        return { rows: [] };
      },
    };
    const load = createRulesLoader(pool);
    await assert.rejects(load, /database is down/);
    fail = false;
    assert.deepEqual(await load(), { allowedWords: {}, maxLengths: {}, maxIntegers: {} });
  });
});
