import { getIndexableRoutes, getRouteMeta } from "../src/data/routeMeta.js";
import { getRouteStructuredData } from "../src/data/routeStructuredData.js";

const META_BLOCK = /<!-- modif:route-meta:start -->[\s\S]*?<!-- modif:route-meta:end -->/;

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
}

export function renderRouteHead(meta) {
    const title = escapeHtml(meta.title);
    const description = escapeHtml(meta.description);
    const canonical = meta.canonical && escapeHtml(meta.canonical);
    const structuredData = getRouteStructuredData(meta);
    return `<!-- modif:route-meta:start -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${canonical ? "index,follow" : "noindex"}" />
    ${canonical ? `<link rel="canonical" href="${canonical}" />` : ""}
    <meta property="og:site_name" content="MODIF.in" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    ${canonical ? `<meta property="og:url" content="${canonical}" />` : ""}
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${structuredData ? `<script id="route-structured-data" type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>` : ""}
    <!-- modif:route-meta:end -->`;
}

export function renderRouteHtml(template, meta) {
    if (!META_BLOCK.test(template)) throw new Error("Missing route metadata block in index.html");
    return template.replace(META_BLOCK, () => renderRouteHead(meta));
}

export function routeHtmlFile(path) {
    return path === "/" ? "index.html" : `${path.slice(1)}.html`;
}

// Only static public metadata is generated. User files and tool input are never
// involved in the build; all tool execution remains in the browser.
export function buildRoutePages(template) {
    return [
        ...getIndexableRoutes().map((meta) => [routeHtmlFile(meta.path), renderRouteHtml(template, meta)]),
        ["404.html", renderRouteHtml(template, getRouteMeta("/404.html"))],
    ];
}
