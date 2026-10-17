import assert from 'node:assert/strict';
import test from 'node:test';
import { sortJsonKeys } from '../../src/modules/text/_shared/developerUtils.js';

test('sorting preserves every key at all levels without changing prototypes', () => {
    const original = JSON.parse('{"z":[{"__proto__":{"x":1},"constructor":2,"a":3}],"__proto__":{"prototype":{"b":false,"a":null}},"a":2}');
    const sorted = JSON.parse(sortJsonKeys(JSON.stringify(original)));
    assert.deepEqual(sorted, original);
    assert.deepEqual(Object.keys(sorted), ['__proto__', 'a', 'z']);
    assert.deepEqual(Object.keys(sorted.z[0]), ['__proto__', 'a', 'constructor']);
    assert.equal(Object.getPrototypeOf(sorted), Object.prototype);
    assert.equal(Object.prototype.x, undefined);
});
