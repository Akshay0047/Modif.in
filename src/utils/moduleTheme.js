/**
 * Resolve the active module theme from the current pathname.
 * Used to color-code scrollbars for hub pages and all module sub-routes.
 */
export function getModuleFromPathname(pathname) {
    if (pathname === "/text" || pathname.startsWith("/text/")) {
        return "text";
    }

    if (pathname === "/image" || pathname.startsWith("/image/")) {
        return "image";
    }

    if (
        pathname === "/doc" ||
        pathname.startsWith("/doc/") ||
        pathname === "/docs" ||
        pathname.startsWith("/docs/")
    ) {
        return "docs";
    }

    return null;
}

/** Keys for `MODULE_TOOL_CONFIG` (image | text | doc). */
export function getModuleLayoutKey(pathname) {
    const module = getModuleFromPathname(pathname);
    if (module === "docs") return "doc";
    return module;
}
