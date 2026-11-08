// These tests check that every controller exports the functions the routes use, named like the reference project.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import citiesController from "../../controllers/cities.js";
import eventsController from "../../controllers/events.js";
import feedController from "../../controllers/feed.js";
import groupsController from "../../controllers/groups.js";
import rsvpsController from "../../controllers/rsvps.js";
import usersController from "../../controllers/users.js";
import venuesController from "../../controllers/venues.js";

// List the names a controller exports, sorted so the order does not matter.
const names = (controller) => Object.keys(controller).sort();

describe("controllers", () => {
  it("export the functions their routes need", () => {
    assert.deepEqual(names(citiesController), ["getCities"]);
    assert.deepEqual(names(eventsController), ["createEvent", "deleteEvent", "getEventById", "getEventOrganizerId", "getEventPins", "getEvents", "updateEvent"]);
    assert.deepEqual(names(feedController), ["getFeed"]);
    assert.deepEqual(names(groupsController), ["createGroup", "deleteGroup", "getGroupById", "getGroupMembers", "getGroupOrganizerId", "getGroups", "joinGroup", "leaveGroup", "updateGroup"]);
    assert.deepEqual(names(rsvpsController), ["createRsvp", "deleteRsvp", "getEventRsvps", "updateRsvp"]);
    assert.deepEqual(names(usersController), ["getUserById", "getUserEvents", "getUsers", "updateMe"]);
    assert.deepEqual(names(venuesController), ["createVenue", "getVenueById", "getVenues", "lookupVenue"]);
  });
});
