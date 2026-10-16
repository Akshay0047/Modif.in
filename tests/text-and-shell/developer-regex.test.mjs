import assert from 'node:assert/strict';
import test from 'node:test';
import { testRegex, previewRegexReplace } from '../../src/modules/text/_shared/developerUtils.js';

test('non-global matches preserve the first capture and its offset', () => {
    assert.deepEqual(testRegex('(cat)', '', 'a cat cat').matches, [{match:'cat',index:2,groups:['cat']}]);
    assert.deepEqual(testRegex('dog', '', 'cat').matches, []);
    assert.deepEqual(testRegex('cat', 'i', 'CAT cat').matches[0], {match:'CAT',index:0,groups:[]});
    assert.deepEqual(testRegex('cat', 'y', 'a cat').matches, []);
});
test('global, Unicode, zero-width and replacement semantics remain native', () => {
    assert.deepEqual(testRegex('cat', 'g', 'cat cat').matches.map(m=>m.index), [0,4]);
    assert.deepEqual(testRegex('(?=.)', 'gu', '🌍a').matches.map(m=>m.index), [0,2]);
    assert.equal(previewRegexReplace('(cat)', '', 'cat cat', '<$1>'), '<cat> cat');
    assert.equal(previewRegexReplace('(cat)', 'g', 'cat cat', '<$1>'), '<cat> <cat>');
    assert.throws(()=>testRegex('[', '', 'cat'), SyntaxError);
});
