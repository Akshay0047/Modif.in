import Papa from "papaparse";
import * as XLSX from "xlsx";

export function parseCsv(text, options = {}) {
    const result = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        ...options,
    });
    if (result.errors.length) {
        throw new Error(result.errors[0].message);
    }
    return result.data;
}

export function parseCsvRaw(text) {
    const result = Papa.parse(text, { skipEmptyLines: true });
    if (result.errors.length) {
        throw new Error(result.errors[0].message);
    }
    return result.data;
}

export function unparseCsv(rows, options = {}) {
    return Papa.unparse(rows, options);
}

export function jsonToXml(rows, rootName = "records", rowName = "record") {
    const escape = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    const body = rows
        .map((row) => {
            const fields = Object.entries(row)
                .map(([key, value]) => `    <${key}>${escape(value)}</${key}>`)
                .join("\n");
            return `  <${rowName}>\n${fields}\n  </${rowName}>`;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n${body}\n</${rootName}>`;
}

export function rowsToMarkdownTable(rows) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const headerLine = `| ${headers.join(" | ")} |`;
    const separator = `| ${headers.map(() => "---").join(" | ")} |`;
    const body = rows
        .map((row) => `| ${headers.map((key) => String(row[key] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)
        .join("\n");
    return [headerLine, separator, body].join("\n");
}

export function matrixToMarkdownTable(matrix) {
    if (!matrix.length) return "";
    const [header, ...rows] = matrix;
    const headerLine = `| ${header.join(" | ")} |`;
    const separator = `| ${header.map(() => "---").join(" | ")} |`;
    const body = rows
        .map((row) => `| ${row.map((cell) => String(cell ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)
        .join("\n");
    return [headerLine, separator, body].join("\n");
}

export async function parseExcelFile(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export async function parseExcelMatrix(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
}

export function rowsToExcelBuffer(rows, sheetName = "Sheet1") {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

export function matrixToExcelBuffer(matrix, sheetName = "Sheet1") {
    const worksheet = XLSX.utils.aoa_to_sheet(matrix);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}
