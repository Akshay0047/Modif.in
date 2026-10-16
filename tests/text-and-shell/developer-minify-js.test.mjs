import assert from 'node:assert/strict';
import test from 'node:test';
import { minifyCode } from '../../src/modules/text/_shared/developerUtils.js';

test('JavaScript minification preserves values and significant line breaks', async () => {
    const fixtures = ['const message = "a // b"; return message;', 'return `a  b`;', 'return\n42;', '// comment\nreturn 42;', 'const r=/[{}]/; return r.test("{");', 'const a=2;return ` /* literal */ ${a}  // `;', 'let a=1,b=2; a\n++b; return [a,b];', 'const url="https://host/a"; /* actual comment */ return url;'];
    for (const input of fixtures) {
        const minified = await minifyCode(input, 'javascript');
        assert.deepEqual(new Function(minified)(), new Function(input)(), input);
    }
});
test('invalid JavaScript cannot produce a plausible minified result', async () => {
    await assert.rejects(()=>minifyCode('const = "unfinished', 'javascript'));
});
