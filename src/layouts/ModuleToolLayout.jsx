import { Link, Outlet } from "react-router-dom";
import Silk from "../components/Silk";
import DepthText from "../components/DepthText";
import TargetCursor from "../components/TargetCursor";
import Footer from "../sections/Footer";
import { useToolPageScroll } from "../hooks/useToolPageScroll";
import { MODULE_TOOL_CONFIG } from "./moduleToolConfig";
import "./ToolHubLayout.css";

function ModuleToolLayout({ module }) {
    const config = MODULE_TOOL_CONFIG[module] ?? MODULE_TOOL_CONFIG.text;
    useToolPageScroll();

    return (
        <main className="tool-hub-layout">
            <div className="tool-hub-layout__background" aria-hidden="true">
                <Silk
                    speed={5}
                    scale={1}
                    noiseIntensity={1.5}
                    color1={config.color1}
                    color2={config.color2}
                />
            </div>

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
