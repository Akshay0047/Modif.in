import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

function sourceFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = new URL(entry.name, directory);
        return entry.isDirectory()
            ? sourceFiles(new URL(`${entry.name}/`, directory))
            : /\.(?:jsx?|html)$/.test(entry.name) ? [path] : [];
    });
}

test("the application does not install analytics scripts or transmit page views", () => {
    const files = [new URL("../../index.html", import.meta.url), ...sourceFiles(new URL("../../src/", import.meta.url))];
    for (const file of files) {
        assert.doesNotMatch(readFileSync(file, "utf8"), /\b(?:gtag|dataLayer|trackGaPageView|loadAnalyticsAfterContent)\b|googletagmanager\.com/i, file.pathname);
    }
});
