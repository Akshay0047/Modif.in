import assert from "node:assert/strict";
import test from "node:test";
import { reverseCharacters, reverseEntireText, reverseWords } from "../../src/modules/text/_shared/textFormatter.js";

test("text reversal preserves whole grapheme clusters", () => {
    for (const [input, expected] of [
        ["a👨‍👩‍👧‍👦b", "b👨‍👩‍👧‍👦a"],
        ["a🇮🇳b", "b🇮🇳a"],
        ["a👍🏽b", "b👍🏽a"],
        ["ae\u0301b", "be\u0301a"],
        ["a👩🏽‍💻b", "b👩🏽‍💻a"],
        ["a1️⃣b", "b1️⃣a"],
        ["a\r\nb", "b\r\na"],
        ["", ""],
        ["ab cd", "dc ba"],
    ]) {
        assert.equal(reverseEntireText(input), expected);
        assert.equal(reverseCharacters(input), expected);
        assert.equal(reverseEntireText(expected), input);
    }
    assert.equal(reverseWords("hello 👨‍👩‍👧‍👦 world"), "world 👨‍👩‍👧‍👦 hello");
});
