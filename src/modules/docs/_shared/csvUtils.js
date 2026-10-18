import Papa from "papaparse";
import * as XLSX from "xlsx";

export function parseCsv(text, options = {}) {
    const result = Papa.parse(text, {
        header: options.header ?? true,
        skipEmptyLines: true,
        ...options,
    });
    if (result.errors.length) {
        throw new Error(result.errors[0].message);
    }
    return result.data;
}

export function toCsv(data) {
    return Papa.unparse(data);
}

export function csvToJson(text) {
    return parseCsv(text, { header: true });
}

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function tableCells(data) {
    if (Array.isArray(data)) {
        const headers = Object.keys(data[0] ?? {});
        return {
            headers,
            rows: data.map((row) => headers.map((key) => row[key] ?? "")),
        };
    }

    const parsed = Papa.parse(String(data ?? ""), { header: false, skipEmptyLines: true });
    if (parsed.errors.length) throw new Error(parsed.errors[0].message);
    const [headers = [], ...body] = parsed.data;
    body.forEach((row, index) => {
        if (row.length !== headers.length) {
            throw new Error(`CSV row ${index + 2} has ${row.length} fields; expected ${headers.length}.`);
        }
    });
    return {
        headers,
        rows: body.map((row) => headers.map((_, index) => row[index] ?? "")),
    };
}

export function csvToXml(data) {
    const { headers, rows } = tableCells(data);
    const body = rows
        .map((row) => {
            const fields = headers
                .map((key, index) => `    <field name="${escapeXml(key)}">${escapeXml(row[index])}</field>`)
                .join("\n");
            return `  <row>\n${fields}\n  </row>`;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${body}\n</data>`;
}

export function csvToExcel(data) {
    const rows = Array.isArray(data) ? data : parseCsv(data, { header: true });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

export async function parseExcel(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export function toMarkdownTable(data) {
    const rows = Array.isArray(data) ? data : parseCsv(data, { header: true });
    if (!rows.length) return "";

    const headers = Object.keys(rows[0]);
    const escape = (value) =>
        String(value ?? "")
            .replace(/\\/g, "\\\\")
            .replace(/\|/g, "\\|")
            .replace(/\r\n|\r|\n/g, "<br>");

    const headerRow = `| ${headers.map(escape).join(" | ")} |`;
    const separator = `| ${headers.map(() => "---").join(" | ")} |`;
    const body = rows.map(
        (row) => `| ${headers.map((key) => escape(row[key])).join(" | ")} |`,
    );

    return [headerRow, separator, ...body].join("\n");
}

export function dedupeRows(data, key) {
    const seen = new Set();
    return data.filter((row) => {
        const value = key ? row[key] : JSON.stringify(row);
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

export function filterRows(data, query) {
    const lower = query.toLowerCase();
    return data.filter((row) =>
        Object.values(row).some((value) =>
            String(value).toLowerCase().includes(lower),
        ),
    );
}
