import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCode, formatJavaScript } from '../../src/modules/text/_shared/developerUtils.js';

test('JavaScript formatting preserves execution across literals, comments and ASI', async () => {
    const fixtures = ['// comment\nreturn 42;', 'const r=/[{}]/; return r.test("{");', 'return\n42;', 'const x="a // b /*literal*/"; return x;', 'const x=3;return `a  b ${x + 1}`;', 'let a=1,b=2; a\n++b; return [a,b];', 'return /https?:\\/\\//.test("https://a");'];
    for (const input of fixtures) {
        const formatted = await formatJavaScript(input);
        assert.deepEqual(new Function(formatted)(), new Function(input)(), input);
        assert.equal(await formatJavaScript(formatted), formatted);
    }
});
test('formatter parses TypeScript, JSX and TSX and rejects broken syntax', async () => {
    assert.match(await formatCode('const n:number=2;', 'typescript'), /n: number = 2/);
    assert.match(await formatCode('const view=<div>{1+2}</div>;', 'jsx'), /<div>\{1 \+ 2\}<\/div>/);
    assert.match(await formatCode('const view:JSX.Element=<div/>;', 'tsx'), /view: JSX.Element/);
    await assert.rejects(()=>formatJavaScript('const r = /[{}]/; const = ;'));
});
