import test from "node:test";
import assert from "node:assert/strict";
import { randomInt, shuffle, generatePassword, generatePassphrase, generateApiToken, generateRandomString } from "../../src/modules/text/_shared/generatorUtils.js";

test("non-power-of-two samples reject the biased tail", (t) => {
    const samples = [0xffffffff, 0xfffffffe, 7];
    const mock = t.mock.method(crypto, "getRandomValues", (words) => { words[0] = samples.shift(); return words; });
    assert.equal(randomInt(10, 19), 17);
    assert.equal(mock.mock.callCount(), 3);
    assert.equal(randomInt(42, 42), 42);
});

test("secure generators and shuffle never call Math.random", (t) => {
    t.mock.method(Math, "random", () => { throw new Error("Non-cryptographic randomness used"); });
    assert.equal(generatePassword({ length: 64 }).length, 64);
    assert.equal(generatePassphrase({ wordCount: 8 }).split("-").length, 8);
    assert.match(generateApiToken(128), /^[A-Za-z0-9_-]{128}$/);
    for (const [charset, pattern] of [["numeric", /^\d{32}$/], ["hex", /^[a-f0-9]{32}$/], ["alpha", /^[a-zA-Z]{32}$/], ["alphanumeric", /^[a-zA-Z0-9]{32}$/]]) {
        assert.match(generateRandomString(32, charset), pattern);
    }
    assert.deepEqual(shuffle([1, 2, 3, 4]).sort(), [1, 2, 3, 4]);
});

test("every password class combination respects length and ambiguity exclusions", () => {
    const patterns = [/[A-Z]/, /[a-z]/, /\d/, /[!@#$%^&*()\-_=+[\]{};:,.?]/];
    for (let mask = 1; mask < 16; mask += 1) {
        const enabled = [0, 1, 2, 3].map((bit) => Boolean(mask & (1 << bit)));
        const [uppercase, lowercase, numbers, symbols] = enabled;
        for (const length of [8, 16, 64]) {
            const password = generatePassword({ length, uppercase, lowercase, numbers, symbols, excludeAmbiguous: true });
            assert.equal(password.length, length);
            assert.doesNotMatch(password, /[0O1lI|`'"\\]/);
            patterns.forEach((pattern, index) => assert.equal(pattern.test(password), enabled[index]));
        }
    }
    assert.throws(() => generatePassword({ uppercase: false, lowercase: false, numbers: false, symbols: false }), /Select at least/);
    assert.throws(() => generatePassword({ length: 3 }), /every selected/);
});

test("integer ranges stay exact above 32 bits and reject invalid bounds", () => {
    for (let index = 0; index < 100; index += 1) {
        const value = randomInt(-1000000000000, 1000000000000);
        assert.ok(Number.isSafeInteger(value) && value >= -1000000000000 && value <= 1000000000000);
    }
    for (const range of [[1, 0], [1001, 1000], [0.1, 0.9], [NaN, 1], [0, Infinity], [0, Number.MAX_SAFE_INTEGER]]) {
        assert.throws(() => randomInt(...range), /safe-integer/);
    }
    assert.equal(randomInt(0.1, 1.9), 1);
});

test("crypto failure propagates instead of falling back to weak randomness", (t) => {
    t.mock.method(crypto, "getRandomValues", () => { throw new Error("Crypto unavailable"); });
    assert.throws(() => generateApiToken(40), /Crypto unavailable/);
    assert.throws(() => generatePassword({}), /Crypto unavailable/);
});
