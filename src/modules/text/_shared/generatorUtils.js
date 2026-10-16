import { PASSPHRASE_WORDS } from "./passphraseWords.js";

const LOREM_WORDS = [
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
    "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
    "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
    "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
    "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
    "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
    "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
    "deserunt", "mollit", "anim", "id", "est", "laborum",
];

const FIRST_NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn",
    "Sam", "Jamie", "Drew", "Skyler", "Rowan", "Harper", "Elliot", "Reese",
];

const LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson",
    "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin",
];

const ADJECTIVES = [
    "swift", "bright", "silent", "lucky", "cosmic", "pixel", "nova", "amber",
    "crisp", "shadow", "turbo", "mint", "iron", "golden", "rapid", "clever",
];

const NOUNS = [
    "fox", "river", "spark", "orbit", "falcon", "matrix", "cipher", "pixel",
    "storm", "ember", "rocket", "cloud", "signal", "vector", "anchor", "forge",
];

const COMPANIES = [
    "Northline Labs", "Bluecrest Systems", "Summit Digital", "Harbor Analytics",
    "Vertex Works", "Silver Oak Software", "Pulseframe", "Clearpath Data",
];

const STREETS = [
    "Maple Street", "Oak Avenue", "Pine Road", "Cedar Lane", "Willow Drive",
    "Sunset Boulevard", "River View", "Highland Park",
];

const CITIES = [
    "Springfield", "Fairview", "Madison", "Georgetown", "Franklin", "Arlington",
];

const AMBIGUOUS = "0O1lI|`'\"\\";

export function randomInt(min, max) {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    const range = high - low + 1;
    if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high) ||
        !Number.isSafeInteger(range) || range < 1) {
        throw new RangeError("Choose a valid safe-integer range.");
    }
    if (!globalThis.crypto?.getRandomValues) {
        throw new Error("Secure random generation is unavailable in this browser.");
    }

    // Reject the incomplete final interval so every possible remainder has
    // exactly the same number of source values, including non-power-of-two pools.
    const space = range <= 0x100000000 ? 0x100000000 : 0x20000000000000;
    const limit = Math.floor(space / range) * range;
    const words = new Uint32Array(space === 0x100000000 ? 1 : 2);
    let sample;
    do {
        crypto.getRandomValues(words);
        sample = words.length === 1 ? words[0] : (words[0] & 0x1fffff) * 0x100000000 + words[1];
    } while (sample >= limit);
    return low + (sample % range);
}

export function randomItem(items) {
    return items[randomInt(0, items.length - 1)];
}

export function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = randomInt(0, index);
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}

function buildCharset({
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = false,
}) {
    let charset = "";
    if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (numbers) charset += "0123456789";
    if (symbols) charset += "!@#$%^&*()-_=+[]{};:,.?";

    if (excludeAmbiguous) {
        charset = [...charset]
            .filter((char) => !AMBIGUOUS.includes(char))
            .join("");
    }

    return charset;
}

export function generatePassword({
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeAmbiguous = false,
}) {
    const charset = buildCharset({
        uppercase,
        lowercase,
        numbers,
        symbols,
        excludeAmbiguous,
    });

    if (!charset) throw new Error("Select at least one character type.");
    const classCount = [uppercase, lowercase, numbers, symbols].filter(Boolean).length;
    if (!Number.isSafeInteger(length) || length < classCount) {
        throw new RangeError("Password length must include every selected character type.");
    }

    const required = [];
    if (uppercase) required.push(randomItem(charset.replace(/[^A-Z]/g, "") || "A"));
    if (lowercase) required.push(randomItem(charset.replace(/[^a-z]/g, "") || "a"));
    if (numbers) required.push(randomItem(charset.replace(/[^0-9]/g, "") || "2"));
    if (symbols) required.push(randomItem(charset.replace(/[\w]/g, "") || "!"));

    const result = [];
    for (let index = 0; index < length; index += 1) {
        result.push(randomItem(charset));
    }

    for (let index = 0; index < required.length && index < result.length; index += 1) {
        result[index] = required[index];
    }

    return shuffle(result).join("");
}

export function generatePassphrase({
    wordCount = 6,
    separator = "-",
    capitalize = false,
}) {
    validatePassphraseWordCount(wordCount);
    const words = Array.from({ length: wordCount }, () => randomItem(PASSPHRASE_WORDS));
    const formatted = capitalize
        ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        : words;
    return formatted.join(separator);
}

function validatePassphraseWordCount(wordCount) {
    if (!Number.isInteger(wordCount) || wordCount < 3 || wordCount > 8) {
        throw new RangeError("Choose between 3 and 8 passphrase words.");
    }
}

export function calculatePassphraseEntropy(wordCount, separator = "-", capitalize = false) {
    validatePassphraseWordCount(wordCount);
    // All words are lowercase ASCII. Nonletter separators or initial capitals
    // preserve boundaries; arbitrary concatenation can merge distinct sequences.
    return {
        bits: wordCount * Math.log2(PASSPHRASE_WORDS.length),
        boundariesPreserved: capitalize || /[^a-z]/.test(separator),
    };
}

export function generateUsername(style = "adjective_noun") {
    const adjective = randomItem(ADJECTIVES);
    const noun = randomItem(NOUNS);
    const number = randomInt(10, 9999);

    switch (style) {
        case "adjective_noun":
            return `${adjective}_${noun}`;
        case "adjective_noun_number":
            return `${adjective}_${noun}${number}`;
        case "camelCase":
            return `${adjective}${noun.charAt(0).toUpperCase()}${noun.slice(1)}`;
        case "dotted":
            return `${adjective}.${noun}`;
        case "short":
            return `${noun}${number}`;
        default:
            return `${adjective}_${noun}`;
    }
}

export function generateLoremWords(count = 50) {
    return Array.from({ length: count }, () => randomItem(LOREM_WORDS)).join(" ");
}

export function generateLoremSentence(minWords = 8, maxWords = 16) {
    const count = randomInt(minWords, maxWords);
    const words = Array.from({ length: count }, () => randomItem(LOREM_WORDS));
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return `${words.join(" ")}.`;
}

export function generateLoremSentences(count = 3) {
    return Array.from({ length: count }, () => generateLoremSentence()).join(" ");
}

export function generateLoremParagraphs(count = 2, sentencesPerParagraph = 4) {
    return Array.from({ length: count }, () =>
        Array.from({ length: sentencesPerParagraph }, () => generateLoremSentence()).join(
            " ",
        ),
    ).join("\n\n");
}

export function generateFakeName() {
    return `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`;
}

export function generateFakeEmail(name = generateFakeName()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".");
    const domains = ["example.com", "mail.test", "demo.io", "sample.dev"];
    return `${slug}${randomInt(1, 99)}@${randomItem(domains)}`;
}

export function generateFakePhone() {
    return `+1 (${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

export function generateFakeAddress() {
    return `${randomInt(100, 9999)} ${randomItem(STREETS)}, ${randomItem(CITIES)}, ${randomItem(["CA", "NY", "TX", "WA"])} ${randomInt(10000, 99999)}`;
}

export function generateFakeCompany() {
    return randomItem(COMPANIES);
}

export function generateFakeDate() {
    const year = randomInt(2020, 2026);
    const month = String(randomInt(1, 12)).padStart(2, "0");
    const day = String(randomInt(1, 28)).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function generateFakeData(type) {
    switch (type) {
        case "name":
            return generateFakeName();
        case "email":
            return generateFakeEmail();
        case "phone":
            return generateFakePhone();
        case "address":
            return generateFakeAddress();
        case "company":
            return generateFakeCompany();
        case "date":
            return generateFakeDate();
        default:
            return "";
    }
}

export function generateUuidV4() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = [...bytes]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(time) {
    let value = time;
    let encoded = "";
    for (let index = 0; index < 10; index += 1) {
        encoded = ENCODING[value % 32] + encoded;
        value = Math.floor(value / 32);
    }
    return encoded;
}

function encodeRandom(length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return [...bytes].map((byte) => ENCODING[byte % 32]).join("");
}

export function generateUlid() {
    return `${encodeTime(Date.now())}${encodeRandom(16)}`;
}

export function generateNanoId(size = 21) {
    const alphabet =
        "_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const bytes = crypto.getRandomValues(new Uint8Array(size));
    return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

export function generateRandomWord() {
    return randomItem([...LOREM_WORDS, ...NOUNS, ...ADJECTIVES]);
}

export function generateRandomNumber(min = 1, max = 1000) {
    return String(randomInt(min, max));
}

export function generateRandomSentence() {
    return generateLoremSentence(5, 12);
}

export function generateRandomNameValue() {
    return generateFakeName();
}

export function generateSlug(text) {
    return text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}

export function generateRandomString(length = 32, charset = "alphanumeric") {
    const sets = {
        alphanumeric:
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        alpha: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
        numeric: "0123456789",
        hex: "0123456789abcdef",
        api: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_",
    };

    const pool = sets[charset] ?? sets.alphanumeric;
    return Array.from({ length }, () => randomItem(pool)).join("");
}

export function generateApiToken(length = 40) {
    return generateRandomString(length, "api");
}

export function generateHexToken(byteLength = 16) {
    const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function generateTestData(type) {
    switch (type) {
        case "id":
            return String(randomInt(1000, 999999));
        case "uuid":
            return generateUuidV4();
        case "username":
            return generateUsername("adjective_noun_number");
        case "email":
            return generateFakeEmail();
        case "url":
            return `https://example.com/items/${randomInt(1000, 9999)}`;
        case "timestamp":
            return new Date(Date.now() - randomInt(0, 1000000000)).toISOString();
        case "boolean":
            return randomInt(0, 1) ? "true" : "false";
        case "status":
            return randomItem(["active", "pending", "archived", "draft"]);
        default:
            return "";
    }
}

