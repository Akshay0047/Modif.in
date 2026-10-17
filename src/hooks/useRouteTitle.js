import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCanonicalUrl, getRouteTitle } from "../data/routeTitles.js";

function syncCanonical(pathname) {
    const href = getCanonicalUrl(pathname);
    const existing = document.querySelector('link[rel="canonical"]');
    if (!href) {
        existing?.remove();
        return;
    }
    const link = existing ?? document.head.appendChild(document.createElement("link"));
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", href);
}

export function useRouteTitle() {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        document.title = getRouteTitle(pathname);
        syncCanonical(pathname);
    }, [pathname]);
}
