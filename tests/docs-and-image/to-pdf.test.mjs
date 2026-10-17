import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { imageEmbedPlan, legacyDocMessage } from "../../src/modules/docs/to-pdf/imageEmbedPlan.js";
import { planTextLayout, splitTextRuns, writeTextPdf } from "../../src/modules/docs/_shared/unicodeTextPdf.js";

function pdfText(bytes) {
    const latin = Buffer.from(bytes).toString("latin1");
    const parts = [latin];
    const streams = /stream\r?\n([\s\S]*?)endstream/g;
    let match = streams.exec(latin);
    while (match) {
        const raw = Buffer.from(match[1], "latin1");
        const trimmed = raw[raw.length - 1] === 10 ? raw.subarray(0, raw.length - 1) : raw;
        try {
            parts.push(zlib.inflateSync(trimmed).toString("latin1"));
        } catch {
            // Not every stream is compressed.
        }
        match = streams.exec(latin);
    }
    const decoded = parts.join("\n");
    const hex = [...decoded.matchAll(/<([0-9A-Fa-f]+)>/g)]
        .map((item) => Buffer.from(item[1], "hex").toString("latin1"))
        .join("\n");
    return `${decoded}\n${hex}`;
}

test("text layout keeps newlines, blank lines, and tabs", () => {
    const planned = planTextLayout("Title\nHello world\nLine two\n\nNext\ta", (line) => line.length, 80);
    assert.deepEqual(
        planned.map((item) => (item.kind === "blank" ? "" : item.text)),
        ["Title", "Hello world", "Line two", "", "Next    a"],
    );
});

test("long lines wrap without joining separate lines", () => {
    const planned = planTextLayout("Hello world again", (line) => line.length, 10);
    assert.deepEqual(planned.map((item) => item.text), ["Hello", "world", "again"]);
});

test("latin lines stay extractable and unicode runs are separate", async () => {
    const bytes = await writeTextPdf("Title\nHello world\nLine two\n\nNext paragraph");
    const visible = pdfText(bytes);
    assert.equal(visible.includes("Title"), true);
    assert.equal(visible.includes("Hello world"), true);
    assert.equal(visible.includes("Line two"), true);
    assert.equal(visible.includes("Next paragraph"), true);
    assert.equal(visible.includes("Title Hello"), false);

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const runs = splitTextRuns("Hello 世界 🌍", (character) => {
        try {
            font.encodeText(character);
            return true;
        } catch {
            return false;
        }
    });
    assert.equal(runs[0].latin, true);
    assert.equal(runs[0].text, "Hello ");
    assert.equal(runs.some((run) => run.text.includes("世")), true);
});

test("webp images are decoded and legacy doc files are rejected", async () => {
    assert.equal(imageEmbedPlan({ name: "photo.webp", type: "image/webp" }), "decode");
    assert.equal(imageEmbedPlan({ name: "photo.png", type: "image/png" }), "png");
    assert.equal(imageEmbedPlan({ name: "photo.jpg", type: "image/jpeg" }), "jpeg");
    assert.match(legacyDocMessage("simple.doc"), /Save the document as \.docx/);
    assert.equal(legacyDocMessage("notes.docx"), "");
});
