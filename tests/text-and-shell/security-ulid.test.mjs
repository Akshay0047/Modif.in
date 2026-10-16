import test from "node:test";
import assert from "node:assert/strict";
import { generateUlid } from "../../src/modules/text/_shared/generatorUtils.js";

// Parse the complete 128-bit value independently of the generator's encoding.
function parseUlid(id) {
    assert.match(id, /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const value = [...id].reduce((acc, char) => (acc << 5n) | BigInt(alphabet.indexOf(char)), 0n);
    assert.ok(value < (1n << 128n));
    return { timestamp: Number(value >> 80n), randomness: value & ((1n << 80n) - 1n) };
}

test("ULIDs contain a 48-bit timestamp and 80-bit random component", () => {
    const before = Date.now();
    const ids = Array.from({ length: 1000 }, generateUlid);
    const after = Date.now();
    for (const id of ids) {
        const parsed = parseUlid(id);
        assert.ok(parsed.timestamp >= before && parsed.timestamp <= after);
    }
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.some((id) => parseUlid(id).randomness >= (1n << 79n)), "the high random bit is populated");
});

test("ULID random characters can encode every five-bit value without bias", (t) => {
    t.mock.method(Date, "now", () => 1469918176385);
    t.mock.method(crypto, "getRandomValues", (bytes) => { bytes.fill(255); return bytes; });
    const id = generateUlid();
    assert.equal(parseUlid(id).timestamp, 1469918176385);
    assert.equal(id.slice(10), "Z".repeat(16));
    assert.equal(parseUlid(id).randomness, (1n << 80n) - 1n);
});
