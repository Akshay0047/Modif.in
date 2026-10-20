import assert from "node:assert/strict";
import test from "node:test";
import { csvToExcel, csvToXml, parseExcel, toMarkdownTable } from "../../src/modules/docs/_shared/csvUtils.js";
import { formatExtractedTable, groupIntoTable, rowsFromPages } from "../../src/modules/docs/table-extractor/tableRows.js";

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

test("empty PDF pages do not renumber later extracted rows", () => {
    const rows = rowsFromPages([
        [],
        [{ text: "Page two", x: 10, y: 100 }],
        [],
        [{ text: "Page four", x: 10, y: 100 }],
    ]);
    assert.deepEqual(rows.map((row) => row.Page), ["2", "4"]);
    assert.deepEqual(rows.map((row) => row["Column 1"]), ["Page two", "Page four"]);
    assert.deepEqual(rowsFromPages([[], []]), []);
});

test("a column at the left PDF boundary is not duplicated", () => {
    const table = groupIntoTable([
        { text: "Name", x: 0, y: 100 },
        { text: "Amount", x: 80, y: 100 },
        { text: "Alice", x: 0, y: 80 },
        { text: "12.50", x: 80, y: 80 },
    ]);
    assert.deepEqual(table, [["Name", "Amount"], ["Alice", "12.50"]]);
});

test("empty columns on a continuation page keep their original position", () => {
    const rows = rowsFromPages([
        [{ text: "Name", x: 10, y: 100 }, { text: "Amount", x: 80, y: 100 }],
        [{ text: "12.50", x: 80, y: 100 }],
    ]);
    assert.deepEqual(rows[1], { Page: "2", "Column 1": "", "Column 2": "12.50" });
});

test("CSV to XML rejects inconsistent field counts instead of losing data", () => {
    assert.throws(() => csvToXml("First,Last\nAlice,Brown,Unexpected\n"), /3 fields; expected 2/);
    assert.throws(() => csvToXml("First,Middle,Last\nAlice,Brown\n"), /2 fields; expected 3/);
    const valid = csvToXml("First,Last\nAlice,\n");
    assert.match(valid, /<field name="Last"><\/field>/);
});

test("lazy Excel conversion preserves quoted cells, Unicode and blank values", async () => {
    const source = 'Name,Notes,Blank\n"José, Jr.","line 1\nline 2",\n名前,"quoted ""value""",\n';
    const bytes = await csvToExcel(source);
    assert.ok(bytes instanceof ArrayBuffer || ArrayBuffer.isView(bytes));
    assert.deepEqual(await parseExcel(bytes), [
        { Name: "José, Jr.", Notes: "line 1\nline 2", Blank: "" },
        { Name: "名前", Notes: 'quoted "value"', Blank: "" },
    ]);
    await assert.rejects(csvToExcel("Name,Age\nAlice,30,Unexpected\n"), /fields/i);
});
