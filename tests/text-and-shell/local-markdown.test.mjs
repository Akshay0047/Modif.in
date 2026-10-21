import assert from "node:assert/strict";
import test from "node:test";
import { isLocalImageSource, localMarkdownUrlTransform } from "../../src/components/localMarkdownUtils.js";

test("preview images never resolve pasted URLs into network requests", () => {
    for (const source of ["https://example.com/pixel?secret=private", "//example.com/pixel", "/pixel?secret=private", "pixel.png", "javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "data:image/svg+xml,<svg/>", ""]) {
        assert.equal(isLocalImageSource(source), false, source);
        assert.equal(localMarkdownUrlTransform(source, "src"), "", source);
    }
});

test("local preview images remain available without relaxing link protocols", () => {
    for (const source of ["data:image/png;base64,iVBORw0KGgo=", "blob:https://modif.in/local-image"]) {
        assert.equal(isLocalImageSource(source), true);
        assert.equal(localMarkdownUrlTransform(source, "src"), source);
    }
    assert.equal(localMarkdownUrlTransform("https://example.com/", "href"), "https://example.com/");
    assert.equal(localMarkdownUrlTransform("javascript:alert(1)", "href"), "");
});
