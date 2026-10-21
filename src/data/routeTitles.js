import { getRouteMeta } from "./routeMeta.js";

export {
    SITE_ORIGIN,
    normalizePathname,
    getRouteMeta,
    getIndexableRoutes,
    applyDocumentMeta,
} from "./routeMeta.js";

export function getRouteTitle(pathname) {
    return getRouteMeta(pathname).title;
}

export function getCanonicalUrl(pathname) {
    return getRouteMeta(pathname).canonical;
}
