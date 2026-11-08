// These tests check the address lookup with a pretend service (no internet needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SETTING_NAMES, createGeocoder, parseResult, readGeocoderConfig } from "../../utils/geocoder.js";

// The settings the lookup would normally read from the environment, made up for these tests.
const config = { url: "https://lookup.test/search", userAgent: "TestApp/1.0", countryCode: "us", timeoutMs: 25, minGapMs: 1000 };

// A result shaped like the service's answer for a good address.
const austin = {
  lat: "30.2672",
  lon: "-97.7431",
  address: { road: "W 2nd St", city: "Austin", state: "Texas", "ISO3166-2-lvl4": "US-TX", postcode: "78701", country_code: "us" },
};

// A pretend service response.
const answer = (body, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => body });

describe("readGeocoderConfig", () => {
  // Build a complete set of settings using the real variable names.
  const complete = {
    [SETTING_NAMES.url]: "https://lookup.test/search",
    [SETTING_NAMES.userAgent]: "TestApp/1.0",
    [SETTING_NAMES.countryCode]: "US",
    [SETTING_NAMES.timeoutMs]: "8000",
    [SETTING_NAMES.minGapMs]: "1000",
  };

  it("reads every setting and turns the numbers and country code into the right form", () => {
    assert.deepEqual(readGeocoderConfig(complete), { url: "https://lookup.test/search", userAgent: "TestApp/1.0", countryCode: "us", timeoutMs: 8000, minGapMs: 1000 });
  });

  it("names every missing or invalid setting", () => {
    const broken = { ...complete, [SETTING_NAMES.url]: "", [SETTING_NAMES.timeoutMs]: "soon" };
    assert.throws(() => readGeocoderConfig(broken), (error) => {
      assert.equal(error.code, "GEOCODER_NOT_CONFIGURED");
      assert.match(error.message, new RegExp(SETTING_NAMES.url));
      assert.match(error.message, new RegExp(SETTING_NAMES.timeoutMs));
      return true;
    });
  });
});

describe("parseResult", () => {
  it("returns the city, state, ZIP and coordinates", () => {
    assert.deepEqual(parseResult([austin], "us"), { city: "Austin", state: "TX", postal_code: "78701", latitude: 30.2672, longitude: -97.7431 });
  });

  it("accepts a town, village or hamlet when there is no city, and DC as a state", () => {
    const town = { ...austin, address: { ...austin.address, city: undefined, town: "Smallville" } };
    assert.equal(parseResult([town], "us").city, "Smallville");
    const dc = { ...austin, address: { ...austin.address, city: "Washington", "ISO3166-2-lvl4": "US-DC" } };
    assert.equal(parseResult([dc], "us").state, "DC");
  });

  it("rejects empty answers, other countries and addresses missing a ZIP, city, state or position", () => {
    const withAddress = (changes) => [{ ...austin, address: { ...austin.address, ...changes } }];
    const cases = [
      [],
      undefined,
      withAddress({ country_code: "ca", "ISO3166-2-lvl4": "CA-ON" }),
      withAddress({ postcode: undefined }),
      withAddress({ city: undefined }),
      withAddress({ "ISO3166-2-lvl4": undefined }),
      [{ ...austin, lat: "nowhere" }],
    ];
    for (const results of cases) {
      assert.throws(() => parseResult(results, "us"), { code: "ADDRESS_NOT_FOUND" });
    }
  });

  it("uses the country it is given, not a fixed one", () => {
    const toronto = { lat: "43.65", lon: "-79.38", address: { city: "Toronto", "ISO3166-2-lvl4": "CA-ON", postcode: "M5V", country_code: "ca" } };
    assert.equal(parseResult([toronto], "ca").state, "ON");
  });
});

describe("createGeocoder", () => {
  it("asks the service for one result in the right country and returns the parsed place", async () => {
    let requested;
    const geocode = createGeocoder({
      config,
      now: () => 10_000,
      fetchFn: async (url, options) => {
        requested = { url, options };
        return { ok: true, json: async () => [austin] };
      },
    });
    assert.equal((await geocode("500 W 2nd St, Austin, TX")).state, "TX");
    assert.equal(requested.url.searchParams.get("q"), "500 W 2nd St, Austin, TX");
    assert.equal(requested.url.searchParams.get("countrycodes"), "us");
    assert.equal(requested.url.searchParams.get("limit"), "1");
    assert.equal(requested.options.headers["User-Agent"], "TestApp/1.0");
  });

  it("reports an unknown address as not found", async () => {
    const geocode = createGeocoder({ config, now: () => 10_000, fetchFn: answer([]) });
    await assert.rejects(() => geocode("nowhere"), { code: "ADDRESS_NOT_FOUND" });
  });

  it("reports a failing, erroring or unreachable service as unavailable", async () => {
    const throwing = async () => {
      throw new Error("network down");
    };
    for (const fetchFn of [answer([], false), throwing]) {
      const geocode = createGeocoder({ config, now: () => 10_000, fetchFn });
      await assert.rejects(() => geocode("anywhere"), { code: "GEOCODER_UNAVAILABLE" });
    }
  });

  it("gives up when the service takes too long", async () => {
    // A service that never answers until the request is cancelled.
    const hanging = (url, { signal }) =>
      new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(new Error("cancelled"))));
    const geocode = createGeocoder({ config, now: () => 10_000, fetchFn: hanging });
    await assert.rejects(() => geocode("slow"), { code: "GEOCODER_UNAVAILABLE" });
  });

  it("waits so requests are never closer together than the rate rule allows, even when they arrive at once", async () => {
    // A fake clock that only moves when the lookup waits.
    let time = 10_000;
    const waits = [];
    const geocode = createGeocoder({
      config,
      now: () => time,
      wait: async (milliseconds) => {
        waits.push(milliseconds);
        time += milliseconds;
      },
      fetchFn: answer([austin]),
    });
    await Promise.all([geocode("a"), geocode("b"), geocode("c")]);
    // The first goes straight away; the other two each wait the full gap.
    assert.deepEqual(waits, [1000, 1000]);
  });

  it("fails clearly when the settings are missing, only when a lookup is actually used", async () => {
    // Building the lookup must not fail even though the settings are absent.
    const geocode = createGeocoder({ fetchFn: answer([austin]) });
    const saved = { ...process.env };
    for (const name of Object.values(SETTING_NAMES)) delete process.env[name];
    try {
      await assert.rejects(() => geocode("anywhere"), { code: "GEOCODER_NOT_CONFIGURED" });
    } finally {
      Object.assign(process.env, saved);
    }
  });
});
