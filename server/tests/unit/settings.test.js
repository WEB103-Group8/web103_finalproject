// These tests check that settings are read from the environment and a missing one is reported by name (no database needed).
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SETTING, requireSetting } from "../../utils/settings.js";

describe("requireSetting", () => {
  it("returns the value of a setting that exists", () => {
    assert.equal(requireSetting("SOME_SETTING", { SOME_SETTING: "value" }), "value");
  });

  it("stops with a message naming the setting when it is missing or empty", () => {
    assert.throws(() => requireSetting("SOME_SETTING", {}), /Missing setting: SOME_SETTING/);
    assert.throws(() => requireSetting("SOME_SETTING", { SOME_SETTING: "" }), /Missing setting: SOME_SETTING/);
  });

  it("reads the real environment when none is given", () => {
    const name = SETTING.hostUserType;
    const saved = process.env[name];
    process.env[name] = "boss";
    try {
      assert.equal(requireSetting(name), "boss");
    } finally {
      if (saved === undefined) delete process.env[name];
      else process.env[name] = saved;
    }
  });
});
