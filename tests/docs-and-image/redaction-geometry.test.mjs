import assert from "node:assert/strict";
import test from "node:test";
import { canvasRectToPdfRect, scaleCanvasRect } from "../../src/modules/docs/_shared/redactionGeometry.js";

test("preview pixels convert to PDF points, including a 1.5x canvas", () => {
    const pdf = canvasRectToPdfRect(
        { x: 82.5, y: 177, w: 150, h: 45 },
        { width: 918, height: 1188 },
        { width: 612, height: 792 },
    );
    assert.equal(pdf.x, 55);
    assert.equal(pdf.y, 644);
    assert.equal(pdf.width, 100);
    assert.equal(pdf.height, 30);
});

test("boxes keep their relative place when the export canvas is a different size", () => {
    const scaled = scaleCanvasRect(
        { x: 10, y: 20, w: 30, h: 40 },
        { width: 100, height: 200 },
        { width: 300, height: 400 },
    );
    assert.deepEqual(scaled, { x: 30, y: 40, w: 90, h: 80 });
});
