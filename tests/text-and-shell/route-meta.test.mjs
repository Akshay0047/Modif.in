import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCanonicalUrl, getIndexableRoutes, getRouteMeta, getRouteTitle } from "../../src/data/routeTitles.js";
import { buildRouteMetaBootScript } from "../../scripts/routeMetaHead.js";

const routes = getIndexableRoutes();
const titles = new Map();
const descriptions = new Map();

for (const route of routes) {
    assert.equal(getRouteTitle(route.path), route.title);
    assert.equal(getCanonicalUrl(route.path), route.canonical);
    assert.match(route.canonical, /^https:\/\/modif\.in(\/|$)/);
    assert.equal(route.canonical.includes("www."), false);
    assert.equal(titles.has(route.title), false, route.title);
    assert.equal(descriptions.has(route.description), false, route.path);
    titles.set(route.title, route.path);
    descriptions.set(route.description, route.path);
    assert.ok(route.title.length <= 70, `${route.path} title is ${route.title.length} characters`);
    assert.ok(route.description.length >= 32 && route.description.length <= 180, `${route.path} description length ${route.description.length}`);
}

assert.equal(routes.length, 118);
assert.equal(getRouteMeta("/").canonical, "https://modif.in/");
assert.equal(getRouteMeta("/text").title, "Text Tools – Free Online Text & Developer Utilities | Modif");
assert.equal(getRouteMeta("/doc").title, "PDF & Document Tools – Free Online File Utilities | Modif");
assert.equal(getRouteMeta("/image").title, "Image Tools – Free Online Image Converter & Editor | Modif");
assert.equal(getRouteMeta("/missing").canonical, null);
assert.equal(getRouteMeta("/missing").title, "Page not found | Modif");

const sitemap = readFileSync(new URL("../../public/sitemap.xml", import.meta.url), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expected = routes
    .map((route) => route.canonical)
    .sort((left, right) => left.localeCompare(right));
assert.deepEqual(locs.sort((left, right) => left.localeCompare(right)), expected);

const boot = buildRouteMetaBootScript();
assert.match(boot, /Text Tools – Free Online Text & Developer Utilities \| Modif/);
assert.match(boot, /PDF & Document Tools – Free Online File Utilities \| Modif/);
assert.match(boot, /noindex/);
assert.equal(boot.includes("</script><script"), false);

console.log(`${routes.length} routes have unique titles, descriptions, and canonical URLs`);
