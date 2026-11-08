// These tests check every route and that each is protected the way the access rules say.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import categoriesRouter from "../../routes/categories.js";
import citiesRouter from "../../routes/cities.js";
import eventsRouter from "../../routes/events.js";
import feedRouter from "../../routes/feed.js";
import groupsRouter from "../../routes/groups.js";
import usersRouter from "../../routes/users.js";
import venuesRouter from "../../routes/venues.js";

// Describe each route as "METHOD path (number of handlers)"; more than one handler means an access check comes first.
const describeRoutes = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route.path} (${layer.route.stack.length})`));

describe("open routes", () => {
  it("categories can be read by anyone", () => {
    assert.deepEqual(describeRoutes(categoriesRouter), ["GET / (1)"]);
  });

  it("cities can be read by anyone", () => {
    assert.deepEqual(describeRoutes(citiesRouter), ["GET / (1)"]);
  });
});

describe("users routes", () => {
  it("can be read by anyone, but only a logged-in person can edit their own profile; the me route comes before the id routes", () => {
    assert.deepEqual(describeRoutes(usersRouter), ["GET / (1)", "GET /me (2)", "PATCH /me (2)", "GET /:userId (1)", "GET /:userId/events (1)", "GET /:userId/groups (1)"]);
  });
});

describe("feed routes", () => {
  it("need a logged-in person", () => {
    assert.deepEqual(describeRoutes(feedRouter), ["GET / (2)"]);
  });
});

describe("events routes", () => {
  it("are open to read, protected for changing events, and need a login to answer; the pins and rsvp-statuses routes come before the id route", () => {
    assert.deepEqual(describeRoutes(eventsRouter), [
      "GET / (1)",
      "POST / (2)",
      "GET /pins (1)",
      "GET /rsvp-statuses (1)",
      "GET /:eventId (1)",
      "PATCH /:eventId (2)",
      "DELETE /:eventId (2)",
      "GET /:eventId/rsvps (2)",
      "POST /:eventId/rsvps (2)",
      "PATCH /:eventId/rsvps/me (2)",
      "DELETE /:eventId/rsvps/me (2)",
    ]);
  });
});

describe("groups routes", () => {
  it("are open to read, and protected for creating, editing, deleting, joining and leaving", () => {
    assert.deepEqual(describeRoutes(groupsRouter), [
      "GET / (1)",
      "POST / (2)",
      "GET /:groupId (1)",
      "PATCH /:groupId (2)",
      "DELETE /:groupId (2)",
      "GET /:groupId/members (1)",
      "POST /:groupId/members (2)",
      "DELETE /:groupId/members/me (2)",
    ]);
  });
});

describe("venues routes", () => {
  it("are open to read, and only hosts can look up or add a venue", () => {
    assert.deepEqual(describeRoutes(venuesRouter), ["GET / (1)", "POST /lookup (2)", "POST / (2)", "GET /:venueId (1)"]);
  });
});
