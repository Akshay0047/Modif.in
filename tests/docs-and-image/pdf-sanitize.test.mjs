import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";
import { PDFDocument, PDFName, PDFString, decodePDFRawStream } from "pdf-lib";
import {
    bakeAndRemoveAnnotations,
    combinePageRotation,
    flattenDocument,
    formatPdfKeywords,
    prepareArchivalDocument,
    stripDocumentMetadata,
} from "../../src/modules/docs/_shared/pdfDocumentOps.js";

function addStamp(pdf, { matrix, states = false } = {}) {
    const page = pdf.addPage([300, 300]);
    const appearance = pdf.context.register(pdf.context.flateStream("1 0 0 rg 10 20 50 25 re f", {
        Type: "XObject",
        Subtype: "Form",
        BBox: [10, 20, 60, 45],
        ...(matrix ? { Matrix: matrix } : {}),
        Resources: {},
    }));
    const annot = pdf.context.obj({
        Type: "Annot",
        Subtype: "Stamp",
        Rect: [100, 120, 200, 220],
        AP: { N: states ? { Approved: appearance } : appearance },
        ...(states ? { AS: "Approved" } : {}),
    });
    page.node.set(PDFName.of("Annots"), pdf.context.obj([pdf.context.register(annot)]));
    return { page, annot };
}

async function savedPageContents(pdf) {
    const saved = await PDFDocument.load(await pdf.save());
    const page = saved.getPage(0);
    const streams = page.node.Contents();
    const text = Array.from({ length: streams.size() }, (_, i) =>
        new TextDecoder().decode(decodePDFRawStream(streams.lookup(i)).decode())).join("\n");
    return { saved, page, text };
}

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

test("flattening preserves stamp graphics and positions its original appearance", async () => {
    const pdf = await PDFDocument.create();
    addStamp(pdf);
    await flattenDocument(pdf);
    const { page, text } = await savedPageContents(pdf);
    assert.equal(page.node.Annots(), undefined);
    assert.match(text, /2 0 0 4 80 40 cm/);
    assert.match(text, /\/FlatAnnotation-\d+ Do/);
    const xObjects = page.node.Resources().lookup(PDFName.of("XObject"));
    const appearance = xObjects.lookup(xObjects.keys()[0]);
    assert.equal(new TextDecoder().decode(decodePDFRawStream(appearance).decode()), "1 0 0 rg 10 20 50 25 re f");
});

test("flattening selects annotation state and accounts for its appearance matrix", async () => {
    const pdf = await PDFDocument.create();
    addStamp(pdf, { matrix: [0, 1, -1, 0, 0, 0], states: true });
    await prepareArchivalDocument(pdf);
    const { text } = await savedPageContents(pdf);
    assert.match(text, /4 0 0 2 280 100 cm/);
    assert.match(text, /\/FlatAnnotation-\d+ Do/);
});

test("unsupported visible annotations abort without deleting annotation data", async () => {
    const pdf = await PDFDocument.create();
    const { page } = addStamp(pdf);
    const annotations = page.node.Annots();
    annotations.push(pdf.context.register(pdf.context.obj({
        Type: "Annot", Subtype: "Ink", Rect: [0, 0, 50, 50], InkList: [[0, 0, 50, 50]],
    })));
    assert.throws(() => bakeAndRemoveAnnotations(pdf), /no usable appearance/);
    assert.equal(page.node.Annots().size(), 2);
    assert.equal(page.node.Contents(), undefined);
});

test("form appearance failures propagate instead of deleting the widgets", async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    const form = pdf.getForm();
    const field = form.createTextField("text");
    field.addToPage(page);
    field.setText("\u4fdd\u5b58");
    await assert.rejects(flattenDocument(pdf), /WinAnsi cannot encode/);
    assert.equal(page.node.Annots().size(), 1);
});
