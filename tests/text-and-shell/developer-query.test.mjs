import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQueryString, generateQueryString } from '../../src/modules/text/_shared/developerUtils.js';

test('query arrays round-trip repeated, empty, encoded and prototype-named keys', () => {
    const query = '?tag=a&tag=b&empty=&empty=&q=a+b%2Bc&__proto__=x&__proto__=y&emoji=%F0%9F%8C%8D';
    const parsed = parseQueryString(query);
    assert.deepEqual(parsed, JSON.parse('{"tag":["a","b"],"empty":["",""],"q":"a b+c","__proto__":["x","y"],"emoji":"🌍"}'));
    const encoded = generateQueryString(JSON.stringify(parsed));
    assert.deepEqual([...new URLSearchParams(encoded)], [...new URLSearchParams(query)]);
    assert.deepEqual(parseQueryString(encoded), parsed);
    assert.equal(generateQueryString('{"a":[1,true,""],"skip":null}'), 'a=1&a=true&a=');
});
test('generation rejects non-object or nested data rather than stringifying it', () => {
    for (const json of ['null','[]','"text"','{"a":{}}','{"a":[[1]]}','{"a":1e400}']) assert.throws(()=>generateQueryString(json));
});
