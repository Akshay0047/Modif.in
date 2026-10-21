import assert from "node:assert/strict";
import test from "node:test";
import { getIndexableRoutes, getRouteMeta } from "../../src/data/routeMeta.js";
import { getRouteStructuredData } from "../../src/data/routeStructuredData.js";

test("homepage identifies the free MODIF.in website", () => {
    const data = getRouteStructuredData(getRouteMeta("/"));
    assert.equal(data["@context"], "https://schema.org");
    const [website] = data["@graph"];
    assert.equal(website["@type"], "WebSite");
    assert.equal(website["@id"], "https://modif.in/#website");
    assert.equal(website.name, "MODIF.in");
    assert.equal(website.url, "https://modif.in/");
    assert.equal(website.isAccessibleForFree, true);
});

test("hubs are collections with canonical two-level breadcrumbs", () => {
    for (const path of ["/text", "/image", "/doc"]) {
        const data = getRouteStructuredData(getRouteMeta(path));
        const page = data["@graph"].find((node) => node["@type"] === "CollectionPage");
        const breadcrumbs = data["@graph"].find((node) => node["@type"] === "BreadcrumbList");
        assert.equal(page.url, `https://modif.in${path}`);
        assert.equal(page.breadcrumb["@id"], breadcrumbs["@id"]);
        assert.deepEqual(breadcrumbs.itemListElement.map((item) => item.item), ["https://modif.in/", page.url]);
        assert.equal(data["@graph"].some((node) => node["@type"] === "WebApplication"), false);
    }
});

test("every tool describes a free browser application linked to its page and hub", () => {
    const routes = getIndexableRoutes().filter((meta) => meta.path.split("/").length === 3);
    assert.ok(routes.length > 0);
    for (const meta of routes) {
        const data = getRouteStructuredData(meta);
        const page = data["@graph"].find((node) => node["@type"] === "WebPage");
        const app = data["@graph"].find((node) => node["@type"] === "WebApplication");
        const breadcrumbs = data["@graph"].find((node) => node["@type"] === "BreadcrumbList");
        assert.equal(page.url, meta.canonical);
        assert.equal(app.url, meta.canonical);
        assert.equal(app.description, meta.description);
        assert.equal(page.mainEntity["@id"], app["@id"]);
        assert.equal(app.mainEntityOfPage["@id"], page["@id"]);
        assert.equal(app.isAccessibleForFree, true);
        assert.equal(Number(app.offers.price), 0);
        assert.equal(app.applicationCategory, "UtilitiesApplication");
        assert.match(app.browserRequirements, /JavaScript/);
        assert.deepEqual(breadcrumbs.itemListElement.map((item) => item.position), [1, 2, 3]);
        assert.deepEqual(breadcrumbs.itemListElement.map((item) => item.item), [
            "https://modif.in/",
            `https://modif.in/${meta.path.split("/")[1]}`,
            meta.canonical,
        ]);
        assert.equal(breadcrumbs.itemListElement[2].name, app.name);
    }
});

test("unknown and incomplete routes emit no structured data", () => {
    assert.equal(getRouteStructuredData(getRouteMeta("/missing")), null);
    assert.equal(getRouteStructuredData(getRouteMeta("/text/missing")), null);
    assert.equal(getRouteStructuredData({ path: "/text/missing", canonical: "https://modif.in/text/missing" }), null);
    assert.equal(getRouteStructuredData(null), null);
});

test("route graphs serialize cleanly without invented social proof", () => {
    for (const meta of getIndexableRoutes()) {
        const data = getRouteStructuredData(meta);
        assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
        const ids = data["@graph"].map((node) => node["@id"]);
        assert.equal(new Set(ids).size, ids.length);
        for (const node of data["@graph"]) {
            assert.equal("aggregateRating" in node, false);
            assert.equal("review" in node, false);
            assert.equal("interactionStatistic" in node, false);
        }
    }
});
