import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');

// Run against npm run build + npm run preview; Playwright may be provided by a
// temporary external installation with PLAYWRIGHT_MODULE as its file: URL.
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        const page = await browser.newPage({ viewport });
        await page.goto(`${process.env.MODIF_BASE_URL ?? 'http://127.0.0.1:4175'}/text/xml-tools`);
        await page.getByRole('button', { name: 'Minify', exact: true }).click();
        const fixtures = ['<root xml:space="preserve">a  b</root>', '<root>Hello <b>wide  world</b> !</root>', '<root xml:space="preserve"> <a> x </a> <b xml:space="default"> y </b> </root>', '<root>\n  <a/>\n  <b/>\n</root>', '<root><![CDATA[a  b < c]]><!-- keep comment --></root>', '<root><parsererror>ordinary data</parsererror></root>'];
        for (const input of fixtures) {
            await page.locator('textarea:not([readonly])').fill(input);
            const output = await page.getByRole('textbox', { name: 'XML tools output' }).inputValue();
            const content = await page.evaluate(({ input, output }) => {
                const parser = new DOMParser();
                const snapshot = source => {
                    const root = parser.parseFromString(source, 'application/xml').documentElement;
                    const walk = node => [node.nodeType, node.nodeName, node.nodeValue, [...node.childNodes].map(walk)];
                    return walk(root);
                };
                return { before: snapshot(input), after: snapshot(output) };
            }, { input, output });
            assert.deepEqual(content.after, content.before, input);
        }
        await page.locator('textarea:not([readonly])').fill('<root>');
        await page.waitForFunction(() => !document.querySelector('textarea[readonly]')); 
        assert.equal(await page.getByRole('button', { name: /Copy/ }).isDisabled(), true);
        await page.close();
    }
} finally { await browser.close(); }
console.log('XML production browser: text, mixed content, inherited xml:space, CDATA, comments and malformed rejection passed.');
