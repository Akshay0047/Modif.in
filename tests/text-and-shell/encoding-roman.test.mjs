import assert from "node:assert/strict";
import test from "node:test";
import { numberToRoman, romanToNumber } from "../../src/modules/text/_shared/encodingUtils.js";

test("Roman conversion matches independent canonical vectors", () => {
    for (const [number, roman] of [[1, "I"], [4, "IV"], [9, "IX"], [49, "XLIX"], [944, "CMXLIV"], [1984, "MCMLXXXIV"], [2026, "MMXXVI"], [3999, "MMMCMXCIX"]]) {
        assert.equal(numberToRoman(number), roman);
        assert.equal(romanToNumber(roman.toLowerCase()), String(number));
    }
    for (let number = 1; number <= 3999; number += 1) assert.equal(romanToNumber(numberToRoman(number)), String(number));
});

test("Roman conversion rejects decimals, suffixes, repetitions, and invalid subtractives", () => {
    for (const input of ["3.5", "3abc", "3e2", "0x10", "0", "-1", "4000", "", "Infinity", "3 4", "3.0"]) assert.throws(() => numberToRoman(input), Error, input);
    for (const input of ["IIII", "IIV", "VX", "IC", "IL", "XM", "VV", "MMMM", "IXIX", "MCMC", "", "123", "IV!"]) assert.throws(() => romanToNumber(input), Error, input);
});
