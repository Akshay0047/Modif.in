export function formatJson(value, spaces = 2) {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, spaces);
}

export function minifyJson(value) {
    return JSON.stringify(JSON.parse(value));
}

export function validateJson(value) {
    JSON.parse(value);
    return { valid: true, message: "Valid JSON" };
}

export function sortJsonKeys(value, spaces = 2) {
    const sortDeep = (input) => {
        if (Array.isArray(input)) {
            return input.map(sortDeep);
        }
        if (input && typeof input === "object") {
            return Object.fromEntries(Object.keys(input)
                .sort()
                .map((key) => [key, sortDeep(input[key])]));
        }
        return input;
    };

    return JSON.stringify(sortDeep(JSON.parse(value)), null, spaces);
}

export async function jsonToYaml(value) {
    const { stringify } = await import("yaml");
    return stringify(JSON.parse(value));
}

export async function yamlToJson(value) {
    const { parseDocument } = await import("yaml");
    const document = parseDocument(value, { stringKeys: true, intAsBigInt: true });
    const problem = document.errors[0] ?? document.warnings[0];
    if (problem) throw new Error(problem.message);
    const parsed = document.toJS({ maxAliasCount: 100 });
    return JSON.stringify(parsed, (_key, item) => {
        if (typeof item === "bigint") {
            const number = Number(item);
            if (!Number.isSafeInteger(number)) {
                throw new Error("YAML integer is outside the safe JSON number range.");
            }
            return number;
        }
        if (typeof item === "number" && !Number.isFinite(item)) {
            throw new Error("JSON cannot represent non-finite YAML numbers.");
        }
        return item;
    }, 2);
}

export function jsonToCsv(value) {
    const data = JSON.parse(value);
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("CSV conversion requires a non-empty JSON array.");
    }

    const headers = [...new Set(data.flatMap((row) => Object.keys(row)))];
    const escapeCell = (cell) => {
        const text = cell == null ? "" : String(cell);
        if (/[",\r\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };

    const rows = [
        headers.map(escapeCell).join(","),
        ...data.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
    ];

    return rows.join("\n");
}

export async function formatJavaScript(code, language = "javascript") {
    const typed = language === "typescript" || language === "tsx";
    const [{ format }, syntax, estree] = await Promise.all([
        import("prettier/standalone"),
        typed ? import("prettier/plugins/typescript") : import("prettier/plugins/babel"),
        import("prettier/plugins/estree"),
    ]);
    return format(code, {
        parser: typed ? "typescript" : "babel",
        filepath: `input.${language === "tsx" ? "tsx" : typed ? "ts" : language === "jsx" ? "jsx" : "js"}`,
        plugins: [syntax.default, estree.default],
        tabWidth: 4,
    });
}

export function formatHtml(code) {
    return code
        .replace(/>\s+</g, ">\n<")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .reduce(
            (accumulator, line) => {
                if (/^<\/.+>/.test(line)) {
                    accumulator.indent = Math.max(0, accumulator.indent - 1);
                }

                accumulator.lines.push(
                    `${"  ".repeat(accumulator.indent)}${line}`,
                );

                if (
                    /^<[^/!][^>]*[^/]>$/.test(line) &&
                    !/^<(br|hr|img|input|meta|link)\b/i.test(line)
                ) {
                    accumulator.indent += 1;
                }

                return accumulator;
            },
            { indent: 0, lines: [] },
        )
        .lines.join("\n");
}

export function formatCss(code) {
    return code
        .replace(/\{/g, " {\n")
        .replace(/\}/g, "\n}\n")
        .replace(/;/g, ";\n")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index, lines) => {
            if (line.endsWith("{")) return line;
            if (line === "}") return line;
            const previous = lines[index - 1] ?? "";
            return previous.endsWith("{") ? `  ${line}` : line;
        })
        .join("\n");
}

export async function formatSql(code) {
    const { format } = await import("sql-formatter");
    return format(code, { language: "sql" });
}

export function formatXml(code) {
    return formatHtml(code);
}

export function formatCode(code, language) {
    switch (language) {
        case "javascript":
        case "typescript":
        case "jsx":
        case "tsx":
            return formatJavaScript(code, language);
        case "html":
            return formatHtml(code);
        case "css":
            return formatCss(code);
        case "sql":
            return formatSql(code);
        case "json":
            return formatJson(code);
        case "xml":
            return formatXml(code);
        default:
            return code;
    }
}

export async function minifyCode(code, language) {
    switch (language) {
        case "json":
            return minifyJson(code);
        case "css": {
            const { parse, generate } = await import("css-tree");
            const ast = parse(code, { onParseError(error) { throw error; } });
            return generate(ast);
        }
        case "html":
            return code.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
        case "javascript": {
            const { minify } = await import("terser");
            const result = await minify(code, {
                parse: { bare_returns: true },
                compress: false,
                mangle: false,
                format: { comments: "some" },
            });
            return result.code;
        }
        default:
            return code.replace(/\s+/g, " ").trim();
    }
}

export function testRegex(pattern, flags, text) {
    const regex = new RegExp(pattern, flags);
    const first = regex.global ? null : regex.exec(text);
    const results = regex.global ? [...text.matchAll(regex)] : first ? [first] : [];
    const matches = results.map((match) => ({
        match: match[0],
        index: match.index,
        groups: match.slice(1),
    }));

    return { matches, valid: true };
}

export function previewRegexReplace(pattern, flags, text, replacement) {
    const regex = new RegExp(pattern, flags);
    return text.replace(regex, replacement);
}

export function decodeJwt(token) {
    const parts = token.trim().split(".");
    if (parts.length < 2) {
        throw new Error("Invalid JWT format.");
    }

    const decodePart = (part) =>
        JSON.parse(
            decodeURIComponent(
                atob(part.replace(/-/g, "+").replace(/_/g, "/"))
                    .split("")
                    .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
                    .join(""),
            ),
        );

    const header = decodePart(parts[0]);
    const payload = decodePart(parts[1]);
    let expiration = null;
    let expirationError = null;
    if (payload && typeof payload === "object" && Object.hasOwn(payload, "exp")) {
        const date = typeof payload.exp === "number" && Number.isFinite(payload.exp)
            ? new Date(payload.exp * 1000)
            : null;
        if (!date || Number.isNaN(date.getTime())) {
            expirationError = "Invalid exp claim: use numeric Unix seconds within the supported date range.";
        } else {
            expiration = date.toISOString();
        }
    }

    return { header, payload, expiration, expirationError, claims: payload };
}

export function timestampToDate(value, unit = "seconds") {
    const input = String(value).trim();
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(input)) {
        throw new Error("Enter a numeric timestamp in the selected unit.");
    }
    if (unit !== "seconds" && unit !== "milliseconds") {
        throw new Error("Select seconds or milliseconds.");
    }
    const numeric = Number(input);
    const milliseconds = unit === "milliseconds" ? numeric : numeric * 1000;
    if (!Number.isSafeInteger(milliseconds)) {
        throw new Error("Timestamp must resolve to a whole, safely represented millisecond.");
    }
    const date = new Date(milliseconds);
    if (Number.isNaN(date.getTime())) {
        throw new Error("Invalid timestamp.");
    }
    return date;
}

export function dateToTimestamps(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) {
        throw new Error("Invalid date.");
    }
    return {
        iso: date.toISOString(),
        unixSeconds: Math.floor(date.getTime() / 1000),
        unixMilliseconds: date.getTime(),
    };
}

export function formatXmlDocument(value) {
    return formatXml(value);
}

function parseXmlDocument(value) {
    const parser = new DOMParser();
    const document = parser.parseFromString(value, "application/xml");
    const errorNode = [
        "http://www.mozilla.org/newlayout/xml/parsererror.xml",
        "http://www.w3.org/1999/xhtml",
    ].map((namespace) => document.getElementsByTagNameNS(namespace, "parsererror")[0]).find(Boolean);
    if (errorNode) {
        throw new Error(errorNode.textContent || "Invalid XML.");
    }
    return document;
}

export function validateXml(value) {
    parseXmlDocument(value);
    return { valid: true, message: "Valid XML" };
}

export function minifyXml(value) {
    // Without a schema, even whitespace-only text nodes can be meaningful.
    // Let the XML serializer compact markup syntax; retain every content node.
    return new XMLSerializer().serializeToString(parseXmlDocument(value));
}

export function encodeHtmlEntities(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function decodeHtmlEntities(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
}

export function parseQueryString(value) {
    const params = new URLSearchParams(value.startsWith("?") ? value.slice(1) : value);
    const grouped = new Map();
    for (const [key, item] of params) {
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
    }
    return Object.fromEntries([...grouped].map(([key, items]) => [key, items.length === 1 ? items[0] : items]));
}

export function generateQueryString(value) {
    const parsed = JSON.parse(value);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new Error("Enter a JSON object with scalar values or arrays of scalars.");
    }
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, item]) => {
        const items = Array.isArray(item) ? item : [item];
        for (const entry of items) {
            if (entry == null) continue;
            if (!["string", "number", "boolean"].includes(typeof entry) || (typeof entry === "number" && !Number.isFinite(entry))) {
                throw new Error(`Query parameter "${key}" must contain scalar values.`);
            }
            params.append(key, String(entry));
        }
    });
    return params.toString();
}

export function formatMarkdown(value) {
    return value
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\s+|\s+$/g, "")
        .replace(/^(-|\*|\+|\d+\.)\s+/gm, (match) => match.trim() + " ");
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
