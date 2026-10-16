function buildLetterMap(baseUpper, baseLower, baseDigit = null) {
    const map = new Map();

    for (let index = 0; index < 26; index += 1) {
        map.set(
            String.fromCharCode(65 + index),
            String.fromCodePoint(baseUpper + index),
        );
        map.set(
            String.fromCharCode(97 + index),
            String.fromCodePoint(baseLower + index),
        );
    }

    if (baseDigit !== null) {
        for (let index = 0; index < 10; index += 1) {
            map.set(
                String.fromCharCode(48 + index),
                String.fromCodePoint(baseDigit + index),
            );
        }
    }

    return map;
}

const BOLD_MAP = buildLetterMap(0x1d400, 0x1d41a, 0x1d7ce);
const ITALIC_MAP = buildLetterMap(0x1d434, 0x1d44e);
const BOLD_ITALIC_MAP = buildLetterMap(0x1d468, 0x1d482);
const CIRCLED_MAP = buildLetterMap(0x24b6, 0x24d0);
const SQUARED_MAP = buildLetterMap(0x1f130, 0x1f130);
const MONOSPACE_MAP = buildLetterMap(0x1d670, 0x1d68a, 0x1d7f6);

const SMALL_CAPS_MAP = new Map([
    ["a", "ᴀ"],
    ["b", "ʙ"],
    ["c", "ᴄ"],
    ["d", "ᴅ"],
    ["e", "ᴇ"],
    ["f", "ꜰ"],
    ["g", "ɢ"],
    ["h", "ʜ"],
    ["i", "ɪ"],
    ["j", "ᴊ"],
    ["k", "ᴋ"],
    ["l", "ʟ"],
    ["m", "ᴍ"],
    ["n", "ɴ"],
    ["o", "ᴏ"],
    ["p", "ᴘ"],
    ["q", "ꞯ"],
    ["r", "ʀ"],
    ["s", "ꜱ"],
    ["t", "ᴛ"],
    ["u", "ᴜ"],
    ["v", "ᴠ"],
    ["w", "ᴡ"],
    ["x", "x"],
    ["y", "ʏ"],
    ["z", "ᴢ"],
]);

const SUPERSCRIPT_MAP = new Map([
    ["0", "⁰"],
    ["1", "¹"],
    ["2", "²"],
    ["3", "³"],
    ["4", "⁴"],
    ["5", "⁵"],
    ["6", "⁶"],
    ["7", "⁷"],
    ["8", "⁸"],
    ["9", "⁹"],
    ["+", "⁺"],
    ["-", "⁻"],
    ["=", "⁼"],
    ["(", "⁽"],
    [")", "⁾"],
    ["a", "ᵃ"],
    ["b", "ᵇ"],
    ["c", "ᶜ"],
    ["d", "ᵈ"],
    ["e", "ᵉ"],
    ["f", "ᶠ"],
    ["g", "ᵍ"],
    ["h", "ʰ"],
    ["i", "ⁱ"],
    ["j", "ʲ"],
    ["k", "ᵏ"],
    ["l", "ˡ"],
    ["m", "ᵐ"],
    ["n", "ⁿ"],
    ["o", "ᵒ"],
    ["p", "ᵖ"],
    ["r", "ʳ"],
    ["s", "ˢ"],
    ["t", "ᵗ"],
    ["u", "ᵘ"],
    ["v", "ᵛ"],
    ["w", "ʷ"],
    ["x", "ˣ"],
    ["y", "ʸ"],
    ["z", "ᶻ"],
]);

const SUBSCRIPT_MAP = new Map([
    ["0", "₀"],
    ["1", "₁"],
    ["2", "₂"],
    ["3", "₃"],
    ["4", "₄"],
    ["5", "₅"],
    ["6", "₆"],
    ["7", "₇"],
    ["8", "₈"],
    ["9", "₉"],
    ["+", "₊"],
    ["-", "₋"],
    ["=", "₌"],
    ["(", "₍"],
    [")", "₎"],
    ["a", "ₐ"],
    ["e", "ₑ"],
    ["h", "ₕ"],
    ["i", "ᵢ"],
    ["j", "ⱼ"],
    ["k", "ₖ"],
    ["l", "ₗ"],
    ["m", "ₘ"],
    ["n", "ₙ"],
    ["o", "ₒ"],
    ["p", "ₚ"],
    ["r", "ᵣ"],
    ["s", "ₛ"],
    ["t", "ₜ"],
    ["u", "ᵤ"],
    ["v", "ᵥ"],
    ["x", "ₓ"],
]);

function applyMap(text, map, { lowercaseKey = false } = {}) {
    return [...text]
        .map((char) => {
            const key = lowercaseKey ? char.toLowerCase() : char;
            return map.get(key) ?? char;
        })
        .join("");
}

function applyCombiningMark(text, mark) {
    return [...text]
        .map((char) => (/\s/.test(char) ? char : `${char}${mark}`))
        .join("");
}

export function toUpperCase(text) {
    return text.toUpperCase();
}

export function toLowerCase(text) {
    return text.toLowerCase();
}

export function toTitleCase(text) {
    return text.replace(
        /\b(\p{L})(\p{L}*)/gu,
        (_, first, rest) => first.toUpperCase() + rest.toLowerCase(),
    );
}

export function toSentenceCase(text) {
    const lower = text.toLowerCase();
    return lower.replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, (match) =>
        match.toUpperCase(),
    );
}

export function toAlternatingCase(text) {
    let useUpper = false;

    return [...text]
        .map((char) => {
            if (!/\p{L}/u.test(char)) return char;
            useUpper = !useUpper;
            return useUpper ? char.toUpperCase() : char.toLowerCase();
        })
        .join("");
}

export function toInverseCase(text) {
    return [...text]
        .map((char) => {
            if (char.toUpperCase() === char && char.toLowerCase() !== char) {
                return char.toLowerCase();
            }
            if (char.toLowerCase() === char && char.toUpperCase() !== char) {
                return char.toUpperCase();
            }
            return char;
        })
        .join("");
}

export const CASE_OPTIONS = [
    { id: "upper", label: "UPPERCASE", convert: toUpperCase },
    { id: "lower", label: "lowercase", convert: toLowerCase },
    { id: "title", label: "Title Case", convert: toTitleCase },
    { id: "sentence", label: "Sentence case", convert: toSentenceCase },
    { id: "alternating", label: "aLtErNaTiNg CaSe", convert: toAlternatingCase },
    { id: "inverse", label: "InVeRsE cAsE", convert: toInverseCase },
];

export function tokenizeIdentifier(text) {
    return text
        .trim()
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .replace(/[._\-\s/]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((part) => part.toLowerCase());
}

export function toCamelCase(text) {
    const parts = tokenizeIdentifier(text);
    if (parts.length === 0) return "";
    return (
        parts[0] +
        parts
            .slice(1)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join("")
    );
}

export function toPascalCase(text) {
    return tokenizeIdentifier(text)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}

export function toSnakeCase(text) {
    return tokenizeIdentifier(text).join("_");
}

export function toKebabCase(text) {
    return tokenizeIdentifier(text).join("-");
}

export function toConstantCase(text) {
    return tokenizeIdentifier(text).join("_").toUpperCase();
}

export function toDotCase(text) {
    return tokenizeIdentifier(text).join(".");
}

export const CODE_CASE_OPTIONS = [
    { id: "camel", label: "camelCase", convert: toCamelCase },
    { id: "pascal", label: "PascalCase", convert: toPascalCase },
    { id: "snake", label: "snake_case", convert: toSnakeCase },
    { id: "kebab", label: "kebab-case", convert: toKebabCase },
    { id: "constant", label: "CONSTANT_CASE", convert: toConstantCase },
    { id: "dot", label: "dot.case", convert: toDotCase },
];

export function getFancyTextStyles(text) {
    return [
        { label: "Bold-style Unicode", value: applyMap(text, BOLD_MAP) },
        { label: "Italic-style Unicode", value: applyMap(text, ITALIC_MAP) },
        {
            label: "Bold italic Unicode",
            value: applyMap(text, BOLD_ITALIC_MAP),
        },
        { label: "Circled", value: applyMap(text, CIRCLED_MAP) },
        {
            label: "Squared",
            value: applyMap(text, SQUARED_MAP, { lowercaseKey: true }),
        },
        {
            label: "Small caps",
            value: applyMap(text, SMALL_CAPS_MAP, { lowercaseKey: true }),
        },
        {
            label: "Superscript",
            value: applyMap(text, SUPERSCRIPT_MAP, { lowercaseKey: true }),
        },
        {
            label: "Subscript",
            value: applyMap(text, SUBSCRIPT_MAP, { lowercaseKey: true }),
        },
        {
            label: "Strikethrough",
            value: applyCombiningMark(text, "\u0336"),
        },
        {
            label: "Underline",
            value: applyCombiningMark(text, "\u0332"),
        },
        {
            label: "Bubble-style text",
            value: applyMap(text, CIRCLED_MAP),
        },
        { label: "Monospace Unicode", value: applyMap(text, MONOSPACE_MAP) },
    ];
}

export function cleanText(text, operations) {
    let result = text;

    if (operations.removeExtraSpaces) {
        result = result.replace(/[^\S\n]+/g, " ");
    }

    if (operations.normalizeWhitespace) {
        result = result.replace(/\t/g, "    ").replace(/[^\S\n]+/g, " ");
    }

    if (operations.trimLines) {
        result = result
            .split("\n")
            .map((line) => line.trim())
            .join("\n");
    }

    if (operations.removeEmptyLines) {
        result = result
            .split("\n")
            .filter((line) => line.trim() !== "")
            .join("\n");
    }

    if (operations.removePunctuation) {
        result = result.replace(/[\p{P}\p{S}]/gu, "");
    }

    if (operations.removeNumbers) {
        result = result.replace(/\d/g, "");
    }

    if (operations.removeSpecialCharacters) {
        result = result.replace(/[^\p{L}\p{N}\s]/gu, "");
    }

    if (operations.keepOnlyLettersNumbers) {
        result = result.replace(/[^\p{L}\p{N}]/gu, "");
    }

    return result;
}

export const TEXT_CLEANER_OPTIONS = [
    { id: "removeExtraSpaces", label: "Remove extra spaces" },
    { id: "normalizeWhitespace", label: "Normalize whitespace" },
    { id: "trimLines", label: "Trim lines" },
    { id: "removeEmptyLines", label: "Remove empty lines" },
    { id: "removePunctuation", label: "Remove punctuation" },
    { id: "removeNumbers", label: "Remove numbers" },
    { id: "removeSpecialCharacters", label: "Remove special characters" },
    { id: "keepOnlyLettersNumbers", label: "Keep only letters/numbers" },
];

export function sortLines(text, direction = "asc") {
    const lines = text.split("\n");
    lines.sort((a, b) =>
        direction === "asc"
            ? a.localeCompare(b, undefined, { sensitivity: "base" })
            : b.localeCompare(a, undefined, { sensitivity: "base" }),
    );
    return lines.join("\n");
}

export function reverseLines(text) {
    return text.split("\n").reverse().join("\n");
}

export function shuffleLines(text) {
    const lines = [...text.split("\n")];
    for (let index = lines.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [lines[index], lines[swapIndex]] = [lines[swapIndex], lines[index]];
    }
    return lines.join("\n");
}

export function removeDuplicateLines(text, caseSensitive = false) {
    const seen = new Set();
    return text
        .split("\n")
        .filter((line) => {
            const key = caseSensitive ? line : line.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .join("\n");
}

export function joinLines(text, delimiter = "") {
    return text.split("\n").join(delimiter);
}

export function splitLines(text, delimiter = "\n") {
    if (!delimiter) return text;
    return text.split(delimiter).join("\n");
}

export function reverseEntireText(text) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...segmenter.segment(text)].map(({ segment }) => segment).reverse().join("");
}

export function reverseWords(text) {
    return text
        .split(/(\s+)/)
        .filter((part) => part.length > 0)
        .reverse()
        .join("");
}

export function reverseCharacters(text) {
    return reverseEntireText(text);
}

export function addPrefixSuffixToLines(text, prefix = "", suffix = "") {
    return text
        .split("\n")
        .map((line) => `${prefix}${line}${suffix}`)
        .join("\n");
}

export function addLineNumbers(text, start = 1, separator = ". ") {
    return text
        .split("\n")
        .map((line, index) => `${index + start}${separator}${line}`)
        .join("\n");
}

export function wrapText(text, wrapper = "") {
    if (!wrapper) return text;
    const half = Math.floor(wrapper.length / 2);
    const left = wrapper.slice(0, half);
    const right = wrapper.slice(half);
    return text
        .split("\n")
        .map((line) => `${left}${line}${right}`)
        .join("\n");
}

export function indentLines(text, spaces = 2) {
    const padding = " ".repeat(Math.max(0, spaces));
    return text
        .split("\n")
        .map((line) => (line ? `${padding}${line}` : line))
        .join("\n");
}

export function unindentLines(text, spaces = 2) {
    const padding = " ".repeat(Math.max(0, spaces));
    return text
        .split("\n")
        .map((line) =>
            line.startsWith(padding) ? line.slice(padding.length) : line,
        )
        .join("\n");
}

export function replaceText(
    text,
    findValue,
    replaceValue,
    { useRegex = false, caseSensitive = true } = {},
) {
    if (!findValue) return text;

    const flags = caseSensitive ? "g" : "gi";

    if (useRegex) {
        try {
            return text.replace(new RegExp(findValue, flags), replaceValue);
        } catch {
            return text;
        }
    }

    if (caseSensitive) {
        return text.split(findValue).join(replaceValue);
    }

    const pattern = findValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(pattern, flags), replaceValue);
}

export function replaceMultiplePatterns(text, patternText, useRegex = false) {
    let result = text;
    const lines = patternText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    for (const line of lines) {
        const separatorIndex = line.indexOf("|");
        if (separatorIndex === -1) continue;

        const findValue = line.slice(0, separatorIndex);
        const replaceValue = line.slice(separatorIndex + 1);

        if (useRegex) {
            try {
                result = result.replace(new RegExp(findValue, "g"), replaceValue);
            } catch {
                result = result.split(findValue).join(replaceValue);
            }
        } else {
            result = result.split(findValue).join(replaceValue);
        }
    }

    return result;
}

export function countMatches(
    text,
    findValue,
    { useRegex = false, caseSensitive = true } = {},
) {
    if (!findValue) return 0;

    const flags = caseSensitive ? "g" : "gi";

    if (useRegex) {
        try {
            const matches = text.match(new RegExp(findValue, flags));
            return matches ? matches.length : 0;
        } catch {
            return 0;
        }
    }

    if (caseSensitive) {
        let count = 0;
        let index = text.indexOf(findValue);
        while (index !== -1) {
            count += 1;
            index = text.indexOf(findValue, index + findValue.length);
        }
        return count;
    }

    const lowerText = text.toLowerCase();
    const lowerFind = findValue.toLowerCase();
    let count = 0;
    let index = lowerText.indexOf(lowerFind);
    while (index !== -1) {
        count += 1;
        index = lowerText.indexOf(lowerFind, index + lowerFind.length);
    }
    return count;
}
