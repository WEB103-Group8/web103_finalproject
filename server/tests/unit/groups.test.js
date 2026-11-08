// These tests check the groups controller with a pretend database.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGroupsController } from "../../controllers/groups.js";
import { fakeUsers } from "../helpers/fakes.js";
import { createFakePool } from "../helpers/fakePool.js";
import { createRes, withQuietErrors } from "../helpers/http.js";

// Made-up database rules, so these tests do not depend on any real list or length.
const rules = { allowedWords: { "groups.category": ["Alpha", "Beta"] }, maxLengths: { "groups.group_name": 20 } };

// Build a controller wired to a pretend database that gives these answers in order.
const setup = (answers = []) => {
  const pool = createFakePool(answers);
  return { pool, controller: createGroupsController({ pool, loadRules: async () => rules }) };
};

describe("getGroups", () => {
  it("filters, searches every typed word, and joins the organizer and member count", async () => {
    const { pool, controller } = setup([{ rows: [{ group_id: 1 }] }]);
    const res = createRes();
    await controller.getGroups({ query: { category: "Alpha", city: "Austin", q: "code coffee" } }, res);

    assert.equal(res.statusCode, 200);
    assert.match(pool.calls[0].sql, /JOIN users ON users\.user_id = groups\.organizer_id/);
    assert.match(pool.calls[0].sql, /LEFT JOIN members/);
    assert.match(pool.calls[0].sql, /GROUP BY/);
    assert.deepEqual(pool.calls[0].values, ["Alpha", "Austin", "%code%", "%coffee%"]);
  });
});

describe("getGroupById", () => {
  it("answers 404 for a bad or missing id", async () => {
    const bad = setup();
    const badRes = createRes();
    await bad.controller.getGroupById({ params: { groupId: "x" }, user: null }, badRes);
    assert.equal(badRes.statusCode, 404);
    assert.equal(bad.pool.calls.length, 0);

    const missing = setup([{ rows: [] }]);
    const missingRes = createRes();
    await missing.controller.getGroupById({ params: { groupId: "4" }, user: null }, missingRes);
    assert.equal(missingRes.statusCode, 404);
  });

  it("tells a logged-in visitor whether they joined, and does not guess for anonymous visitors", async () => {
    const anonymous = setup([{ rows: [{ group_id: 4 }] }]);
    const anonymousRes = createRes();
    await anonymous.controller.getGroupById({ params: { groupId: "4" }, user: null }, anonymousRes);
    assert.equal("is_member" in anonymousRes.body, false);

    const member = setup([{ rows: [{ group_id: 4 }] }, { rows: [{ "?column?": 1 }] }]);
    const memberRes = createRes();
    await member.controller.getGroupById({ params: { groupId: "4" }, user: fakeUsers.attendee }, memberRes);
    assert.equal(memberRes.body.is_member, true);

    const stranger = setup([{ rows: [{ group_id: 4 }] }, { rows: [] }]);
    const strangerRes = createRes();
    await stranger.controller.getGroupById({ params: { groupId: "4" }, user: fakeUsers.attendee }, strangerRes);
    assert.equal(strangerRes.body.is_member, false);
  });
});

describe("createGroup", () => {
  const body = { group_name: "  Cooks  ", category: "Alpha", description: "  ", group_image_url: "" };

  it("rejects invalid input without opening a transaction", async () => {
    const { pool, controller } = setup();
    const res = createRes();
    await controller.createGroup({ body: { group_name: "", category: "Gamma" }, user: fakeUsers.host }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(Object.keys(res.body.details).sort(), ["category", "group_name"]);
    assert.equal(pool.connects, 0);
  });

  it("saves the group and its organizer as the first member in one transaction", async () => {
    const { pool, controller } = setup([{}, { rows: [{ group_id: 8, group_name: "Cooks" }] }, {}, {}]);
    const res = createRes();
    await controller.createGroup({ body, user: fakeUsers.host }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.group_id, 8);
    // Steps in order: begin, add the group, add the organizer as a member, save everything.
    assert.deepEqual(pool.calls.map((call) => call.sql.split(" ")[0]), ["BEGIN", "INSERT", "INSERT", "COMMIT"]);
    // The name is trimmed, and a blank description and picture are saved as nothing.
    assert.deepEqual(pool.calls[1].values, [fakeUsers.host.user_id, "Cooks", null, "Alpha", null]);
    assert.deepEqual(pool.calls[2].values, [fakeUsers.host.user_id, 8]);
    assert.equal(pool.released, 1);
  });

  it("undoes everything and answers 500 when a step fails", async () => {
    const { pool, controller } = setup([{}, { rows: [{ group_id: 8 }] }, new Error("database is down"), {}]);
    const res = createRes();
    await withQuietErrors(() => controller.createGroup({ body, user: fakeUsers.host }, res));

    assert.equal(res.statusCode, 500);
    assert.ok(pool.calls.some((call) => call.sql === "ROLLBACK"));
    assert.equal(pool.calls.some((call) => call.sql === "COMMIT"), false);
    assert.equal(pool.released, 1);
  });
});

describe("updateGroup", () => {
  it("changes only the fields that were sent", async () => {
    const { pool, controller } = setup([{ rows: [{ group_id: 3, category: "Beta" }] }]);
    const res = createRes();
    await controller.updateGroup({ params: { groupId: "3" }, body: { category: "Beta" } }, res);

    assert.equal(res.statusCode, 200);
    assert.match(pool.calls[0].sql, /UPDATE groups SET category = \$1 WHERE group_id = \$2/);
    assert.deepEqual(pool.calls[0].values, ["Beta", "3"]);
  });

  it("rejects an invalid or empty edit before touching the database", async () => {
    const invalid = setup();
    const invalidRes = createRes();
    await invalid.controller.updateGroup({ params: { groupId: "3" }, body: { category: "Gamma" } }, invalidRes);
    assert.equal(invalidRes.statusCode, 400);

    const empty = setup();
    const emptyRes = createRes();
    await empty.controller.updateGroup({ params: { groupId: "3" }, body: {} }, emptyRes);
    assert.ok(emptyRes.body.details.body);
    assert.equal(invalid.pool.calls.length + empty.pool.calls.length, 0);
  });

  it("answers 404 when no group was changed", async () => {
    const { controller } = setup([{ rows: [] }]);
    const res = createRes();
    await controller.updateGroup({ params: { groupId: "3" }, body: { category: "Beta" } }, res);
    assert.equal(res.statusCode, 404);
  });
});

describe("deleteGroup", () => {
  it("answers 204 when deleted and 404 when there was nothing to delete", async () => {
    const deleted = createRes();
    await setup([{ rowCount: 1 }]).controller.deleteGroup({ params: { groupId: "3" } }, deleted);
    assert.deepEqual([deleted.statusCode, deleted.ended], [204, true]);

    const missing = createRes();
    await setup([{ rowCount: 0 }]).controller.deleteGroup({ params: { groupId: "3" } }, missing);
    assert.equal(missing.statusCode, 404);
  });
});

describe("joinGroup", () => {
  const request = { params: { groupId: "3" }, user: fakeUsers.attendee };

  it("answers 404 for a group that does not exist", async () => {
    const res = createRes();
    await setup([{ rows: [] }]).controller.joinGroup(request, res);
    assert.equal(res.statusCode, 404);
  });

  it("answers 201 the first time and 409 if the person already joined", async () => {
    const first = createRes();
    await setup([{ rows: [{ group_id: 3 }] }, { rows: [{ membership_id: 1 }] }]).controller.joinGroup(request, first);
    assert.equal(first.statusCode, 201);

    const again = createRes();
    await setup([{ rows: [{ group_id: 3 }] }, { rows: [] }]).controller.joinGroup(request, again);
    assert.equal(again.statusCode, 409);
  });
});

describe("leaveGroup", () => {
  it("answers 404 for a group that does not exist", async () => {
    const res = createRes();
    await setup([{ rows: [] }]).controller.leaveGroup({ params: { groupId: "3" }, user: fakeUsers.attendee }, res);
    assert.equal(res.statusCode, 404);
  });

  it("refuses to let the organizer leave, even when the id arrives as text", async () => {
    const res = createRes();
    const { pool, controller } = setup([{ rows: [{ organizer_id: String(fakeUsers.host.user_id) }] }]);
    await controller.leaveGroup({ params: { groupId: "3" }, user: fakeUsers.host }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(pool.calls.length, 1);
  });

  it("answers 204 for a member and 404 for someone who never joined", async () => {
    const organizer = { rows: [{ organizer_id: 99 }] };

    const left = createRes();
    await setup([organizer, { rowCount: 1 }]).controller.leaveGroup({ params: { groupId: "3" }, user: fakeUsers.attendee }, left);
    assert.deepEqual([left.statusCode, left.ended], [204, true]);

    const stranger = createRes();
    await setup([organizer, { rowCount: 0 }]).controller.leaveGroup({ params: { groupId: "3" }, user: fakeUsers.attendee }, stranger);
    assert.equal(stranger.statusCode, 404);
  });
});

describe("getGroupMembers", () => {
  it("answers 404 for a missing group and lists the members of a real one", async () => {
    const missing = createRes();
    await setup([{ rows: [] }]).controller.getGroupMembers({ params: { groupId: "3" } }, missing);
    assert.equal(missing.statusCode, 404);

    const { pool, controller } = setup([{ rows: [{ group_id: 3 }] }, { rows: [{ user_id: 1 }, { user_id: 2 }] }]);
    const res = createRes();
    await controller.getGroupMembers({ params: { groupId: "3" } }, res);
    assert.deepEqual([res.statusCode, res.body.length], [200, 2]);
    assert.match(pool.calls[1].sql, /JOIN users ON users\.user_id = members\.user_id/);
  });
});

describe("getGroupOrganizerId", () => {
  it("returns the organizer's id, or null for a bad id or a missing group", async () => {
    assert.equal(await setup([{ rows: [{ organizer_id: "7" }] }]).controller.getGroupOrganizerId({ params: { groupId: "3" } }), "7");
    assert.equal(await setup([{ rows: [] }]).controller.getGroupOrganizerId({ params: { groupId: "3" } }), null);

    const bad = setup();
    assert.equal(await bad.controller.getGroupOrganizerId({ params: { groupId: "nope" } }), null);
    assert.equal(bad.pool.calls.length, 0);
  });
});
