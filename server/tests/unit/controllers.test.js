// These tests check the controllers and routes load and are wired together (no database needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import eventsController from "../../controllers/events.js";
import rsvpsController from "../../controllers/rsvps.js";
import usersController from "../../controllers/users.js";
import eventsRouter from "../../routes/events.js";
import rsvpsRouter from "../../routes/rsvps.js";
import usersRouter from "../../routes/users.js";

// List the GET paths a router answers, like ["/", "/:eventId"].
const getPaths = (router) => router.stack.filter((layer) => layer.route?.methods.get).map((layer) => layer.route.path);

describe("controllers", () => {
  it("export the functions the routes need", () => {
    // Each controller must export its functions by name, like the reference project.
    assert.deepEqual(Object.keys(eventsController).sort(), ["getEventById", "getEvents"]);
    assert.deepEqual(Object.keys(rsvpsController), ["getRsvps"]);
    assert.deepEqual(Object.keys(usersController).sort(), ["getUserById", "getUsers"]);
  });
});

describe("routes", () => {
  it("answer the expected GET paths", () => {
    assert.deepEqual(getPaths(eventsRouter), ["/", "/:eventId"]);
    assert.deepEqual(getPaths(rsvpsRouter), ["/"]);
    assert.deepEqual(getPaths(usersRouter), ["/", "/:userId"]);
  });
});

describe("rsvps controller", () => {
  it("refuses to list every RSVP when no filter is given", async () => {
    // Fake a request with no query filters and capture what the controller answers.
    let statusCode;
    let body;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
      },
    };
    await rsvpsController.getRsvps({ query: {} }, res);
    assert.equal(statusCode, 400);
    assert.match(body.error, /user_id/);
  });
});
