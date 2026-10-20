import { useEffect } from "react";
import { Link } from "react-router-dom";
import Silk from "../components/Silk";
import DepthText from "../components/DepthText";
import CursorLayer from "../components/CursorLayer";
import ToolHub from "../sections/ToolHub";
import Footer from "../sections/Footer";
import "./ToolHubLayout.css";

function ToolHubLayout({
    title,
    subheading,
    color1,
    color2,
    toolsData = [],
    popularToolOrder = [],
}) {
    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const root = document.getElementById("root");

        const previous = {
            htmlOverflow: html.style.overflow,
            htmlOverflowX: html.style.overflowX,
            htmlOverflowY: html.style.overflowY,
            htmlHeight: html.style.height,
            bodyOverflow: body.style.overflow,
            bodyOverflowX: body.style.overflowX,
            bodyOverflowY: body.style.overflowY,
            bodyHeight: body.style.height,
            rootOverflow: root?.style.overflow ?? "",
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
            html.style.overflow = previous.htmlOverflow;
            html.style.overflowX = previous.htmlOverflowX;
            html.style.overflowY = previous.htmlOverflowY;
            html.style.height = previous.htmlHeight;
            body.style.overflow = previous.bodyOverflow;
            body.style.overflowX = previous.bodyOverflowX;
            body.style.overflowY = previous.bodyOverflowY;
            body.style.height = previous.bodyHeight;

            if (root) {
                root.style.overflow = previous.rootOverflow;
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

            <CursorLayer
                spinDuration={6.4}
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

            <ToolHub
                title={title}
                subheading={subheading}
                toolsData={toolsData}
                popularToolOrder={popularToolOrder}
            />
            <Footer />
        </main>
    );
}

export default ToolHubLayout;
