import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCanonicalUrl, getIndexableRoutes, getRouteMeta, getRouteTitle } from "../../src/data/routeTitles.js";
import { buildRoutePages, renderRouteHead, renderRouteHtml, routeHtmlFile } from "../../scripts/routeMetaHead.js";

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

const template = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const files = new Map(buildRoutePages(template));
assert.equal(files.size, routes.length + 1);
for (const meta of routes) {
    const html = files.get(routeHtmlFile(meta.path));
    assert.ok(html.includes(renderRouteHead(meta)), meta.path);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.equal(html.includes("var routes ="), false, "no all-route blocking script");
}
assert.match(files.get("404.html"), /content="noindex"/);
assert.doesNotMatch(files.get("404.html"), /rel="canonical"|property="og:url"/);
assert.throws(() => renderRouteHtml("<head></head>", routes[0]), /Missing route metadata/);
const hostile = renderRouteHead({ title: '<script>"&', description: '"><img src=x>', canonical: null });
assert.doesNotMatch(hostile, /<script>|<img/);
assert.match(hostile, /&lt;script&gt;&quot;&amp;/);

console.log(`${routes.length} routes have unique titles, descriptions, and canonical URLs`);
