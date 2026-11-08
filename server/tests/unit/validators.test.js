// These tests check the input rules (no database needed). The rules below stand in for what the database provides.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isHttpUrl, isValidId, validateAddress, validateGroupInput, validateVenueInput } from "../../utils/validators.js";

// Small made-up rules, so these tests do not depend on any real list or length.
const rules = {
  allowedWords: { "groups.category": ["Alpha", "Beta"] },
  maxLengths: { "venues.venue_name": 10, "venues.address": 20, "groups.group_name": 8 },
};

describe("isValidId", () => {
  it("accepts whole numbers only", () => {
    assert.equal(isValidId("12"), true);
    assert.equal(isValidId(7), true);
    for (const bad of ["abc", "1.5", "-3", "", "1; DROP TABLE users"]) assert.equal(isValidId(bad), false, bad);
  });
});

describe("isHttpUrl", () => {
  it("accepts web addresses and rejects everything else", () => {
    assert.equal(isHttpUrl("https://example.com/a.png"), true);
    assert.equal(isHttpUrl("http://example.com"), true);
    for (const bad of ["ftp://example.com", "example.com", "javascript:alert(1)", ""]) assert.equal(isHttpUrl(bad), false, bad);
  });
});

describe("validateAddress and validateVenueInput", () => {
  it("accept a venue within the limits", () => {
    assert.deepEqual(validateVenueInput({ venue_name: "Town Hall", address: "1 Main St, Austin" }, rules), {});
  });

  it("report missing and blank fields", () => {
    const details = validateVenueInput({ venue_name: "   ", address: undefined }, rules);
    assert.deepEqual(Object.keys(details).sort(), ["address", "venue_name"]);
  });

  it("report text longer than the database allows", () => {
    const details = validateVenueInput({ venue_name: "x".repeat(11), address: "y".repeat(21) }, rules);
    assert.match(details.venue_name, /at most 10/);
    assert.match(details.address, /at most 20/);
    assert.deepEqual(validateAddress("y".repeat(20), rules), {});
  });
});

describe("validateGroupInput", () => {
  const valid = { group_name: "Cooks", category: "Alpha" };

  it("accepts a valid new group, with or without the optional fields", () => {
    assert.deepEqual(validateGroupInput(valid, rules), {});
    assert.deepEqual(validateGroupInput({ ...valid, description: "Hello", group_image_url: "https://example.com/a.png" }, rules), {});
    assert.deepEqual(validateGroupInput({ ...valid, description: null, group_image_url: "" }, rules), {});
  });

  it("requires a name and a category when creating", () => {
    assert.deepEqual(Object.keys(validateGroupInput({}, rules)).sort(), ["category", "group_name"]);
  });

  it("rejects a name that is too long and a category the database does not allow", () => {
    const details = validateGroupInput({ group_name: "x".repeat(9), category: "Gamma" }, rules);
    assert.match(details.group_name, /at most 8/);
    assert.match(details.category, /Alpha, Beta/);
  });

  it("rejects a description that is not text and an image that is not a web address", () => {
    const details = validateGroupInput({ ...valid, description: 5, group_image_url: "not a url" }, rules);
    assert.ok(details.description && details.group_image_url);
  });

  it("checks only the fields that were sent when editing", () => {
    assert.deepEqual(validateGroupInput({ category: "Beta" }, rules, { partial: true }), {});
    assert.ok(validateGroupInput({ category: "Gamma" }, rules, { partial: true }).category);
    assert.ok(validateGroupInput({ group_name: "" }, rules, { partial: true }).group_name);
  });

  it("refuses an edit that changes nothing", () => {
    assert.ok(validateGroupInput({}, rules, { partial: true }).body);
  });
});
