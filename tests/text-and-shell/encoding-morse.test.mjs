import assert from "node:assert/strict";
import test from "node:test";
import { morseToText, textToMorse } from "../../src/modules/text/_shared/encodingUtils.js";

test("Morse decoding preserves slash-delimited words with optional whitespace", () => {
    const helloWorld = ".... . .-.. .-.. --- / .-- --- .-. .-.. -..";
    assert.equal(morseToText(helloWorld), "HELLO WORLD");
    assert.equal(morseToText("... --- .../... --- ..."), "SOS SOS");
    assert.equal(morseToText("  ... --- ...\t/\n... --- ...  "), "SOS SOS");
    assert.equal(morseToText(""), "");
});

test("multiword alphanumeric phrases round-trip through Morse", () => {
    for (const phrase of ["HELLO WORLD", "SOS SOS 123", "ONE TWO THREE"]) {
        assert.equal(morseToText(textToMorse(phrase)), phrase);
    }
});
