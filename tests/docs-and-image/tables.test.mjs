import assert from "node:assert/strict";
import test from "node:test";
import { csvToXml, toMarkdownTable } from "../../src/modules/docs/_shared/csvUtils.js";
import { formatExtractedTable, rowsFromPages } from "../../src/modules/docs/table-extractor/tableRows.js";

test("markdown cells keep multiline text inside one row", () => {
    const markdown = toMarkdownTable("Name,Notes\nBob,\"line1\r\nline2 | extra\"");
    const lines = markdown.split("\n");
    assert.equal(lines.length, 3);
    assert.match(lines[2], /line1<br>line2 \\| extra/);
});

test("csv headers become xml name attributes", () => {
    const xml = csvToXml("First name,123value,Notes & more,名前,Name,Name\nA,B,C & D,E,F,G\n");
    assert.equal(xml.includes("<First name>"), false);
    assert.equal(xml.includes("<123value>"), false);
    assert.match(xml, /<field name="First name">A<\/field>/);
    assert.match(xml, /<field name="123value">B<\/field>/);
    assert.match(xml, /<field name="Notes &amp; more">C &amp; D<\/field>/);
    assert.match(xml, /<field name="名前">E<\/field>/);
    assert.equal(xml.match(/<field name="Name">/g).length, 2);

    const empty = csvToXml(",Value\nx,y\n");
    assert.match(empty, /<field name="">x<\/field>/);
});

test("table rows stay on their own page and follow the selected format", () => {
    const row = (text, x) => ({ text, x, y: 100 });
    const pages = [0, 1, 2].map(() => [row("Alice", 10), row("12.50", 80)]);
    const rows = rowsFromPages(pages);
    assert.deepEqual(rows.map((item) => item["Column 1"]), ["Alice", "Alice", "Alice"]);
    assert.deepEqual(rows.map((item) => item.Page), ["1", "2", "3"]);
    assert.equal(rows[0]["Column 1"].includes("Alice Alice"), false);

    const csv = formatExtractedTable(rows, "csv");
    const json = formatExtractedTable(rows, "json");
    assert.equal(csv.startsWith("Page,Column 1,Column 2"), true);
    assert.equal(JSON.parse(json)[0]["Column 1"], "Alice");
});
