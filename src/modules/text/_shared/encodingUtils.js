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
    return [...value]
        .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
        .join(separator);
}

export function binaryToText(value) {
    const chunks = value.trim().split(/\s+/);
    return chunks
        .map((chunk) => String.fromCharCode(Number.parseInt(chunk, 2)))
        .join("");
}

export function textToHex(value, separator = " ") {
    return [...value]
        .map((char) => char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
        .join(separator);
}

export function hexToText(value) {
    const cleaned = value.replace(/[^0-9a-fA-F]/g, "");
    return cleaned
        .match(/.{1,2}/g)
        ?.map((chunk) => String.fromCharCode(Number.parseInt(chunk, 16)))
        .join("") ?? "";
}

export function asciiToDecimal(value) {
    return [...value].map((char) => char.charCodeAt(0)).join(" ");
}

export function decimalToAscii(value) {
    return value
        .trim()
        .split(/\s+/)
        .map((code) => String.fromCharCode(Number.parseInt(code, 10)))
        .join("");
}

export function asciiToHex(value) {
    return textToHex(value, " ");
}

export function hexToAscii(value) {
    return hexToText(value);
}

export function asciiToBinary(value) {
    return textToBinary(value, " ");
}

export function binaryToAscii(value) {
    return binaryToText(value);
}

export function convertNumberBase(value, fromBase, toBase) {
    const decimal = Number.parseInt(String(value).trim(), fromBase);
    if (Number.isNaN(decimal)) {
        throw new Error("Invalid number for the selected base.");
    }
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
    let number = Number.parseInt(String(value).trim(), 10);
    if (Number.isNaN(number) || number <= 0 || number > 3999) {
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
    if (!/^[MDCLXVI]+$/.test(roman)) {
        throw new Error("Invalid Roman numeral.");
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
