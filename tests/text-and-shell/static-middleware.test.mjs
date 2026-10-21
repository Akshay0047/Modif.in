import assert from "node:assert/strict";
import test from "node:test";
import { routeMetaPlugin } from "../../scripts/routeMetaPlugin.js";
import { ocrAssetsPlugin } from "../../scripts/ocrAssetsPlugin.js";

test("static preview and OCR middleware reject malformed URLs without unhandled rejections", async () => {
    for (const [plugin, hook] of [[routeMetaPlugin(), "configurePreviewServer"], [ocrAssetsPlugin(), "configureServer"]]) {
        let middleware;
        plugin[hook]({
            config: { root: process.cwd(), build: { outDir: "dist" } },
            middlewares: { use: (handler) => { middleware = handler; } },
        });
        for (const url of ["//", "///", "http://["]) {
            let ended = false;
            const response = { end: () => { ended = true; } };
            await middleware({ method: "GET", url }, response, () => assert.fail("malformed URL passed downstream"));
            assert.equal(response.statusCode, 400);
            assert.equal(ended, true);
        }
    }
});
