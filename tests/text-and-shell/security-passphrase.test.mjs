import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PASSPHRASE_WORDS } from "../../src/modules/text/_shared/passphraseWords.js";
import { calculatePassphraseEntropy, generatePassphrase } from "../../src/modules/text/_shared/generatorUtils.js";

test("curated EFF pool has 7772 unique lowercase words and no delimiter collisions", () => {
    assert.equal(PASSPHRASE_WORDS.length, 7772);
    assert.equal(new Set(PASSPHRASE_WORDS).size, 7772);
    for (const word of PASSPHRASE_WORDS) assert.match(word, /^[a-z]+$/);
    assert.equal(PASSPHRASE_WORDS[0], "abacus");
    assert.equal(PASSPHRASE_WORDS.at(-1), "zoom");
    assert.equal(createHash("sha256").update(PASSPHRASE_WORDS.join("\n")).digest("hex"), "76e3348ad957cad7d9c5c68873e89410ed998c19f4956367ab52d9aec4eee884");
});

test("default six-word phrase supplies more than 77 bits of word-choice entropy", () => {
    const phrase = generatePassphrase({});
    const words = phrase.split("-");
    assert.equal(words.length, 6);
    assert.ok(words.every((word) => PASSPHRASE_WORDS.includes(word)));
    const estimate = calculatePassphraseEntropy(6);
    assert.ok(estimate.bits > 77 && estimate.bits < 78);
    assert.equal(estimate.boundariesPreserved, true);
});

test("word count, separator and capitalization do not invent extra random bits", () => {
    for (const wordCount of [3, 4, 6, 8]) {
        const words = generatePassphrase({ wordCount, separator: ":", capitalize: true }).split(":");
        assert.equal(words.length, wordCount);
        assert.ok(words.every((word) => /^[A-Z][a-z]+$/.test(word) && PASSPHRASE_WORDS.includes(word.toLowerCase())));
        const bits = wordCount * Math.log2(7772);
        assert.equal(calculatePassphraseEntropy(wordCount, ":", true).bits, bits);
        assert.equal(calculatePassphraseEntropy(wordCount, "").bits, bits);
        assert.equal(calculatePassphraseEntropy(wordCount, "").boundariesPreserved, false);
        assert.equal(calculatePassphraseEntropy(wordCount, "and").boundariesPreserved, false);
        assert.equal(calculatePassphraseEntropy(wordCount, "", true).boundariesPreserved, true);
    }
    for (const wordCount of [0, 2, 9, 3.5, NaN]) {
        assert.throws(() => generatePassphrase({ wordCount }), /between 3 and 8/);
    }
});

test("the sampler can reach the first and final EFF words", (t) => {
    let sample = 0;
    t.mock.method(crypto, "getRandomValues", (words) => { words[0] = sample; return words; });
    assert.equal(generatePassphrase({ wordCount: 3 }), "abacus-abacus-abacus");
    sample = 7771;
    assert.equal(generatePassphrase({ wordCount: 3 }), "zoom-zoom-zoom");
});
