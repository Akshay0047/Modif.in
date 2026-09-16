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
            return Object.keys(input)
                .sort()
                .reduce((accumulator, key) => {
                    accumulator[key] = sortDeep(input[key]);
                    return accumulator;
                }, {});
        }
        return input;
    };

    return JSON.stringify(sortDeep(JSON.parse(value)), null, spaces);
}

export function jsonToYaml(value) {
    const convert = (input, indent = 0) => {
        const padding = "  ".repeat(indent);

        if (input === null) return "null";
        if (typeof input === "boolean" || typeof input === "number") {
            return String(input);
        }
        if (typeof input === "string") {
            return JSON.stringify(input);
        }
        if (Array.isArray(input)) {
            if (input.length === 0) return "[]";
            return input
                .map((item) => {
                    const rendered = convert(item, indent + 1);
                    if (typeof item === "object" && item !== null) {
                        return `${padding}-\n${rendered
                            .split("\n")
                            .map((line) => `  ${line}`)
                            .join("\n")}`;
                    }
                    return `${padding}- ${rendered}`;
                })
                .join("\n");
        }

        const entries = Object.entries(input);
        if (entries.length === 0) return "{}";

        return entries
            .map(([key, item]) => {
                if (typeof item === "object" && item !== null) {
                    return `${padding}${key}:\n${convert(item, indent + 1)}`;
                }
                return `${padding}${key}: ${convert(item, indent + 1)}`;
            })
            .join("\n");
    };

    return convert(JSON.parse(value));
}

export function yamlToJson(value) {
    const lines = value.split("\n");
    const root = {};
    const stack = [{ indent: -1, value: root }];

    for (const rawLine of lines) {
        if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;

        const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
        const line = rawLine.trim();

        while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
            stack.pop();
        }

        const parent = stack[stack.length - 1].value;

        if (line.startsWith("- ")) {
            const arrayTarget = Array.isArray(parent)
                ? parent
                : (() => {
                      const key = Object.keys(parent).pop();
                      if (!Array.isArray(parent[key])) parent[key] = [];
                      return parent[key];
                  })();
            arrayTarget.push(parseYamlScalar(line.slice(2).trim()));
            continue;
        }

        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) continue;

        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1).trim();

        if (!rawValue) {
            parent[key] = {};
            stack.push({ indent, value: parent[key] });
        } else {
            parent[key] = parseYamlScalar(rawValue);
        }
    }

    return JSON.stringify(root, null, 2);
}

function parseYamlScalar(value) {
    if (value === "null") return null;
    if (value === "true") return true;
    if (value === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1);
    }
    return value;
}

export function jsonToCsv(value) {
    const data = JSON.parse(value);
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error("CSV conversion requires a non-empty JSON array.");
    }

    const headers = [...new Set(data.flatMap((row) => Object.keys(row)))];
    const escapeCell = (cell) => {
        const text = cell == null ? "" : String(cell);
        if (/[",\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };

    const rows = [
        headers.join(","),
        ...data.map((row) => headers.map((header) => escapeCell(row[header])).join(",")),
    ];

    return rows.join("\n");
}

export function formatJavaScript(code) {
    let output = "";
    let indent = 0;
    let inString = false;
    let stringChar = "";
    let escaped = false;

    const pushIndent = () => {
        output += "\n" + "    ".repeat(Math.max(0, indent));
    };

    for (let index = 0; index < code.length; index += 1) {
        const char = code[index];

        if (inString) {
            output += char;
            if (escaped) {
                escaped = false;
            } else if (char === "\\") {
                escaped = true;
            } else if (char === stringChar) {
                inString = false;
            }
            continue;
        }

        if (char === '"' || char === "'" || char === "`") {
            inString = true;
            stringChar = char;
            output += char;
            continue;
        }

        if (char === "{") {
            output += " {";
            indent += 1;
            pushIndent();
            continue;
        }

        if (char === "}") {
            indent = Math.max(0, indent - 1);
            pushIndent();
            output += "}";
            continue;
        }

        if (char === ";") {
            output += ";";
            pushIndent();
            continue;
        }

        if (char === "(") {
            output += " (";
            continue;
        }

        if (char === ")") {
            output = output.replace(/\s+$/, "");
            output += ")";
            continue;
        }

        if (char === ",") {
            output += ", ";
            continue;
        }

        if (/\s/.test(char)) {
            if (!/\s$/.test(output)) output += " ";
            continue;
        }

        output += char;
    }

    return output.replace(/\s+\n/g, "\n").trim();
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

export function formatSql(code) {
    return code
        .replace(
            /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|AND|OR)\b/gi,
            "\n$1",
        )
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
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
            return formatJavaScript(code);
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

export function minifyCode(code, language) {
    switch (language) {
        case "json":
            return minifyJson(code);
        case "css":
            return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
        case "html":
            return code.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
        case "javascript":
            return code
                .replace(/\/\*[\s\S]*?\*\//g, "")
                .replace(/(^|[^:])\/\/.*$/gm, "$1")
                .replace(/\s+/g, " ")
                .trim();
        default:
            return code.replace(/\s+/g, " ").trim();
    }
}

export function testRegex(pattern, flags, text) {
    const regex = new RegExp(pattern, flags);
    const matches = [...text.matchAll(regex)].map((match) => ({
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
    const expiration =
        typeof payload.exp === "number"
            ? new Date(payload.exp * 1000).toISOString()
            : null;

    return { header, payload, expiration, claims: payload };
}

export function timestampToDate(value) {
    const numeric = Number(value);
    const milliseconds = numeric > 1e12 ? numeric : numeric * 1000;
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

export function validateXml(value) {
    const parser = new DOMParser();
    const document = parser.parseFromString(value, "application/xml");
    const errorNode = document.querySelector("parsererror");
    if (errorNode) {
        throw new Error(errorNode.textContent || "Invalid XML.");
    }
    return { valid: true, message: "Valid XML" };
}

export function minifyXml(value) {
    return value.replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
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
    return Object.fromEntries(params.entries());
}

export function generateQueryString(value) {
    const parsed = JSON.parse(value);
    const params = new URLSearchParams();
    Object.entries(parsed).forEach(([key, item]) => {
        if (item == null) return;
        params.set(key, String(item));
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
