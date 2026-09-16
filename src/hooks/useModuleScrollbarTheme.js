import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getModuleFromPathname } from "../utils/moduleTheme";

/**
 * Applies a module-specific scrollbar theme by setting `data-module` on <html>.
 * Future tool subpages inherit the theme automatically via route prefix matching.
 */
export function useModuleScrollbarTheme() {
    const { pathname } = useLocation();

    useEffect(() => {
        const module = getModuleFromPathname(pathname);
        const html = document.documentElement;

        if (module) {
            html.setAttribute("data-module", module);
        } else {
            html.removeAttribute("data-module");
        }
    }, [pathname]);
}
