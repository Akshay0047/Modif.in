import assert from 'node:assert/strict';
import test from 'node:test';
import { minifyCode } from '../../src/modules/text/_shared/developerUtils.js';

test('CSS minification retains string contents, URLs and custom property token streams', async () => {
    const input = '.x::before { content: "a  b /*literal*/"; background: url("https://host/a//b"); --label: "a  b"; width: calc(100% - 2px); }';
    const output = await minifyCode(input, 'css');
    assert.ok(output.includes('"a  b /*literal*/"'));
    assert.ok(output.includes('https://host/a//b'));
    assert.ok(output.includes('--label: "a  b"'));
    assert.ok(output.includes('calc(100% - 2px)'));
    assert.equal(await minifyCode(output, 'css'), output);
});
test('CSS comments are distinct from strings and selector boundaries', async () => {
    const output = await minifyCode('.a /* comment */ .b { content: "/*literal*/"; }', 'css');
    assert.equal(output, '.a .b{content:"/*literal*/"}');
    await assert.rejects(()=>minifyCode('.x { color: red ! !; }', 'css'));
});
