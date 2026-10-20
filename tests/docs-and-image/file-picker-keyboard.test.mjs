import assert from "node:assert/strict";
import test from "node:test";
import { handleFilePickerKeyDown } from "../../src/modules/image/_shared/imageToolUtils.js";

test("file picker panels activate on Enter and Space without scrolling", () => {
    for (const key of ["Enter", " "]) {
        let clicks = 0;
        let prevented = 0;
        const panel = { click: () => { clicks += 1; }, getAttribute: () => null };
        handleFilePickerKeyDown({ key, target: panel, currentTarget: panel, preventDefault: () => { prevented += 1; } });
        assert.equal(clicks, 1);
        assert.equal(prevented, 1);
    }
});

test("file picker keyboard activation ignores disabled panels, repeats and descendant controls", () => {
    let clicks = 0;
    const panel = { click: () => { clicks += 1; }, getAttribute: () => "true" };
    const event = { key: "Enter", target: panel, currentTarget: panel, preventDefault() {} };
    handleFilePickerKeyDown(event);
    handleFilePickerKeyDown({ ...event, repeat: true });
    handleFilePickerKeyDown({ ...event, target: {} });
    handleFilePickerKeyDown({ ...event, key: "ArrowRight" });
    assert.equal(clicks, 0);
});
