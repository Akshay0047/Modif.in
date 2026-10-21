import { useLocation } from "react-router-dom";
import AppSilkBackdrop from "../components/AppSilkBackdrop";
import { getModuleFromPathname, getModuleLayoutKey } from "../utils/moduleTheme";
import { MODULE_TOOL_CONFIG } from "./moduleToolConfig";
import { useModuleScrollbarTheme } from "../hooks/useModuleScrollbarTheme";
import { useGaPageViews } from "../hooks/useGaPageViews";
import { useRouteTitle } from "../hooks/useRouteTitle";
import { AnimationProvider } from "../contexts/AnimationContext";
import AppHeader from "../components/AppHeader";
import PageLoadingScreen from "../components/PageLoadingScreen";

function AppShell({ children }) {
    const { pathname } = useLocation();
    useModuleScrollbarTheme();
    useRouteTitle();
    useGaPageViews();

    const onModuleRoute = Boolean(getModuleFromPathname(pathname));
    const moduleKey =
        getModuleLayoutKey(pathname) ?? "text";
    const config = MODULE_TOOL_CONFIG[moduleKey] ?? MODULE_TOOL_CONFIG.text;

    return (
        <AnimationProvider>
            <PageLoadingScreen />
            <a className="skip-link" href="#main-content">Skip to main content</a>
            <AppHeader />
            <div id="page-content">
                <AppSilkBackdrop
                    visible={onModuleRoute}
                    color1={config.color1}
                    color2={config.color2}
                />
                {children}
            </div>
        </AnimationProvider>
    );
}

export default AppShell;
