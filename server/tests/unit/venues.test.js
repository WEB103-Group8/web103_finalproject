// These tests check the venues controller with a pretend database and a pretend address lookup.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createVenuesController } from "../../controllers/venues.js";
import { createFakeGeocoder, sampleAddress } from "../helpers/fakes.js";
import { createFakePool } from "../helpers/fakePool.js";
import { createRes, withQuietErrors } from "../helpers/http.js";

// Made-up database rules, so these tests do not depend on any real length.
const rules = { allowedWords: {}, maxLengths: { "venues.venue_name": 30, "venues.address": 60 } };

// Build a controller wired to the pretend pieces.
const setup = ({ answers = [], geocode = createFakeGeocoder({ [sampleAddress.address]: sampleAddress.result }) } = {}) => {
  const pool = createFakePool(answers);
  const controller = createVenuesController({ pool, geocode, loadRules: async () => rules });
  return { pool, geocode, controller };
};

describe("getVenues", () => {
  it("filters by state and searches every typed word, using values and not text in the SQL", async () => {
    const { pool, controller } = setup({ answers: [{ rows: [{ venue_id: 1 }] }] });
    const res = createRes();
    await controller.getVenues({ query: { state: "TX", q: "hall austin" } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, [{ venue_id: 1 }]);
    assert.match(pool.calls[0].sql, /venues\.state = \$1/);
    assert.match(pool.calls[0].sql, /venues\.venue_name ILIKE \$2/);
    assert.deepEqual(pool.calls[0].values, ["TX", "%hall%", "%austin%"]);
  });

  it("lists everything when no filter is sent", async () => {
    const { pool, controller } = setup({ answers: [{ rows: [] }] });
    await controller.getVenues({ query: {} }, createRes());
    assert.doesNotMatch(pool.calls[0].sql, /WHERE/);
  });
});

describe("getVenueById", () => {
  it("answers 404 for an id that is not a number, without asking the database", async () => {
    const { pool, controller } = setup();
    const res = createRes();
    await controller.getVenueById({ params: { venueId: "abc" } }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(pool.calls.length, 0);
  });

  it("answers 404 for a venue that does not exist and 200 for one that does", async () => {
    const missing = setup({ answers: [{ rows: [] }] });
    const missingRes = createRes();
    await missing.controller.getVenueById({ params: { venueId: "9" } }, missingRes);
    assert.equal(missingRes.statusCode, 404);

    const found = setup({ answers: [{ rows: [{ venue_id: 9 }] }] });
    const foundRes = createRes();
    await found.controller.getVenueById({ params: { venueId: "9" } }, foundRes);
    assert.deepEqual([foundRes.statusCode, foundRes.body], [200, { venue_id: 9 }]);
  });
});

describe("lookupVenue", () => {
  it("rejects a blank address before looking anything up", async () => {
    const { geocode, controller } = setup();
    const res = createRes();
    await controller.lookupVenue({ body: { address: "   " } }, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.details.address);
    assert.equal(geocode.calls.length, 0);
  });

  it("returns the trimmed address with the place that was found", async () => {
    const { controller } = setup();
    const res = createRes();
    await controller.lookupVenue({ body: { address: `  ${sampleAddress.address}  ` } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { address: sampleAddress.address, ...sampleAddress.result });
  });

  it("answers 422 when the address cannot be found and 503 when the lookup is down or not set up", async () => {
    const geocode = createFakeGeocoder({ "down, TX": "unavailable" });
    const { controller } = setup({ geocode });

    const notFound = createRes();
    await controller.lookupVenue({ body: { address: "nowhere at all" } }, notFound);
    assert.equal(notFound.statusCode, 422);
    assert.ok(notFound.body.details.address);

    const down = createRes();
    await controller.lookupVenue({ body: { address: "down, TX" } }, down);
    assert.equal(down.statusCode, 503);

    const unconfigured = setup({
      geocode: async () => {
        throw Object.assign(new Error("Missing settings"), { code: "GEOCODER_NOT_CONFIGURED" });
      },
    });
    const notSetUp = createRes();
    await withQuietErrors(() => unconfigured.controller.lookupVenue({ body: { address: sampleAddress.address } }, notSetUp));
    assert.equal(notSetUp.statusCode, 503);
  });
});

describe("createVenue", () => {
  const body = { venue_name: "  Union Loft  ", address: `  ${sampleAddress.address}  ` };

  it("rejects missing or too-long input without looking anything up or saving", async () => {
    const { pool, geocode, controller } = setup();
    const res = createRes();
    await controller.createVenue({ body: { venue_name: "", address: "x".repeat(61) } }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(Object.keys(res.body.details).sort(), ["address", "venue_name"]);
    assert.equal(geocode.calls.length + pool.calls.length, 0);
  });

  it("saves the venue using the looked-up place and ignores coordinates sent by the browser", async () => {
    const saved = { venue_id: 5 };
    const { pool, geocode, controller } = setup({ answers: [{ rows: [saved] }] });
    const res = createRes();
    await controller.createVenue({ body: { ...body, city: "Fake City", state: "ZZ", latitude: 1, longitude: 2 } }, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, saved);
    assert.deepEqual(geocode.calls, [sampleAddress.address]);

    // The saved values are the trimmed name and address followed by the place the lookup found.
    const { city, state, postal_code, latitude, longitude } = sampleAddress.result;
    assert.deepEqual(pool.calls[0].values, ["Union Loft", sampleAddress.address, city, state, postal_code, latitude, longitude]);
  });

  it("answers 409 and points at the existing venue when it is already saved", async () => {
    const duplicate = Object.assign(new Error("duplicate key"), { code: "23505" });
    const { pool, controller } = setup({ answers: [duplicate, { rows: [{ venue_id: 9 }] }] });
    const res = createRes();
    await controller.createVenue({ body }, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.details.venue_id, 9);
    assert.match(pool.calls[1].sql, /SELECT venue_id FROM venues/);
  });

  it("saves nothing when the address cannot be found or the lookup is down", async () => {
    const notFound = setup({ geocode: createFakeGeocoder({}) });
    const notFoundRes = createRes();
    await notFound.controller.createVenue({ body }, notFoundRes);
    assert.equal(notFoundRes.statusCode, 422);
    assert.equal(notFound.pool.calls.length, 0);

    const down = setup({ geocode: createFakeGeocoder({ [sampleAddress.address]: "unavailable" }) });
    const downRes = createRes();
    await down.controller.createVenue({ body }, downRes);
    assert.equal(downRes.statusCode, 503);
    assert.equal(down.pool.calls.length, 0);
  });

  it("answers 500 for any other database failure", async () => {
    const { controller } = setup({ answers: [new Error("database is down")] });
    const res = createRes();
    await withQuietErrors(() => controller.createVenue({ body }, res));
    assert.equal(res.statusCode, 500);
  });
});
