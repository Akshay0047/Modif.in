export function countWords(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text, includeSpaces = true) {
    if (includeSpaces) return text.length;
    return text.replace(/\s/g, "").length;
}

export function countSentences(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    const matches = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    return matches ? matches.filter((segment) => segment.trim()).length : 0;
}

export function countParagraphs(text) {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\n\s*\n/).filter((block) => block.trim()).length;
}

export function countLines(text) {
    if (!text) return 0;
    return text.split("\n").length;
}

export function estimateSyllables(word) {
    const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!cleaned) return 0;
    if (cleaned.length <= 3) return 1;

    let syllables = cleaned.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    syllables = syllables.replace(/^y/, "");
    const matches = syllables.match(/[aeiouy]{1,2}/g);
    return Math.max(1, matches ? matches.length : 1);
}

export function getWordFrequency(text) {
    const words = text
        .toLowerCase()
        .match(/[\p{L}\p{N}']+/gu) ?? [];

    const frequency = new Map();
    for (const word of words) {
        frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }

    return [...frequency.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([word, count]) => ({ word, count }));
}

export function getCharacterFrequency(text) {
    const frequency = new Map();
    for (const char of text) {
        if (/\s/.test(char)) continue;
        frequency.set(char, (frequency.get(char) ?? 0) + 1);
    }

    return [...frequency.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([char, count]) => ({ char, count }));
}

export function computeReadabilityStats(text) {
    const words = text.match(/[\p{L}\p{N}']+/gu) ?? [];
    const wordCount = words.length;
    const sentenceCount = Math.max(1, countSentences(text));
    const syllableCount = words.reduce(
        (total, word) => total + estimateSyllables(word),
        0,
    );

    const averageWordLength =
        wordCount === 0
            ? 0
            : words.reduce((total, word) => total + word.length, 0) / wordCount;

    const averageSentenceLength = wordCount / sentenceCount;
    const syllablesPerWord = wordCount === 0 ? 0 : syllableCount / wordCount;

    const fleschReadingEase =
        wordCount === 0
            ? 0
            : 206.835 -
              1.015 * averageSentenceLength -
              84.6 * syllablesPerWord;

    const longWords = words.filter((word) => word.length > 6).length;
    const longWordPercentage =
        wordCount === 0 ? 0 : (longWords / wordCount) * 100;

    return {
        averageWordLength,
        averageSentenceLength,
        syllablesPerWord,
        fleschReadingEase,
        longWordPercentage,
        wordCount,
        sentenceCount,
    };
}

export function diffTexts(left, right, mode = "word") {
    const tokenize = (value) => {
        if (mode === "char") {
            return [...value];
        }
        return value.match(/\s+|[^\s]+/g) ?? [];
    };

    const leftTokens = tokenize(left);
    const rightTokens = tokenize(right);
    const rows = leftTokens.length;
    const cols = rightTokens.length;

    const matrix = Array.from({ length: rows + 1 }, () =>
        Array(cols + 1).fill(0),
    );

    for (let i = rows - 1; i >= 0; i -= 1) {
        for (let j = cols - 1; j >= 0; j -= 1) {
            if (leftTokens[i] === rightTokens[j]) {
                matrix[i][j] = matrix[i + 1][j + 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
            }
        }
    }

    const result = [];
    let i = 0;
    let j = 0;

    while (i < rows && j < cols) {
        if (leftTokens[i] === rightTokens[j]) {
            result.push({ type: "same", value: leftTokens[i] });
            i += 1;
            j += 1;
        } else if (matrix[i + 1][j] >= matrix[i][j + 1]) {
            result.push({ type: "removed", value: leftTokens[i] });
            i += 1;
        } else {
            result.push({ type: "added", value: rightTokens[j] });
            j += 1;
        }
    }

    while (i < rows) {
        result.push({ type: "removed", value: leftTokens[i] });
        i += 1;
    }

    while (j < cols) {
        result.push({ type: "added", value: rightTokens[j] });
        j += 1;
    }

    const added = result.filter((part) => part.type === "added").length;
    const removed = result.filter((part) => part.type === "removed").length;
    const unchanged = result.filter((part) => part.type === "same").length;

    return { parts: result, added, removed, unchanged };
}

export function findDuplicateWords(text, caseSensitive = false) {
    const words = text.match(/[\p{L}\p{N}']+/gu) ?? [];
    const frequency = new Map();

    for (const word of words) {
        const key = caseSensitive ? word : word.toLowerCase();
        frequency.set(key, (frequency.get(key) ?? 0) + 1);
    }

    return [...frequency.entries()]
        .filter(([, count]) => count > 1)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([word, count]) => ({ word, count }));
}

export function findDuplicateSentences(text) {
    const sentences =
        text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()) ??
        [];
    const frequency = new Map();

    for (const sentence of sentences) {
        if (!sentence) continue;
        const key = sentence.toLowerCase();
        frequency.set(key, {
            text: sentence,
            count: (frequency.get(key)?.count ?? 0) + 1,
        });
    }

    return [...frequency.values()]
        .filter((entry) => entry.count > 1)
        .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

export function findDuplicateLines(text, trimLines = true) {
    const lines = text.split("\n");
    const frequency = new Map();

    lines.forEach((line, index) => {
        const value = trimLines ? line.trim() : line;
        if (!value) return;
        const existing = frequency.get(value) ?? { text: line, count: 0, lines: [] };
        existing.count += 1;
        existing.lines.push(index + 1);
        frequency.set(value, existing);
    });

    return [...frequency.values()]
        .filter((entry) => entry.count > 1)
        .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

const UNUSUAL_WHITESPACE = [
    { label: "Non-breaking space (U+00A0)", regex: /\u00a0/g },
    { label: "Zero-width space (U+200B)", regex: /\u200b/g },
    { label: "Zero-width non-joiner (U+200C)", regex: /\u200c/g },
    { label: "Zero-width joiner (U+200D)", regex: /\u200d/g },
    { label: "Byte order mark (U+FEFF)", regex: /\ufeff/g },
    { label: "Em space (U+2003)", regex: /\u2003/g },
    { label: "En space (U+2002)", regex: /\u2002/g },
    { label: "Thin space (U+2009)", regex: /\u2009/g },
];

export function analyzeWhitespace(text) {
    const lines = text.split("\n");
    let leadingSpaceLines = 0;
    let trailingSpaceLines = 0;
    let consecutiveSpaceGroups = 0;
    let tabCount = 0;
    let emptyLines = 0;

    for (const line of lines) {
        if (line.trim() === "") {
            emptyLines += 1;
        }
        if (/^\s+/.test(line) && line.trim() !== "") {
            leadingSpaceLines += 1;
        }
        if (/\s+$/.test(line)) {
            trailingSpaceLines += 1;
        }
        tabCount += (line.match(/\t/g) ?? []).length;
        consecutiveSpaceGroups += (line.match(/ {2,}/g) ?? []).length;
    }

    const unusual = UNUSUAL_WHITESPACE.map(({ label, regex }) => ({
        label,
        count: (text.match(regex) ?? []).length,
    })).filter((entry) => entry.count > 0);

    return {
        leadingSpaceLines,
        trailingSpaceLines,
        consecutiveSpaceGroups,
        tabCount,
        emptyLines,
        totalLines: lines.length,
        unusual,
    };
}
