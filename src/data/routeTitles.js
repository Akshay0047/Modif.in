import { textToolsData } from "./textTools.js";
import { imageToolsData } from "./imageTools.js";
import { docToolsData } from "./docTools.js";

export const SITE_ORIGIN = "https://modif.in";

const routeNames = new Map([
    ["/text", "Text tools"],
    ["/image", "Image tools"],
    ["/doc", "Document tools"],
    ...[...textToolsData, ...imageToolsData, ...docToolsData].flatMap((category) =>
        category.tools.map((tool) => [tool.path, tool.name]),
    ),
]);

export function normalizePathname(pathname) {
    let path;
    try {
        path = decodeURI(pathname).replace(/\/+$/, "").toLowerCase() || "/";
    } catch {
        path = String(pathname || "/");
    }
    if (!path.startsWith("/")) path = `/${path}`;
    return path;
}

export function getRouteTitle(pathname) {
    const path = normalizePathname(pathname);
    if (path === "/") return "MODIF.in | Text, image and document tools";
    return `${routeNames.get(path) || "Page not found"} | MODIF.in`;
}

export function getCanonicalUrl(pathname) {
    const path = normalizePathname(pathname);
    if (path !== "/" && !routeNames.has(path)) return null;
    return path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
}
