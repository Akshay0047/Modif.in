import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonToYaml, yamlToJson } from '../../src/modules/text/_shared/developerUtils.js';

test('YAML sequences and literal/folded scalars retain their values', async () => {
    assert.deepEqual(JSON.parse(await yamlToJson('items:\n  - one\n  - two')), { items: ['one', 'two'] });
    assert.deepEqual(JSON.parse(await yamlToJson('message: |\n  hello\n  world')), { message: 'hello\nworld\n' });
    assert.deepEqual(JSON.parse(await yamlToJson('message: >-\n  hello\n  world')), { message: 'hello world' });
});

test('JSON and YAML round-trip nested collections, dangerous keys and quoted values', async () => {
    const fixtures = [null, false, 2.5, 'yes: # no', [], {}, [1, { items: [null, true, 'hello\nworld\n'] }], JSON.parse('{"__proto__":{"x":1},"empty":[],"a:b":"\\\"quoted\\\""}')];
    for (const fixture of fixtures) {
        assert.deepEqual(JSON.parse(await yamlToJson(await jsonToYaml(JSON.stringify(fixture)))), fixture);
    }
});

test('unsupported or malformed YAML is rejected instead of silently changing data', async () => {
    for (const input of ['items: [one', 'a: 1\na: 2', '? [one, two]\n: value', 'value: .inf', 'value: 9007199254740993', 'a: !unknown value']) {
        await assert.rejects(() => yamlToJson(input));
    }
});
