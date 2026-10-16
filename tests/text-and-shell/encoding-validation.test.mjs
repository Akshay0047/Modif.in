import assert from "node:assert/strict";
import test from "node:test";
import { asciiToBinary, asciiToDecimal, asciiToHex, binaryToAscii, binaryToText, decimalToAscii, hexToAscii, hexToText } from "../../src/modules/text/_shared/encodingUtils.js";

test("binary decoder rejects invalid digits, prefixes, truncation, and malformed UTF-8", () => {
    for (const input of ["102abc", "1000000", "010000010", "0b01000001", "01000001oops", "01000001,01000010", "11111111", "11000000 10000000", "11110000 10011111"]) {
        assert.throws(() => binaryToText(input), Error, input);
    }
    assert.equal(binaryToText("01000001\n01000010"), "AB");
});

test("hex decoder rejects discarded junk, incomplete bytes, and malformed UTF-8", () => {
    for (const input of ["not-hex!", "41zz", "0x41", "4", "4 1", "F09F8C8", "FF", "E2 82", "ED A0 80", "F4 90 80 80"]) {
        assert.throws(() => hexToText(input), Error, input);
    }
    assert.equal(hexToText("41\t42\n43"), "ABC");
});

test("ASCII mode validates whole decimal tokens and the 0–127 range in every radix", () => {
    for (const input of ["not-a-number", "65abc", "65.5", "-1", "128", "65536", "65,66", "1e2", "Infinity"]) {
        assert.throws(() => decimalToAscii(input), Error, input);
    }
    for (const encode of [asciiToDecimal, asciiToBinary, asciiToHex]) assert.throws(() => encode("é"));
    assert.throws(() => hexToAscii("C3 A9"));
    assert.throws(() => binaryToAscii("11000011 10101001"));
    assert.equal(decimalToAscii("0 65 127"), "\0A\x7f");
    assert.equal(decimalToAscii(""), "");
    assert.equal(asciiToDecimal("ABC"), "65 66 67");
    assert.equal(asciiToHex("ABC"), "41 42 43");
    assert.equal(asciiToBinary("A"), "01000001");
    assert.equal(binaryToAscii("01000001"), "A");
    assert.equal(hexToAscii("41"), "A");
});
