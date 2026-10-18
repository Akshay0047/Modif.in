import assert from "node:assert/strict";
import test from "node:test";
import { pageGeometry } from "../../src/modules/docs/pdf-editor/pageScale.js";

function apply([a, b, c, d, e, f], [x, y]) {
    return [a * x + c * y + e, b * x + d * y + f];
}

function near(actual, expected) {
    actual.forEach((value, index) => assert(Math.abs(value - expected[index]) < 1e-8,
        `${JSON.stringify(actual)} differs from ${JSON.stringify(expected)}`));
}

// PDF.js viewport transforms for CropBox [50, 70, 250, 370] at 1.5x.
const croppedPages = [
    { rotation: 0, transform: [1.5, 0, 0, -1.5, -75, 555], width: 300, height: 450, pdfPoint: [70, 330] },
    { rotation: 90, transform: [0, 1.5, 1.5, 0, -105, -75], width: 450, height: 300, pdfPoint: [90, 90] },
    { rotation: 180, transform: [-1.5, 0, 0, 1.5, 375, -105], width: 300, height: 450, pdfPoint: [230, 110] },
    { rotation: 270, transform: [0, -1.5, -1.5, 0, 555, 375], width: 450, height: 300, pdfPoint: [210, 350] },
];

for (const fixture of croppedPages) {
    test(`editor placement respects CropBox and ${fixture.rotation}-degree page rotation`, () => {
        const geometry = pageGeometry(fixture, fixture);
        const visiblePoint = [30, geometry.height - 60];
        near(apply(geometry.transform, visiblePoint), fixture.pdfPoint);
        near(apply(fixture.transform, fixture.pdfPoint), [30, 60]);

        // Text/image axes stay rightward and upward in the displayed page.
        near(apply(fixture.transform, apply(geometry.transform, [31, visiblePoint[1]])), [31, 60]);
        near(apply(fixture.transform, apply(geometry.transform, [30, visiblePoint[1] + 1])), [30, 59]);
    });
}

test("mixed page sizes and rounded canvas edges use each page's own viewport", () => {
    const pages = [
        { transform: [1.5, 0, 0, -1.5, 0, 1188], width: 918, height: 1188 },
        { transform: [0, 1.5, 1.5, 0, -30, -15], width: 240, height: 150 },
        { transform: [1.5, 0, 0, -1.5, 0, 150.75], width: 76, height: 151 },
        { transform: [3, 0, 0, -3, 0, 900], width: 600, height: 900 }, // UserUnit = 2
    ];
    for (const viewport of pages) {
        const geometry = pageGeometry(viewport, viewport);
        for (const [x, y] of [[0, 0], [17, 23], [viewport.width - 1, viewport.height - 1]]) {
            const pdfPoint = apply(geometry.transform, [x, geometry.height - y]);
            near(apply(viewport.transform, pdfPoint), [x, y]);
        }
    }
});

test("missing, singular and non-finite preview geometry cannot be exported", () => {
    const size = { width: 300, height: 450 };
    assert.equal(pageGeometry(null, size), null);
    assert.equal(pageGeometry({ transform: [1, 0, 0, 0, 0, 0] }, size), null);
    assert.equal(pageGeometry({ transform: [1, 0, 0, -1, NaN, 0] }, size), null);
    assert.equal(pageGeometry(croppedPages[0], { width: 0, height: 450 }), null);
});
