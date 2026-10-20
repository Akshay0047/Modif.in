import { createTool } from "./createTool.js";

const PREFIX = "text";

// Curated common tasks; see docs/popular-tools.md for selection criteria.
export const textPopularToolOrder = [
    "text-counter",
    "case-converter",
    "text-comparison",
    "text-cleaner",
    "json-tools",
    "base64-encoder-decoder",
    "password-generator",
    "uuid-id-generator",
];

const popularToolIds = new Set(textPopularToolOrder);
const tool = (id, name, category) =>
    createTool(PREFIX, id, name, category, popularToolIds.has(id));

export const textToolsData = [
    {
        id: "text-analysis",
        name: "Text Analysis",
        tools: [
            tool("text-counter", "Text Counter", "Text Analysis"),
            tool("text-comparison", "Text Comparison", "Text Analysis"),
            tool("text-statistics", "Text Statistics", "Text Analysis"),
            tool(
                "reading-speaking-time",
                "Reading or Speaking Time",
                "Text Analysis",
            ),
            tool("duplicate-finder", "Duplicate Finder", "Text Analysis"),
            tool("whitespace-analyzer", "Whitespace Analyzer", "Text Analysis"),
        ],
    },
    {
        id: "text-formatter-converter",
        name: "Text Formatter & Converter",
        tools: [
            tool(
                "case-converter",
                "Case Converter",
                "Text Formatter & Converter",
            ),
            tool(
                "text-cleaner",
                "Text Cleaner",
                "Text Formatter & Converter",
            ),
            tool(
                "fancy-text-converter",
                "Fancy Text Converter",
                "Text Formatter & Converter",
            ),
            tool(
                "code-case-converter",
                "Code Case Converter",
                "Text Formatter & Converter",
            ),
            tool("line-tools", "Line Tools", "Text Formatter & Converter"),
            tool("text-reverser", "Text Reverser", "Text Formatter & Converter"),
            tool("prefix-suffix", "Prefix & Suffix", "Text Formatter & Converter"),
            tool("find-replace", "Find & Replace", "Text Formatter & Converter"),
        ],
    },
    {
        id: "developer-tools",
        name: "Developer Tools",
        tools: [
            tool("json-tools", "JSON Tools", "Developer Tools"),
            tool("code-formatter", "Code Formatter", "Developer Tools"),
            tool("jwt-decoder", "JWT Decoder", "Developer Tools"),
            tool("code-minifier", "Code Minifier", "Developer Tools"),
            tool("regex-tester", "Regex Tester", "Developer Tools"),
            tool("markdown-tools", "Markdown Tools", "Developer Tools"),
            tool("timestamp-converter", "Timestamp Converter", "Developer Tools"),
            tool("xml-tools", "XML Tools", "Developer Tools"),
            tool("html-entity-tools", "HTML Entity Tools", "Developer Tools"),
            tool("query-string-tools", "Query String Tools", "Developer Tools"),
        ],
    },
    {
        id: "generators",
        name: "Generators",
        tools: [
            tool("password-generator", "Password Generator", "Generators"),
            tool(
                "lorem-ipsum-generator",
                "Lorem Ipsum Generator",
                "Generators",
            ),
            tool("uuid-id-generator", "UUID / ID Generator", "Generators"),
            tool("username-generator", "Username Generator", "Generators"),
            tool("fake-data-generator", "Fake Data Generator", "Generators"),
            tool("random-generator", "Random Generator", "Generators"),
            tool("slug-generator", "Slug Generator", "Generators"),
            tool("token-generator", "Token Generator", "Generators"),
            tool("test-data-generator", "Test Data Generator", "Generators"),
        ],
    },
    {
        id: "encode-decode-convert",
        name: "Encode, Decode & Convert",
        tools: [
            tool(
                "base64-encoder-decoder",
                "Base64 Encoder / Decoder",
                "Encode, Decode & Convert",
            ),
            tool(
                "url-encoder-decoder",
                "URL Encoder / Decoder",
                "Encode, Decode & Convert",
            ),
            tool("binary-text", "Binary ↔ Text", "Encode, Decode & Convert"),
            tool("hex-text", "Hex ↔ Text", "Encode, Decode & Convert"),
            tool("ascii-converter", "ASCII Converter", "Encode, Decode & Convert"),
            tool(
                "number-base-converter",
                "Number Base Converter",
                "Encode, Decode & Convert",
            ),
            tool(
                "morse-code-converter",
                "Morse Code Converter",
                "Encode, Decode & Convert",
            ),
            tool(
                "unicode-escape-converter",
                "Unicode Escape Converter",
                "Encode, Decode & Convert",
            ),
            tool(
                "classical-cipher-tools",
                "Classical Cipher Tools",
                "Encode, Decode & Convert",
            ),
            tool(
                "roman-numeral-converter",
                "Roman Numeral Converter",
                "Encode, Decode & Convert",
            ),
        ],
    },
    {
        id: "web-url-security",
        name: "Web, URL & Security",
        tools: [
            tool("hash-generator", "Hash Generator", "Web, URL & Security"),
            tool(
                "password-strength-checker",
                "Password Strength Checker",
                "Web, URL & Security",
            ),
            tool("url-sanitizer", "URL Sanitizer", "Web, URL & Security"),
            tool("url-parser", "URL Parser", "Web, URL & Security"),
            tool("url-validator", "URL Validator", "Web, URL & Security"),
            tool(
                "lookalike-link-detector",
                "Lookalike Link Detector",
                "Web, URL & Security",
            ),
            tool("utm-builder-cleaner", "UTM Builder / Cleaner", "Web, URL & Security"),
            tool("meta-tag-generator", "Meta Tag Generator", "Web, URL & Security"),
            tool("robots-txt-generator", "Robots.txt Generator", "Web, URL & Security"),
            tool("sitemap-generator", "Sitemap Generator", "Web, URL & Security"),
            tool("entropy-calculator", "Entropy Calculator", "Web, URL & Security"),
            tool("hmac-generator", "HMAC Generator", "Web, URL & Security"),
            tool("pii-detector", "PII Detector", "Web, URL & Security"),
        ],
    },
    {
        id: "ascii-unicode-symbols",
        name: "ASCII, Unicode & Symbols",
        tools: [
            tool(
                "special-character-picker",
                "Special Character Picker",
                "ASCII, Unicode & Symbols",
            ),
            tool(
                "invisible-character-tools",
                "Invisible Character Tools",
                "ASCII, Unicode & Symbols",
            ),
            tool("ascii-kaomoji", "ASCII Emojis", "ASCII, Unicode & Symbols"),
            tool(
                "unicode-symbol-picker",
                "Unicode Symbol Picker",
                "ASCII, Unicode & Symbols",
            ),
            tool(
                "unicode-character-info",
                "Unicode Character Info",
                "ASCII, Unicode & Symbols",
            ),
            tool(
                "separators-dividers",
                "Separators and Dividers",
                "ASCII, Unicode & Symbols",
            ),
        ],
    },
];
