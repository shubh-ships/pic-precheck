import test from "node:test";
import assert from "node:assert/strict";
import { getFraName } from "../lib/fra-rules.js";

test("maps FRA ids used by the PIC consent rule", () => {
  assert.equal(getFraName(505), "Banned");
  assert.equal(getFraName("506"), "Severely Restricted");
  assert.equal(getFraName(999), "N/A");
});
