import { useState } from "react";
import { useLocation } from "react-router-dom";
import AppSilkBackdrop from "../components/AppSilkBackdrop";
import { SilkPreviewContext } from "../contexts/SilkPreviewContext";
import { getModuleFromPathname, getModuleLayoutKey } from "../utils/moduleTheme";
import { MODULE_TOOL_CONFIG } from "./moduleToolConfig";
import { useModuleScrollbarTheme } from "../hooks/useModuleScrollbarTheme";
import { useGaPageViews } from "../hooks/useGaPageViews";

function AppShell({ children }) {
    const { pathname } = useLocation();
    const [previewModuleKey, setPreviewModuleKey] = useState(null);
    useModuleScrollbarTheme();
    useGaPageViews();

    const onModuleRoute = Boolean(getModuleFromPathname(pathname));
    const moduleKey =
        getModuleLayoutKey(pathname) ?? previewModuleKey ?? "text";
    const config = MODULE_TOOL_CONFIG[moduleKey] ?? MODULE_TOOL_CONFIG.text;

    return (
        <SilkPreviewContext.Provider value={setPreviewModuleKey}>
            <AppSilkBackdrop
                visible={onModuleRoute}
                color1={config.color1}
                color2={config.color2}
            />
            {children}
        </SilkPreviewContext.Provider>
    );
}

export default AppShell;
