import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { formFieldKind } from "../../src/modules/docs/fillable-form-tools/fieldKind.js";
import { signaturePoint } from "../../src/modules/docs/e-signature/signaturePoint.js";
import { pageScale } from "../../src/modules/docs/pdf-editor/pageScale.js";

test("form fields keep their kind when class names are minified", async () => {
    const pdf = await PDFDocument.create();
    const form = pdf.getForm();
    const text = form.createTextField("full_name");
    text.setText("Initial QA");
    const box = form.createCheckBox("approved");
    box.addToPage(pdf.addPage(), { x: 50, y: 700, width: 20, height: 20 });
    box.check();

    Object.defineProperty(text.constructor, "name", { value: "n" });
    Object.defineProperty(box.constructor, "name", { value: "n" });

    assert.equal(text.constructor.name.includes("Text"), false);
    assert.equal(formFieldKind(text), "text");
    assert.equal(formFieldKind(box), "checkbox");
    assert.equal(text.getText(), "Initial QA");
    assert.equal(box.isChecked(), true);
});

test("signature strokes follow the displayed canvas size", () => {
    const canvas = {
        width: 400,
        height: 120,
        getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 60 }),
    };
    const point = signaturePoint({ clientX: 110, clientY: 50 }, canvas);
    assert.deepEqual(point, { x: 200, y: 60 });
});

test("annotation scale uses rendered page pixels", () => {
    assert.equal(pageScale({ width: 612, height: 792 }, null), null);
    const scale = pageScale({ width: 612, height: 792 }, { width: 918, height: 1188 });
    assert.equal(Math.round(18 * scale.y * 100) / 100, 12);
});
