import assert from "node:assert/strict";
import { readdir, writeFile } from "node:fs/promises";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const { default: AxeBuilder } = await import(process.env.AXE_PLAYWRIGHT_MODULE || "@axe-core/playwright");
const directory = new URL("../../src/modules/text/", import.meta.url);
const routes = process.env.TEST_ROUTES?.split(",") || (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);
const baseURL = process.env.TEST_BASE_URL || "http://localhost:4176";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
const failures = [];

// The finding concerns control names and label associations. Other site-wide audit
// rules belong to their own findings; none of the naming rules are suppressed.
const rules = ["label", "select-name", "button-name", "input-button-name", "aria-input-field-name", "aria-toggle-field-name", "aria-command-name", "aria-valid-attr-value", "label-content-name-mismatch"];

async function inspect(page, slug, state) {
    const scope = page.locator(".text-tool-page");
    const fields = scope.locator("input:not([type=hidden]), textarea, select");
    const signature = [];
    let activations = 0;
    for (let index = 0; index < await fields.count(); index += 1) {
        const field = fields.nth(index);
        if (!await field.isVisible()) continue;
        const info = await field.evaluate((element) => ({
            id: element.id,
            readonly: element.readOnly,
            disabled: element.disabled,
            type: element.type,
            value: element.value,
            label: [...(element.labels || [])].map((label) => label.textContent.trim()).join(" "),
            name: element.getAttribute("aria-label") || (element.getAttribute("aria-labelledby") || "").split(/\s+/).map((id) => document.getElementById(id)?.textContent.trim() || "").join(" "),
            references: (element.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).map((id) => ({ id, exists: Boolean(document.getElementById(id)) })),
        }));
        const context = `${slug}/${state} ${info.id || index}`;
        assert.ok(info.label || (info.readonly && info.name), `${context}: missing real visible label or output name`);
        assert.ok(info.references.every(({ exists }) => exists), `${context}: dangling field help/error reference`);
        signature.push(`${info.id}:${info.label}:${info.name}:${info.readonly}`);
        if (info.readonly || info.disabled) continue;
        const handle = await field.evaluateHandle((element) => element.labels[0]);
        const label = handle.asElement();
        assert.ok(label && await label.isVisible(), `${context}: label is not visible`);
        const checked = info.type === "checkbox" ? await field.isChecked() : null;
        await field.evaluate((element) => element.blur());
        await label.click();
        assert.equal(await field.evaluate((element) => document.activeElement === element), true, `${context}: label click did not focus its control`);
        if (checked !== null) await field.setChecked(checked);
        const value = await field.inputValue();
        await field.press("Tab");
        assert.equal(await field.evaluate((element) => document.activeElement === element), false, `${context}: Tab trapped focus`);
        assert.equal(await field.inputValue(), value, `${context}: Tab changed input data`);
        activations += 1;
        await handle.dispose();
    }
    return { signature: signature.join("|"), activations, fieldCount: signature.length };
}

try {
    for (const width of [1440, 390]) {
        let nextRoute = 0;
        async function worker() {
            const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
            const page = await context.newPage();
            page.setDefaultTimeout(15000);
            while (nextRoute < routes.length) {
                const slug = routes[nextRoute++];
                const pageErrors = [];
                const onError = (error) => pageErrors.push(error.message);
                page.on("pageerror", onError);
                try {
                    await page.goto(`${baseURL}/text/${slug}`);
                    await page.locator(".text-tool-page").waitFor();
                    const signatures = new Set();
                    const states = ["default"];
                    const controls = await page.locator(".text-tool-controls button").allTextContents();
                    let checks = 0;
                    let activations = 0;
                    let axeScans = 0;
                    for (const state of ["default", ...new Set(controls.map((text) => text.trim()))]) {
                        if (state !== "default") {
                            const button = page.locator(".text-tool-controls button").filter({ hasText: new RegExp(`^${state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }).first();
                            if (!await button.isVisible() || !await button.isEnabled()) continue;
                            await button.click();
                            states.push(state);
                        }
                        const info = await inspect(page, slug, state);
                        activations += info.activations;
                        checks += info.fieldCount;
                        if (!signatures.has(info.signature)) {
                            signatures.add(info.signature);
                            const audit = await new AxeBuilder({ page }).include(".text-tool-page").withRules(rules).analyze();
                            assert.deepEqual(audit.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(({ target }) => target) })), [], `${slug}/${state}: axe naming violations`);
                            axeScans += 1;
                        }
                    }
                    assert.deepEqual(pageErrors, [], `${slug}: runtime errors`);
                    results.push({ slug, width, states, checks, activations, axeScans });
                    if (results.length % 10 === 0) console.log(`${results.length} route/viewports passed`);
                } catch (error) {
                    failures.push({ slug, width, message: error.message, pageErrors });
                    console.error(`${slug} ${width}: ${error.message}`);
                } finally {
                    page.off("pageerror", onError);
                }
            }
            await context.close();
        }
        await Promise.all([worker(), worker(), worker()]);
    }
} finally {
    await browser.close();
    if (process.env.LABEL_REPORT) await writeFile(process.env.LABEL_REPORT, JSON.stringify({ results, failures }, null, 2));
}
assert.deepEqual(failures, []);
console.log(JSON.stringify({ routes: routes.length, viewports: 2, routeViewports: results.length, states: results.reduce((sum, entry) => sum + entry.states.length, 0), labelActivations: results.reduce((sum, entry) => sum + entry.activations, 0), axeScans: results.reduce((sum, entry) => sum + entry.axeScans, 0) }));
