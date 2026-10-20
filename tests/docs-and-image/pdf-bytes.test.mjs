import assert from "node:assert/strict";
import test from "node:test";
import { clonePdfBytes } from "../../src/modules/docs/_shared/pdfBytes.js";

test("PDF byte cloning preserves only a typed view and owns independent memory", () => {
    const padded = Uint8Array.from([99, 1, 2, 3, 88]);
    const source = padded.subarray(1, 4);
    const copy = clonePdfBytes(source);
    assert.deepEqual(copy, Uint8Array.from([1, 2, 3]));
    copy[0] = 7;
    assert.equal(source[0], 1);
    padded[2] = 9;
    assert.equal(copy[1], 2);
});

test("PDF byte cloning supports buffers and rejects missing or detached data", () => {
    const source = Uint8Array.from([1, 2]).buffer;
    const copy = clonePdfBytes(source);
    assert.deepEqual(copy, Uint8Array.from([1, 2]));
    new Uint8Array(source)[0] = 8;
    assert.equal(copy[0], 1);
    assert.throws(() => clonePdfBytes(null), /Missing PDF data/);
    const detached = new ArrayBuffer(8);
    const view = new Uint8Array(detached);
    structuredClone(detached, { transfer: [detached] });
    assert.throws(() => clonePdfBytes(detached), /Re-add the file/);
    assert.throws(() => clonePdfBytes(view), /Re-add the file/);
});
