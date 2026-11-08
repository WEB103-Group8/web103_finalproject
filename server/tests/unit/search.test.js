// These tests check how typed search words become SQL conditions (no database needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addSearchConditions, escapeLike } from "../../utils/search.js";

describe("escapeLike", () => {
  it("turns % _ and \\ into plain characters", () => {
    assert.equal(escapeLike("50%_off\\"), "50\\%\\_off\\\\");
  });
});

describe("addSearchConditions", () => {
  it("adds one condition per word, each checking every column", () => {
    const values = ["first"];
    const conditions = [];
    addSearchConditions("austin  code", ["groups.group_name", "groups.description"], values, conditions);

    // The existing value stays first, so the new placeholders start at $2.
    assert.deepEqual(values, ["first", "%austin%", "%code%"]);
    assert.deepEqual(conditions, [
      "(groups.group_name ILIKE $2 OR groups.description ILIKE $2)",
      "(groups.group_name ILIKE $3 OR groups.description ILIKE $3)",
    ]);
  });

  it("adds nothing for an empty or missing search", () => {
    for (const search of [undefined, "", "   "]) {
      const values = [];
      const conditions = [];
      addSearchConditions(search, ["a"], values, conditions);
      assert.deepEqual([values, conditions], [[], []]);
    }
  });

  it("never puts typed text into the SQL itself", () => {
    const values = [];
    const conditions = [];
    addSearchConditions("x'; DROP TABLE users; --", ["a"], values, conditions);
    assert.ok(conditions.every((condition) => !condition.includes("DROP")));
    assert.ok(values.some((value) => value.includes("DROP")));
  });
});
