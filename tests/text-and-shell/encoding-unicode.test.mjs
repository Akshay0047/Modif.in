import assert from "node:assert/strict";
import test from "node:test";
import { binaryToText, hexToText, textToBinary, textToHex } from "../../src/modules/text/_shared/encodingUtils.js";

test("binary and hexadecimal text conversion use known UTF-8 byte vectors", () => {
    assert.equal(textToBinary("A🌍"), "01000001 11110000 10011111 10001100 10001101");
    assert.equal(textToHex("A🌍"), "41 F0 9F 8C 8D");
    assert.equal(binaryToText("11110000 10011111 10001100 10001101"), "🌍");
    assert.equal(hexToText("E4 B8 AD E6 96 87"), "中文");
    assert.equal(hexToText("F09F8C8D"), "🌍");
});

test("UTF-8 text survives multilingual and supplementary-plane round trips", () => {
    for (const text of ["", "Hello", "élan e\u0301", "العربية", "हिन्दी", "中文", "𐐀", "👨‍👩‍👧‍👦 🇮🇳 👍🏽", "\uFEFFstart", "line\n\t\0"]) {
        assert.equal(binaryToText(textToBinary(text)), text);
        assert.equal(hexToText(textToHex(text)), text);
        assert.deepEqual(textToHex(text).split(" ").filter(Boolean), [...Buffer.from(text, "utf8")].map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")));
    }
});
