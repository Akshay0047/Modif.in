import { useEffect } from "react";
import { Link } from "react-router-dom";
import Silk from "../components/Silk";
import DepthText from "../components/DepthText";
import TargetCursor from "../components/TargetCursor";
import Footer from "../sections/Footer";
import "./ToolHubLayout.css";
import "./ToolPagePlaceholder.css";

// Shared scaffold for individual tool subpages.
// These are placeholders for now: they render only the MODIF.in header,
// the shared Silk background + TargetCursor effects, and the Footer
// (privacy policy, etc.). Actual tool UI/logic is added later per module.
const MODULE_COLORS = {
    text: { color1: "#1a0505", color2: "#4a0f0f" },
    image: { color1: "#021108", color2: "#064e3b" },
    docs: { color1: "#1a1602", color2: "#5c450a" },
};

function ToolPagePlaceholder({ module = "text", toolName = "Tool" }) {
    const { color1, color2 } = MODULE_COLORS[module] ?? MODULE_COLORS.text;

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const root = document.getElementById("root");

        const previous = {
            htmlOverflowX: html.style.overflowX,
            htmlOverflowY: html.style.overflowY,
            htmlHeight: html.style.height,
            bodyOverflowX: body.style.overflowX,
            bodyOverflowY: body.style.overflowY,
            bodyHeight: body.style.height,
            rootOverflowX: root?.style.overflowX ?? "",
            rootOverflowY: root?.style.overflowY ?? "",
            rootHeight: root?.style.height ?? "",
        };

        html.style.overflowX = "clip";
        html.style.overflowY = "auto";
        html.style.height = "auto";
        body.style.overflowX = "clip";
        body.style.overflowY = "auto";
        body.style.height = "auto";

        if (root) {
            root.style.overflowX = "clip";
            root.style.overflowY = "auto";
            root.style.height = "auto";
            root.style.minHeight = "100%";
        }

        return () => {
            html.style.overflowX = previous.htmlOverflowX;
            html.style.overflowY = previous.htmlOverflowY;
            html.style.height = previous.htmlHeight;
            body.style.overflowX = previous.bodyOverflowX;
            body.style.overflowY = previous.bodyOverflowY;
            body.style.height = previous.bodyHeight;

            if (root) {
                root.style.overflowX = previous.rootOverflowX;
                root.style.overflowY = previous.rootOverflowY;
                root.style.height = previous.rootHeight;
                root.style.minHeight = "";
            }
        };
    }, []);

    return (
        <main className="tool-hub-layout">
            <div className="tool-hub-layout__background" aria-hidden="true">
                <Silk
                    speed={5}
                    scale={1}
                    noiseIntensity={1.5}
                    color1={color1}
                    color2={color2}
                />
            </div>

            <TargetCursor
                spinDuration={4}
                hideDefaultCursor
                parallaxOn
                hoverDuration={0.25}
                cursorColor="#ffffff"
                cursorColorOnTarget="#bf1c1c"
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

            <section className="tool-placeholder" aria-label={toolName}>
                <h1 className="tool-placeholder__title">{toolName}</h1>
                <p className="tool-placeholder__note">
                    This tool page is a placeholder. Implementation coming soon.
                </p>
            </section>

            <Footer />
        </main>
    );
}

export default ToolPagePlaceholder;
