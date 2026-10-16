import assert from "node:assert/strict";
import test from "node:test";
import { toTitleCase } from "../../src/modules/text/_shared/textFormatter.js";

test("title case capitalizes accented word starts without losing combining marks", () => {
    assert.equal(toTitleCase("élan über déjà"), "Élan Über Déjà");
    assert.equal(toTitleCase("ÉLAN ÜBER DÉJÀ"), "Élan Über Déjà");
    assert.equal(toTitleCase("e\u0301LAN a\u0308PFEL"), "E\u0301lan A\u0308pfel");
    assert.equal(toTitleCase("“élan”—über/déjà, mañana!"), "“Élan”—Über/Déjà, Mañana!");
});

test("title case respects words and punctuation across supported scripts", () => {
    assert.equal(toTitleCase("ПРИВЕТ МИР"), "Привет Мир");
    assert.equal(toTitleCase("ΚΌΣΜΟΣ ΩΣ"), "Κόσμος Ως");
    assert.equal(toTitleCase("العربية हिन्दी 中文 👨‍👩‍👧‍👦"), "العربية हिन्दी 中文 👨‍👩‍👧‍👦");
    assert.equal(toTitleCase("don't STOP\nélan-über"), "Don't Stop\nÉlan-Über");
    assert.equal(toTitleCase(""), "");
});
