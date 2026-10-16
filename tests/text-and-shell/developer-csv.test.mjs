import assert from 'node:assert/strict';
import test from 'node:test';
import Papa from 'papaparse';
import { jsonToCsv } from '../../src/modules/text/_shared/developerUtils.js';

test('CSV headers and values use the same comma, quote, CR and LF escaping', () => {
    const headers = ['a,b', 'a"b', 'a\rb', 'a\nb', 'plain'];
    const values = ['v,v', 'v"v', 'v\rv', 'v\nv', 'plain'];
    const csv = jsonToCsv(JSON.stringify([Object.fromEntries(headers.map((h, i) => [h, values[i]]))]));
    const parsed = Papa.parse(csv);
    assert.deepEqual(parsed.errors, []);
    assert.deepEqual(parsed.data, [headers, values]);
    assert.equal(jsonToCsv('[{"a,b":"value"}]'), '"a,b"\nvalue');
});
