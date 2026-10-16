import assert from 'node:assert/strict';
import test from 'node:test';
import { timestampToDate } from '../../src/modules/text/_shared/developerUtils.js';

test('explicit units work for historical, zero, negative and boundary timestamps', () => {
    for (const [value, expected] of [['0','1970-01-01T00:00:00.000Z'], ['-1','1969-12-31T23:59:59.999Z'], ['999999999999','2001-09-09T01:46:39.999Z'], ['1000000000000','2001-09-09T01:46:40.000Z']]) {
        assert.equal(timestampToDate(value, 'milliseconds').toISOString(), expected);
    }
    assert.equal(timestampToDate('-1', 'seconds').toISOString(), '1969-12-31T23:59:59.000Z');
    assert.equal(timestampToDate('0.001', 'seconds').getTime(), 1);
    assert.equal(timestampToDate('1000000000', 'seconds').getTime(), 1000000000000);
});
test('empty, malformed, out-of-range and imprecise timestamps are rejected', () => {
    for (const input of ['', ' ', '0x10', '1junk', 'Infinity', '1e3', '9007199254740993', '8640000000000001', '0.5']) assert.throws(()=>timestampToDate(input, 'milliseconds'));
    assert.throws(()=>timestampToDate('1', 'minutes'));
});
