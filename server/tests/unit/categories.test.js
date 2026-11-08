// These tests check the categories controller with a pretend database (no real one needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCategoriesController } from "../../controllers/categories.js";
import { createFakePool } from "../helpers/fakePool.js";
import { createRes, withQuietErrors } from "../helpers/http.js";

describe("getCategories", () => {
  it("gives every category the groups use, each once and in order", async () => {
    const pool = createFakePool([{ rows: [{ category: "Alpha" }, { category: "Beta" }] }]);
    const res = createRes();
    await createCategoriesController({ pool }).getCategories({}, res);

    assert.deepEqual([res.statusCode, res.body], [200, ["Alpha", "Beta"]]);
    assert.match(pool.calls[0].sql, /SELECT DISTINCT category FROM groups ORDER BY category/);
  });

  it("gives an empty list when there are no groups yet", async () => {
    const res = createRes();
    await createCategoriesController({ pool: createFakePool([{ rows: [] }]) }).getCategories({}, res);

    assert.deepEqual(res.body, []);
  });

  it("answers with an error when the database fails", async () => {
    const pool = createFakePool([]);
    pool.query = async () => {
      throw new Error("down");
    };
    const res = createRes();
    await withQuietErrors(() => createCategoriesController({ pool }).getCategories({}, res));

    assert.equal(res.statusCode, 500);
  });
});
