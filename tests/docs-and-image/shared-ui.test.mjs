import assert from "node:assert/strict";
import test from "node:test";
import { canGoBack, fallbackPath } from "../../src/components/backNavigation.js";

test("back falls back to the owning hub on a direct visit", () => {
    assert.equal(canGoBack({ idx: 0 }), false);
    assert.equal(canGoBack(null), false);
    assert.equal(fallbackPath("/doc/csv-converter"), "/doc");
    assert.equal(fallbackPath("/image/favicon-generator"), "/image");
    assert.equal(fallbackPath("/text/case-converter"), "/text");
    assert.equal(fallbackPath("/doc"), "/");
    assert.equal(canGoBack({ idx: 2 }), true);
});
