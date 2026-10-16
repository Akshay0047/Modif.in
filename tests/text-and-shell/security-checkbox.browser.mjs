// Run against `npm run build` + `npm run preview` with Playwright and
// @axe-core/playwright available. Module URLs can point to external QA tooling
// via MODIF_PLAYWRIGHT_MODULE / MODIF_AXE_MODULE; MODIF_QA_URL selects the preview.
import assert from "node:assert/strict";

const { chromium } = await import(process.env.MODIF_PLAYWRIGHT_MODULE || "playwright");
const { default: AxeBuilder } = await import(process.env.MODIF_AXE_MODULE || "@axe-core/playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--disable-gpu"] });
const baseUrl = process.env.MODIF_QA_URL || "http://127.0.0.1:4173";

try {
    for (const width of [1440, 390, 320]) {
        const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 700, isMobile: width < 700 });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        for (const route of ["test-data-generator", "password-generator"]) {
            await page.goto(`${baseUrl}/text/${route}`);
            const modes = route === "password-generator" ? ["Password", "Passphrase"] : [null];
            for (const mode of modes) {
                if (mode) await page.getByRole("button", { name: mode, exact: true }).click();
                const labels = page.locator(".text-tool-checkbox");
                await labels.first().waitFor();
                assert.ok(await labels.count() > 0);
                for (let index = 0; index < await labels.count(); index += 1) {
                    const label = labels.nth(index);
                    const input = label.locator("input[type=checkbox]");
                    const box = await input.boundingBox();
                    const labelBox = await label.boundingBox();
                    assert.ok(box.width >= 24 && box.height >= 24, "native target meets WCAG 2.5.8 minimum");
                    assert.ok(labelBox.height >= 44 && labelBox.width >= 44, "label has a practical touch target");
                    const before = await input.isChecked();
                    // Activate padding away from the native checkbox or text.
                    if (width < 700) await label.tap({ position: { x: labelBox.width - 4, y: labelBox.height / 2 } });
                    else await label.click({ position: { x: labelBox.width - 4, y: labelBox.height / 2 } });
                    assert.equal(await input.isChecked(), !before, "entire label activates the checkbox");
                    await input.focus();
                    await input.press(" ");
                    assert.equal(await input.isChecked(), before, `native keyboard activation works: ${route}/${mode}/${width}/${index}`);
                }
                const boxes = await labels.evaluateAll((nodes) => nodes.map((node) => {
                    const rect = node.getBoundingClientRect();
                    return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
                }));
                for (let a = 0; a < boxes.length; a += 1) for (let b = a + 1; b < boxes.length; b += 1) {
                    const first = boxes[a], second = boxes[b];
                    assert.ok(first.right <= second.x || second.right <= first.x || first.bottom <= second.y || second.bottom <= first.y, "clickable labels never overlap");
                }
                const audit = await new AxeBuilder({ page }).withRules(["target-size"]).analyze();
                assert.deepEqual(audit.violations, [], `${route}/${mode || "types"} at ${width}px has no axe target-size violations`);
                assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal overflow");
            }
        }
        assert.deepEqual(errors, []);
        await context.close();
    }
    console.log("PASS checkbox geometry, label padding activation, keyboard Space, touch taps and axe target-size at 1440/390/320px");
} finally {
    await browser.close();
}
