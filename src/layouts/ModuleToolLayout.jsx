import { Outlet, useLocation } from "react-router-dom";
import CursorLayer from "../components/CursorLayer";
import Footer from "../sections/Footer";
import { useToolPageScroll } from "../hooks/useToolPageScroll";
import { getModuleLayoutKey } from "../utils/moduleTheme";
import { MODULE_TOOL_CONFIG } from "./moduleToolConfig";
import "./ToolHubLayout.css";

function ModuleToolLayout() {
    const { pathname } = useLocation();
    const moduleKey = getModuleLayoutKey(pathname) ?? "text";
    const config = MODULE_TOOL_CONFIG[moduleKey] ?? MODULE_TOOL_CONFIG.text;
    useToolPageScroll();

    return (
        <div className="tool-hub-layout">
            <CursorLayer
                spinDuration={6.4}
                hideDefaultCursor
                parallaxOn
                hoverDuration={0.25}
                cursorColor="#ffffff"
                cursorColorOnTarget={config.cursorColorOnTarget}
            />

            <main id="main-content" tabIndex={-1}><Outlet /></main>

            <Footer />
        </div>
    );
}

export default ModuleToolLayout;
