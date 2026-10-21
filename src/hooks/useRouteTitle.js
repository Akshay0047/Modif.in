import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyDocumentMeta, getRouteMeta } from "../data/routeMeta.js";

export function useRouteTitle() {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        applyDocumentMeta(getRouteMeta(pathname));
    }, [pathname]);
}
