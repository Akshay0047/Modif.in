export function hubPath(pathname) {
    const path = String(pathname ?? "").toLowerCase();
    if (path === "/image" || path.startsWith("/image/")) return "/image";
    if (path === "/doc" || path.startsWith("/doc/")) return "/doc";
    if (path === "/text" || path.startsWith("/text/")) return "/text";
    return "/";
}

export function fallbackPath(pathname) {
    const hub = hubPath(pathname);
    const path = String(pathname ?? "");
    if (hub !== "/" && path !== hub && path !== `${hub}/`) return hub;
    return "/";
}

export function canGoBack(historyState) {
    const index = historyState?.idx;
    return typeof index === "number" && index > 0;
}
