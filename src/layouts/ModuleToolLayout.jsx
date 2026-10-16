import { Link, Outlet, useLocation } from "react-router-dom";
import DepthText from "../components/DepthText";
import TargetCursor from "../components/TargetCursor";
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
        <main className="tool-hub-layout">
            <TargetCursor
                spinDuration={6.4}
                hideDefaultCursor
                parallaxOn
                hoverDuration={0.25}
                cursorColor="#ffffff"
                cursorColorOnTarget={config.cursorColorOnTarget}
            />

            <header className="app-header">
                <Link
                    className="app-header__brand"
                    to="/"
                    aria-label="MODIF.in home"
                >
                    <div
                        className="app-header__logo cursor-target"
                        style={{
                            transform: "scale(0.25)",
                            transformOrigin: "center center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "0px",
                            margin: "0",
                        }}
                    >
                        <DepthText
                            text="MODIF.in"
                            layers={28}
                            depth={1.9}
                            faceColor="#f8fafc"
                            depthColor="#13008f"
                            tilt={7.5}
                            pointerTracking
                            smoothing={0.22}
                            perspective={475}
                            autoOrbit
                            orbitSpeed={0.35}
                            fontSize="clamp(3rem, 12vw, 7rem)"
                            fontWeight={800}
                            shadow
                        />
                    </div>
                </Link>
            </header>

            <Outlet />

            <Footer />
        </main>
    );
}

export default ModuleToolLayout;
