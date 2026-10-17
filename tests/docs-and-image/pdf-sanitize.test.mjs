import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import {
    combinePageRotation,
    formatPdfKeywords,
    prepareArchivalDocument,
    stripDocumentMetadata,
} from "../../src/modules/docs/_shared/pdfDocumentOps.js";

function pdfText(bytes) {
    const latin = Buffer.from(bytes).toString("latin1");
    const parts = [latin];
    const streams = /stream\r?\n([\s\S]*?)endstream/g;
    let match = streams.exec(latin);
    while (match) {
        try {
            parts.push(zlib.inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"));
        } catch {
            // Not every stream is flate-compressed.
        }
        match = streams.exec(latin);
    }
    const decoded = parts.join("\n");
    const hex = [...decoded.matchAll(/<([0-9A-Fa-f]+)>/g)]
        .map((item) => Buffer.from(item[1], "hex").toString("latin1"))
        .join("");
    return `${decoded}\n${hex}`;
}

test("keywords accept the string returned by pdf-lib and empty values", () => {
    assert.equal(formatPdfKeywords("report, draft"), "report, draft");
    assert.equal(formatPdfKeywords(""), "(empty)");
    assert.equal(formatPdfKeywords(undefined), "(empty)");
    assert.equal(formatPdfKeywords(["alpha", "beta"]), "alpha, beta");
});

test("requested rotation is added to the page rotation", () => {
    assert.equal(combinePageRotation(90, 90), 180);
    assert.equal(combinePageRotation(270, 90), 0);
    assert.equal(combinePageRotation(0, 0), 0);
    assert.equal(combinePageRotation(180, 270), 90);
});

test("metadata stripping removes catalog XMP author text", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const marker = "PRIVATE-XMP-AUTHOR-12345";
    const stream = pdf.context.stream(`<x:xmpmeta><dc:creator>${marker}</dc:creator></x:xmpmeta>`, {
        Type: "Metadata",
        Subtype: "XML",
    });
    pdf.catalog.set(PDFName.of("Metadata"), pdf.context.register(stream));
    pdf.setAuthor(marker);
    stripDocumentMetadata(pdf);
    const bytes = await pdf.save();
    const saved = await PDFDocument.load(bytes);
    assert.equal(saved.catalog.get(PDFName.of("Metadata")), undefined);
    assert.equal(new TextDecoder().decode(bytes).includes(marker), false);
});

test("archival conversion drops document JavaScript after preserving form text", async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    const form = pdf.getForm();
    const field = form.createTextField("full_name");
    field.setText("Initial QA");
    field.addToPage(page, { x: 50, y: 700, width: 200, height: 24 });
    const action = pdf.context.obj({
        S: "JavaScript",
        JS: PDFString.of("QA-SCRIPT-MARKER-12345"),
    });
    pdf.catalog.set(PDFName.of("Names"), pdf.context.obj({ JavaScript: action }));
    pdf.catalog.set(PDFName.of("OpenAction"), action);

    await prepareArchivalDocument(pdf);
    const bytes = await pdf.save();
    const saved = await PDFDocument.load(bytes);
    const names = saved.context.lookup(saved.catalog.get(PDFName.of("Names")));
    assert.equal(saved.catalog.get(PDFName.of("OpenAction")), undefined);
    if (names?.get) assert.equal(names.get(PDFName.of("JavaScript")), undefined);
    assert.equal(saved.getForm().getFields().length, 0);
    const visible = pdfText(bytes);
    assert.equal(visible.includes("QA-SCRIPT-MARKER-12345"), false);
    assert.equal(visible.includes("Initial QA"), true);
});
