import assert from "node:assert/strict";
import test from "node:test";
import { countMatches, replaceMultiplePatterns, replaceText } from "../../src/modules/text/_shared/textFormatter.js";

test("invalid replacement regexes throw instead of producing false successful output", () => {
    for (const pattern of ["[", "(", "*", "\\", "a{2,1}"]) {
        assert.throws(() => replaceText("hello", pattern, "x", { useRegex: true }), SyntaxError);
        assert.throws(() => countMatches("hello", pattern, { useRegex: true }), SyntaxError);
    }
    assert.throws(() => replaceMultiplePatterns("hello", "hello|world\n\n[|x", true), /line 3/);
    assert.throws(() => replaceMultiplePatterns("[", "[|x", true), SyntaxError);
});

test("literal replacements, valid regexes, groups, and multiple patterns still work", () => {
    assert.equal(replaceText("[hello]", "[", "x"), "xhello]");
    assert.equal(replaceText("HELLO hello", "(hello)", "$1!", { useRegex: true, caseSensitive: false }), "HELLO! hello!");
    assert.equal(countMatches("HELLO hello", "hello", { useRegex: true, caseSensitive: false }), 2);
    assert.equal(replaceMultiplePatterns("one two one", "one|three\ntwo|four", true), "three four three");
    assert.equal(replaceText("hello", "", "x", { useRegex: true }), "hello");
    assert.equal(replaceText("hello", "z+", "x", { useRegex: true }), "hello");
});
