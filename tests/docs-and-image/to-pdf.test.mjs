import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";
import { PDFDocument, StandardFonts, decodePDFRawStream } from "pdf-lib";
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

test("wrapping keeps expanded tabs and repeated spaces within a line", () => {
    const planned = planTextLayout("a\tb c d", (line) => line.length, 8);
    assert.deepEqual(planned.map((item) => item.text), ["a    b c", "d"]);
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

test("long Unicode words wrap between complete graphemes", () => {
    const family = "👨‍👩‍👧‍👦";
    const text = `abc${family}def${family}ghi`;
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const measure = (line) => [...segmenter.segment(line)].length;
    const planned = planTextLayout(text, measure, 4);
    assert.equal(planned.map((item) => item.text).join(""), text);
    assert.deepEqual(planned.map((item) => item.text), [`abc${family}`, `def${family}`, "ghi"]);
});

test("Unicode lines keep shaping context and fit the PDF text area", async () => {
    const previousDocument = globalThis.document;
    const painted = [];
    const transparentPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    globalThis.document = {
        createElement: () => ({
            getContext: () => ({
                font: "",
                measureText(text) {
                    const size = Number.parseFloat(this.font);
                    const width = [...text].reduce((sum, character) => sum + (character === "界" ? size : size / 2), 0);
                    return { width, actualBoundingBoxAscent: size * 0.8, actualBoundingBoxDescent: size * 0.2 };
                },
                fillText: (text) => painted.push(text),
            }),
            toDataURL: () => transparentPng,
        }),
    };

    try {
        const mixed = "a界".repeat(26);
        const bytes = await writeTextPdf(`cafe\u0301\nمرحبا بالعالم\n${mixed}`);
        assert.deepEqual(painted.slice(0, 2), ["cafe\u0301", "مرحبا بالعالم"]);
        assert.equal(painted.slice(2).join(""), mixed);

        const pdf = await PDFDocument.load(bytes);
        let imageCount = 0;
        for (const page of pdf.getPages()) {
            const contents = page.node.Contents();
            for (let index = 0; index < contents.size(); index += 1) {
                const stream = pdf.context.lookup(contents.get(index));
                const operators = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
                for (const match of operators.matchAll(/q\s+1 0 0 1 50 [\d.]+ cm\s+1 0 0 1 0 0 cm\s+([\d.]+) 0 0 ([\d.]+) 0 0 cm/g)) {
                    imageCount += 1;
                    assert.ok(Number(match[1]) <= 495.28, `Image width ${match[1]} exceeds the text area`);
                }
            }
        }
        assert.equal(imageCount, painted.length);
    } finally {
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
    }
});
