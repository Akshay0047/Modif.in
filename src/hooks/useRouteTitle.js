import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { getRouteTitle } from "../data/routeTitles.js";

export function useRouteTitle() {
    const { pathname } = useLocation();
    useLayoutEffect(() => {
        document.title = getRouteTitle(pathname);
    }, [pathname]);
}
