import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeJwt } from '../../src/modules/text/_shared/developerUtils.js';

const token = payload => `${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.`;
test('an invalid optional exp never discards decoded header or payload', () => {
    for (const exp of [1e20, -1e20, 'tomorrow', null]) {
        const result = decodeJwt(token({sub:'qa',name:'🌍',exp}));
        assert.deepEqual(result.header, {alg:'none'});
        assert.deepEqual(result.payload, {sub:'qa',name:'🌍',exp});
        assert.equal(result.expiration, null);
        assert.match(result.expirationError, /Invalid exp/);
    }
    assert.equal(decodeJwt('eyJhbGciOiJub25lIn0.eyJzdWIiOiJxYSIsImV4cCI6MWUyMH0.').payload.sub, 'qa');
});
test('absent, epoch and negative valid expiration dates stay distinguishable', () => {
    assert.equal(decodeJwt(token({sub:'qa'})).expirationError, null);
    assert.equal(decodeJwt(token({exp:0})).expiration, '1970-01-01T00:00:00.000Z');
    assert.equal(decodeJwt(token({exp:-1})).expiration, '1969-12-31T23:59:59.000Z');
    assert.throws(()=>decodeJwt('bad'));
});
