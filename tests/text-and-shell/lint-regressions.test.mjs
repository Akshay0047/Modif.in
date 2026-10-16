import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
after(() => server.close());
const { findInvisibleCharacters } = await server.ssrLoadModule("/src/modules/text/_shared/unicodeUtils.js");
const { INVISIBLE_CHARACTERS } = await server.ssrLoadModule("/src/modules/text/_shared/symbolData.js");
const { hasNonAscii } = await server.ssrLoadModule("/src/modules/text/lookalike-link-detector/homoglyphs.js");
const { extractLinkCandidates } = await server.ssrLoadModule("/src/modules/text/lookalike-link-detector/lookalikeDetector.js");

test("invisible matching preserves every BMP code point from the original classifier", () => {
    const original = /[\u00a0\u180e\u200b-\u200f\u202a-\u202e\u2060\u2061-\u2064\ufeff\u061c\u115f\u1160\u17b4\u17b5\u3164\uffa0]/;
    const known = new Set(INVISIBLE_CHARACTERS.map(({ char }) => char));
    for (let point = 0; point <= 0xffff; point++) {
        const char = String.fromCodePoint(point);
        const expected = known.has(char) || original.test(char) || (!" \n\r\t".includes(char) && char.trim() === "");
        assert.equal(findInvisibleCharacters(char).length > 0, expected, `U+${point.toString(16)}`);
    }
});

test("ASCII classification preserves controls, Unicode and supplementary characters", () => {
    for (let point = 0; point < 0x80; point++) assert.equal(hasNonAscii(String.fromCodePoint(point)), false);
    for (const value of ["é", "😀", "a\u0080", "\ud800"]) assert.equal(hasNonAscii(value), true);
});

test("link extraction still strips wrapping punctuation without changing URLs", () => {
    assert.deepEqual(extractLinkCandidates("[https://example.com/path), 'https://example.org/test'."), ["https://example.com/path", "https://example.org/test"]);
});
