import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { formatSql } from '../../src/modules/text/_shared/developerUtils.js';

test('formatted SQL executes with unchanged string and identifier values', async () => {
    const db = new DatabaseSync(':memory:');
    db.exec('create table users(name text); insert into users values (\'Ada\');');
    const fixtures = ["select 'from home' as label from users", "select 'it''s SELECT from home' as label", 'select "name" as "FROM" from users', "select 'a  b' as label -- from home\nfrom users", "select 'x/* WHERE */y' as label /* FROM users */"];
    for (const input of fixtures) {
        const formatted = await formatSql(input);
        assert.deepEqual(db.prepare(formatted).all(), db.prepare(input).all());
        assert.equal(await formatSql(formatted), formatted);
    }
    db.close();
});
test('unterminated SQL literals fail visibly', async () => {
    await assert.rejects(()=>formatSql("select 'from home"));
});
