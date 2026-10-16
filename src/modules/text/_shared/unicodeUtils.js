import { INVISIBLE_CHARACTERS, SYMBOL_NAME_MAP } from "./symbolData";

const INVISIBLE_CODE_POINTS = new Set([
    0x00a0, 0x180e, 0xfeff, 0x061c, 0x115f, 0x1160,
    0x17b4, 0x17b5, 0x3164, 0xffa0,
]);

function isInvisibleCodePoint(character) {
    const point = character.codePointAt(0);
    return INVISIBLE_CODE_POINTS.has(point)
        || (point >= 0x200b && point <= 0x200f)
        || (point >= 0x202a && point <= 0x202e)
        || (point >= 0x2060 && point <= 0x2064);
}

export function encodeUtf8(char) {
    const codePoint = char.codePointAt(0);
    const bytes = [];

    if (codePoint <= 0x7f) {
        bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
        bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
        bytes.push(
            0xe0 | (codePoint >> 12),
            0x80 | ((codePoint >> 6) & 0x3f),
            0x80 | (codePoint & 0x3f),
        );
    } else {
        bytes.push(
            0xf0 | (codePoint >> 18),
            0x80 | ((codePoint >> 12) & 0x3f),
            0x80 | ((codePoint >> 6) & 0x3f),
            0x80 | (codePoint & 0x3f),
        );
    }

    return bytes.map((byte) => byte.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

export function encodeUtf16(char) {
    const codePoint = char.codePointAt(0);

    if (codePoint <= 0xffff) {
        return codePoint.toString(16).toUpperCase().padStart(4, "0");
    }

    const adjusted = codePoint - 0x10000;
    const high = 0xd800 + (adjusted >> 10);
    const low = 0xdc00 + (adjusted & 0x3ff);
    return `${high.toString(16).toUpperCase()} ${low.toString(16).toUpperCase()}`;
}

export function toHtmlEntity(char) {
    const codePoint = char.codePointAt(0);
    return `&#x${codePoint.toString(16).toUpperCase()};`;
}

export function getCharacterCategoryLabel(char) {
    if (/\p{Extended_Pictographic}/u.test(char)) return "Emoji / pictograph";
    if (/\p{Letter}/u.test(char)) return "Letter";
    if (/\p{Number}/u.test(char)) return "Number";
    if (/\p{Punctuation}/u.test(char)) return "Punctuation";
    if (/\p{Symbol}/u.test(char)) return "Symbol";
    if (/\p{Mark}/u.test(char)) return "Mark";
    if (/\p{Separator}/u.test(char)) return "Separator";
    if (/\p{Control}/u.test(char)) return "Control";
    return "Other";
}

export function getCharacterInfo(char) {
    if (!char) return null;

    const codePoint = char.codePointAt(0);
    const codePointLabel = `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
    const knownName = SYMBOL_NAME_MAP.get(char);

    return {
        character: char,
        name: knownName ?? getCharacterCategoryLabel(char),
        codePoint: codePointLabel,
        utf8: encodeUtf8(char),
        utf16: encodeUtf16(char),
        htmlEntity: toHtmlEntity(char),
        category: getCharacterCategoryLabel(char),
    };
}

export function getFirstCharacter(value) {
    if (!value) return "";
    return [...value][0] ?? "";
}

export function findInvisibleCharacters(text) {
    const findings = [];
    const knownChars = new Map(
        INVISIBLE_CHARACTERS.map((entry) => [entry.char, entry]),
    );

    [...text].forEach((char, index) => {
        const known = knownChars.get(char);
        const isStandardWhitespace =
            char === " " || char === "\n" || char === "\r" || char === "\t";
        const matchesPattern = isInvisibleCodePoint(char);

        const isInvisible =
            Boolean(known) ||
            matchesPattern ||
            (!isStandardWhitespace && char.trim() === "" && char !== " ");

        if (!isInvisible) return;

        findings.push({
            index,
            char,
            name: known?.name ?? "Invisible / format character",
            codePoint: `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`,
            display:
                known?.copyLabel ??
                char.codePointAt(0).toString(16).toUpperCase(),
        });
    });

    return findings;
}

export function visualizeInvisibleText(text) {
    return [...text]
        .map((char) => {
            const known = INVISIBLE_CHARACTERS.find((entry) => entry.char === char);
            if (known) return `[${known.copyLabel}]`;
            if (char === " ") return "·";
            if (char === "\t") return "[TAB]";
            if (char === "\n") return "[LF]\n";
            if (char === "\r") return "[CR]";
            if (char.trim() === "" && char !== " ") {
                const code = char.codePointAt(0).toString(16).toUpperCase();
                return `[U+${code}]`;
            }
            return char;
        })
        .join("");
}
