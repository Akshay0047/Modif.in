import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { textPopularToolOrder, textToolsData } from "../../src/data/textTools.js";
import { imagePopularToolOrder, imageToolsData } from "../../src/data/imageTools.js";
import { docPopularToolOrder, docToolsData } from "../../src/data/docTools.js";
import { prepareHubToolsData } from "../../src/data/tools.js";

for (const [module, categories, order] of [
    ["text", textToolsData, textPopularToolOrder],
    ["image", imageToolsData, imagePopularToolOrder],
    ["docs", docToolsData, docPopularToolOrder],
]) {
    test(`${module} popular tools are unique, implemented, and shown in their curated order`, () => {
        const tools = categories.flatMap((category) => category.tools);
        assert.ok(order.length > 0, "The hub needs a useful quick-access selection");
        assert.equal(new Set(order).size, order.length, "Selection contains duplicate IDs");

        for (const id of order) {
            assert.equal(tools.filter((tool) => tool.id === id).length, 1, `${id} must identify one catalog tool`);
            assert.ok(existsSync(new URL(`../../src/modules/${module}/${id}/index.jsx`, import.meta.url)), `${id} must have an implemented route`);
        }

        assert.deepEqual(
            tools.filter((tool) => tool.isPopular).map((tool) => tool.id).sort(),
            [...order].sort(),
            "Highlights must match the curated selection",
        );

        const [popular, ...remainingCategories] = prepareHubToolsData(categories, order);
        assert.equal(popular.id, "popular-tools");
        assert.deepEqual(popular.tools.map((tool) => tool.id), order);
        assert.deepEqual(
            remainingCategories.flatMap((category) => category.tools).map((tool) => tool.id).sort(),
            tools.map((tool) => tool.id).sort(),
            "Quick access must preserve the full categorized catalog",
        );
    });
}
