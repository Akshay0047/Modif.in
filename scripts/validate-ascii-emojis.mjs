import {
    ASCII_EMOJIS_EXTRA,
    EMOTICONS_EXTRA,
    KAOMOJI_EXTRA,
} from "../src/modules/text/_shared/asciiEmojiExtras.js";
import {
    ASCII_EMOJIS,
    EMOTICONS,
    KAOMOJI,
} from "../src/modules/text/_shared/symbolData.js";

const extras = [...ASCII_EMOJIS_EXTRA, ...KAOMOJI_EXTRA, ...EMOTICONS_EXTRA];
const extraValues = extras.map((item) => item.value);
const extraUnique = new Set(extraValues);

if (extras.length !== 150) {
    console.error(`Expected 150 extras, found ${extras.length}`);
    process.exit(1);
}

if (extraValues.length !== extraUnique.size) {
    console.error("Duplicate values found in extras");
    process.exit(1);
}

const originalBase = new Set(
    [
        ...ASCII_EMOJIS.slice(0, -ASCII_EMOJIS_EXTRA.length),
        ...KAOMOJI.slice(0, -KAOMOJI_EXTRA.length),
        ...EMOTICONS.slice(0, -EMOTICONS_EXTRA.length),
    ].map((item) => item.value),
);
const conflicts = extraValues.filter((value) => originalBase.has(value));

if (conflicts.length > 0) {
    console.error("Extras conflict with original entries:", conflicts);
    process.exit(1);
}

const all = [...ASCII_EMOJIS, ...KAOMOJI, ...EMOTICONS];
console.log(
    `OK: ${extras.length} new emojis added. Total collection: ${all.length}.`,
);
