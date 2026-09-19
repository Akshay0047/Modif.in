/**
 * Visual confusable map used to fold lookalike characters to ASCII skeletons.
 *
 * To add more confusables later, append characters to the matching group.
 * The first character in each group is the canonical skeleton letter.
 */
const HOMOGLYPH_GROUPS = [
    ["a", "à", "á", "â", "ã", "ä", "å", "ā", "ă", "ą", "ǎ", "ȧ", "ạ", "ά", "α", "а", "ɑ", "ａ", "@", "4", "ª", "ά", "ά"],
    ["b", "ḃ", "ḅ", "ḇ", "ь", "въ", "ƅ", "ｂ", "8", "ß", "Б"],
    ["c", "ç", "ć", "ĉ", "ċ", "č", "с", "ϲ", "ｃ", "¢", "©"],
    ["d", "ď", "đ", "ḋ", "ḍ", "ḏ", "ḑ", "ḓ", "ԁ", "ɗ", "ｄ"],
    ["e", "è", "é", "ê", "ë", "ē", "ĕ", "ė", "ę", "ě", "ẹ", "е", "ε", "ｅ", "3", "€", "є"],
    ["f", "ḟ", "ſ", "ƒ", "ｆ"],
    ["g", "ĝ", "ğ", "ġ", "ģ", "ǥ", "ǧ", "ǵ", "ɡ", "ｇ", "6", "9", "ց"],
    ["h", "ĥ", "ħ", "ḣ", "ḥ", "ḧ", "ḩ", "ḫ", "һ", "հ", "ｈ", "н"],
    ["i", "ì", "í", "î", "ï", "ĩ", "ī", "ĭ", "į", "ı", "ǐ", "ị", "і", "ɩ", "ι", "ｉ", "1", "!", "|", "l", "ĺ", "ļ", "ľ", "ŀ", "ł", "ӏ", "Ӏ", "Ｉ", "ｌ", "ⅼ", "Ꭵ", "¡"],
    ["j", "ĵ", "ǰ", "ј", "ʝ", "ｊ"],
    ["k", "ķ", "ǩ", "ḱ", "ḳ", "ḵ", "κ", "к", "ｋ"],
    ["m", "ḿ", "ṁ", "ṃ", "м", "ｍ"],
    ["n", "ñ", "ń", "ņ", "ň", "ŋ", "ṅ", "ṇ", "ṉ", "ṋ", "п", "ｎ", "η"],
    ["o", "ò", "ó", "ô", "õ", "ö", "ø", "ō", "ŏ", "ő", "ơ", "ǒ", "ȯ", "ọ", "ο", "σ", "о", "օ", "ｏ", "0", "°", "¤", "ө", "ｏ"],
    ["p", "ṕ", "ṗ", "р", "ρ", "ｐ", "þ"],
    ["q", "ʠ", "ԛ", "ｑ"],
    ["r", "ŕ", "ŗ", "ř", "ṙ", "ṛ", "ṟ", "г", "ｒ"],
    ["s", "ś", "ŝ", "ş", "š", "ṡ", "ṣ", "ș", "ѕ", "ｓ", "5", "$", "§"],
    ["t", "ţ", "ť", "ŧ", "ṫ", "ṭ", "ṯ", "ṱ", "τ", "т", "ｔ", "7", "+"],
    ["u", "ù", "ú", "û", "ü", "ũ", "ū", "ŭ", "ů", "ű", "ų", "ư", "ǔ", "ụ", "υ", "ս", "ｕ", "µ"],
    ["v", "ṽ", "ṿ", "ν", "ѵ", "ｖ"],
    ["w", "ŵ", "ẁ", "ẃ", "ẅ", "ẇ", "ẉ", "ω", "ԝ", "ｗ"],
    ["x", "ẋ", "ẍ", "х", "χ", "ｘ", "×"],
    ["y", "ý", "ÿ", "ŷ", "ẏ", "ỳ", "ỵ", "ỷ", "ỹ", "у", "γ", "ｙ", "¥"],
    ["z", "ź", "ż", "ž", "ẑ", "ẓ", "ẕ", "ｚ", "2"],
];

const DIGRAPH_FOLDS = [
    ["rn", "m"],
    ["vv", "w"],
    ["nn", "n"],
    ["ii", "u"],
];

const HOMOGLYPH_MAP = new Map();

HOMOGLYPH_GROUPS.forEach((group) => {
    const canonical = group[0];
    group.forEach((character) => {
        HOMOGLYPH_MAP.set(character, canonical);
        HOMOGLYPH_MAP.set(character.toUpperCase(), canonical);
    });
});

export function foldHomoglyphChar(character) {
    const mapped = HOMOGLYPH_MAP.get(character);
    if (mapped) return mapped;

    const lower = character.toLowerCase();
    return HOMOGLYPH_MAP.get(lower) ?? lower;
}

export function toSkeleton(value) {
    const normalized = String(value)
        .normalize("NFKD")
        .replace(/\p{M}+/gu, "")
        .toLowerCase();

    let folded = "";
    for (const character of normalized) {
        if (character === "-" || character === "_" || character === "." || character === " ") {
            continue;
        }
        folded += foldHomoglyphChar(character);
    }

    DIGRAPH_FOLDS.forEach(([from, to]) => {
        folded = folded.replaceAll(from, to);
    });

    return folded;
}

export function hasNonAscii(value) {
    return /[^\u0000-\u007F]/.test(String(value));
}

export function collectHomoglyphHits(value) {
    const hits = [];
    const source = String(value);

    for (const character of source) {
        if (/^[a-z0-9.:[\]-]$/i.test(character)) {
            continue;
        }

        const folded = foldHomoglyphChar(character);
        if (folded === character.toLowerCase()) {
            continue;
        }

        hits.push({
            character,
            folded,
            codePoint: character.codePointAt(0),
        });
    }

    return hits;
}
