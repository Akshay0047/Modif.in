import { textToolsData } from "./textTools.js";
import { imageToolsData } from "./imageTools.js";
import { docToolsData } from "./docTools.js";

const routeNames = new Map([
    ["/text", "Text tools"],
    ["/image", "Image tools"],
    ["/doc", "Document tools"],
    ...[...textToolsData, ...imageToolsData, ...docToolsData].flatMap((category) =>
        category.tools.map((tool) => [tool.path, tool.name]),
    ),
]);

export function getRouteTitle(pathname) {
    let path;
    try {
        path = decodeURI(pathname).replace(/\/+$/, "").toLowerCase() || "/";
    } catch {
        path = pathname;
    }
    if (path === "/") return "MODIF.in | Text, image and document tools";
    return `${routeNames.get(path) || "Page not found"} | MODIF.in`;
}
