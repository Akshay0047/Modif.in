import assert from "node:assert/strict";
import test from "node:test";
import { convertNumberBase } from "../../src/modules/text/_shared/encodingUtils.js";

test("number base conversion validates the complete input against its radix", () => {
    for (const [input, base] of [["102", 2], ["8", 8], ["12abc", 10], ["FG", 16], ["0x10", 16], ["0b10", 2], ["1.5", 10], ["1e3", 10], ["10 10", 2], ["", 10], ["-", 10], ["+", 10], ["--1", 10]]) {
        assert.throws(() => convertNumberBase(input, base, 10), Error, input);
    }
    for (const base of [0, 1, 37, 2.5, NaN, "10"]) {
        assert.throws(() => convertNumberBase("10", base, 10));
        assert.throws(() => convertNumberBase("10", 10, base));
    }
});

test("valid radix vectors retain signs, case-insensitivity, and leading zeroes", () => {
    assert.equal(convertNumberBase("101010", 2, 16), "2A");
    assert.equal(convertNumberBase("ff", 16, 10), "255");
    assert.equal(convertNumberBase("  +00077  ", 8, 10), "63");
    assert.equal(convertNumberBase("-42", 10, 2), "-101010");
    assert.equal(convertNumberBase("z", 36, 10), "35");
    assert.equal(convertNumberBase("0", 2, 16), "0");
});

test("number-base conversion preserves arbitrary-size integers exactly", () => {
    assert.equal(convertNumberBase("9007199254740993", 10, 16), "20000000000001");
    assert.equal(convertNumberBase("20000000000001", 16, 10), "9007199254740993");
    assert.equal(convertNumberBase("18446744073709551615", 10, 16), "FFFFFFFFFFFFFFFF");
    assert.equal(convertNumberBase("-18446744073709551616", 10, 16), "-10000000000000000");
    assert.equal(convertNumberBase("1" + "0".repeat(256), 2, 16), "1" + "0".repeat(64));
    for (const integer of [9007199254740991n, 9007199254740992n, 9007199254740993n, (1n << 1024n) + 1n, -(1n << 256n)]) {
        for (const radix of [2, 8, 10, 16, 36]) {
            assert.equal(convertNumberBase(integer.toString(), 10, radix), integer.toString(radix).toUpperCase());
            assert.equal(convertNumberBase(integer.toString(radix), radix, 10), integer.toString());
        }
    }
});
