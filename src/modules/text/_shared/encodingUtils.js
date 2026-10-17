const MORSE_CODE = {
    A: ".-",
    B: "-...",
    C: "-.-.",
    D: "-..",
    E: ".",
    F: "..-.",
    G: "--.",
    H: "....",
    I: "..",
    J: ".---",
    K: "-.-",
    L: ".-..",
    M: "--",
    N: "-.",
    O: "---",
    P: ".--.",
    Q: "--.-",
    R: ".-.",
    S: "...",
    T: "-",
    U: "..-",
    V: "...-",
    W: ".--",
    X: "-..-",
    Y: "-.--",
    Z: "--..",
    0: "-----",
    1: ".----",
    2: "..---",
    3: "...--",
    4: "....-",
    5: ".....",
    6: "-....",
    7: "--...",
    8: "---..",
    9: "----.",
};

const ROMAN_NUMERALS = [
    ["M", 1000],
    ["CM", 900],
    ["D", 500],
    ["CD", 400],
    ["C", 100],
    ["XC", 90],
    ["L", 50],
    ["XL", 40],
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
];

export function encodeBase64(value) {
    return btoa(unescape(encodeURIComponent(value)));
}

export function decodeBase64(value) {
    return decodeURIComponent(escape(atob(value.trim())));
}

export function encodeUrl(value) {
    return encodeURIComponent(value);
}

export function decodeUrl(value) {
    return decodeURIComponent(value);
}

export function textToBinary(value, separator = " ") {
    return [...new TextEncoder().encode(value)]
        .map((byte) => byte.toString(2).padStart(8, "0"))
        .join(separator);
}

export function binaryToText(value) {
    if (!value.trim()) return "";
    const chunks = value.trim().split(/\s+/);
    if (chunks.some((chunk) => !/^[01]{8}$/.test(chunk))) {
        throw new Error("Enter complete 8-bit binary bytes (0 and 1 only), separated by spaces.");
    }
    return decodeUtf8Bytes(chunks.map((chunk) => Number.parseInt(chunk, 2)));
}

export function textToHex(value, separator = " ") {
    return [...new TextEncoder().encode(value)]
        .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
        .join(separator);
}

export function hexToText(value) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.split(/\s+/).some((chunk) => !/^(?:[0-9a-fA-F]{2})+$/.test(chunk))) {
        throw new Error("Enter complete pairs of hexadecimal digits (0–9 and A–F), with optional spaces.");
    }
    const bytes = trimmed.replace(/\s/g, "").match(/../g);
    return decodeUtf8Bytes(bytes.map((chunk) => Number.parseInt(chunk, 16)));
}

export function asciiToDecimal(value) {
    return asciiCodes(value).join(" ");
}

export function decimalToAscii(value) {
    if (!value.trim()) return "";
    const tokens = value.trim().split(/\s+/);
    if (tokens.some((token) => !/^\d+$/.test(token) || Number(token) > 127)) {
        throw new Error("Enter whole ASCII decimal codes from 0 to 127, separated by spaces.");
    }
    return tokens.map((code) => String.fromCharCode(Number(code))).join("");
}

export function asciiToHex(value) {
    return asciiCodes(value).map((code) => code.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}

export function hexToAscii(value) {
    return requireAscii(hexToText(value));
}

export function asciiToBinary(value) {
    return asciiCodes(value).map((code) => code.toString(2).padStart(8, "0")).join(" ");
}

export function binaryToAscii(value) {
    return requireAscii(binaryToText(value));
}

function decodeUtf8Bytes(bytes) {
    try {
        return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(Uint8Array.from(bytes));
    } catch {
        throw new Error("These bytes are not valid UTF-8 text. Check for missing or incorrect bytes.");
    }
}

function requireAscii(value) {
    if ([...value].some((char) => char.codePointAt(0) > 127)) {
        throw new Error("ASCII supports codes 0 to 127 only. Use Binary ↔ Text or Hex ↔ Text for Unicode.");
    }
    return value;
}

function asciiCodes(value) {
    return [...requireAscii(value)].map((char) => char.charCodeAt(0));
}

export function convertNumberBase(value, fromBase, toBase) {
    if (![fromBase, toBase].every((base) => Number.isInteger(base) && base >= 2 && base <= 36)) {
        throw new Error("Choose an integer base from 2 to 36.");
    }
    const input = String(value).trim();
    const digits = input.replace(/^[+-]/, "");
    if (!/^[0-9a-z]+$/i.test(digits) || [...digits].some((digit) => Number.parseInt(digit, 36) >= fromBase)) {
        throw new Error(`Enter a whole base-${fromBase} integer using only valid digits, without a prefix.`);
    }
    let decimal = 0n;
    const radix = BigInt(fromBase);
    for (const digit of digits) {
        decimal = decimal * radix + BigInt(Number.parseInt(digit, 36));
    }
    if (input.startsWith("-")) decimal = -decimal;
    return decimal.toString(toBase).toUpperCase();
}

export function textToMorse(value) {
    return value
        .toUpperCase()
        .split("")
        .map((char) => {
            if (char === " ") return "/";
            return MORSE_CODE[char] ?? "";
        })
        .filter(Boolean)
        .join(" ");
}

export function morseToText(value) {
    return value
        .trim()
        .split(/(\/)|\s+/)
        .filter(Boolean)
        .map((token) => {
            if (token === "/") return " ";
            const entry = Object.entries(MORSE_CODE).find(([, code]) => code === token);
            return entry ? entry[0] : "";
        })
        .join("");
}

export function textToUnicodeEscapes(value) {
    return [...value]
        .map((char) => {
            const codePoint = char.codePointAt(0);
            if (codePoint <= 0xffff) {
                return `\\u${codePoint.toString(16).padStart(4, "0")}`;
            }
            const adjusted = codePoint - 0x10000;
            const high = 0xd800 + (adjusted >> 10);
            const low = 0xdc00 + (adjusted & 0x3ff);
            return `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
        })
        .join("");
}

export function unicodeEscapesToText(value) {
    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

export function rot13(value) {
    return caesarCipher(value, 13);
}

export function caesarCipher(value, shift = 3) {
    return [...value]
        .map((char) => {
            if (/[a-z]/.test(char)) {
                const base = "a".charCodeAt(0);
                return String.fromCharCode(
                    ((char.charCodeAt(0) - base + shift) % 26) + base,
                );
            }
            if (/[A-Z]/.test(char)) {
                const base = "A".charCodeAt(0);
                return String.fromCharCode(
                    ((char.charCodeAt(0) - base + shift) % 26) + base,
                );
            }
            return char;
        })
        .join("");
}

export function atbashCipher(value) {
    return [...value]
        .map((char) => {
            if (/[a-z]/.test(char)) {
                return String.fromCharCode(122 - (char.charCodeAt(0) - 97));
            }
            if (/[A-Z]/.test(char)) {
                return String.fromCharCode(90 - (char.charCodeAt(0) - 65));
            }
            return char;
        })
        .join("");
}

export function numberToRoman(value) {
    const input = String(value).trim();
    let number = Number(input);
    if (!/^\d+$/.test(input) || !Number.isInteger(number) || number <= 0 || number > 3999) {
        throw new Error("Roman numerals support integers from 1 to 3999.");
    }

    let result = "";
    for (const [numeral, amount] of ROMAN_NUMERALS) {
        while (number >= amount) {
            result += numeral;
            number -= amount;
        }
    }
    return result;
}

export function romanToNumber(value) {
    const roman = value.trim().toUpperCase();
    if (!roman || !/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(roman)) {
        throw new Error("Enter a canonical Roman numeral from I to MMMCMXCIX (1–3999).");
    }

    let total = 0;
    for (let index = 0; index < roman.length; index += 1) {
        const current = romanNumeralValue(roman[index]);
        const next = romanNumeralValue(roman[index + 1] ?? "");
        total += current < next ? -current : current;
    }
    return String(total);
}

function romanNumeralValue(symbol) {
    return (
        {
            I: 1,
            V: 5,
            X: 10,
            L: 50,
            C: 100,
            D: 500,
            M: 1000,
        }[symbol] ?? 0
    );
}

export function safeExecute(label, fn) {
    try {
        return { ok: true, value: fn(), error: "" };
    } catch (error) {
        return {
            ok: false,
            value: "",
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
