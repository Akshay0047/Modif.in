import Silk from "./components/Silk";
import DepthText from "./components/DepthText";
import TargetCursor from "./components/TargetCursor";
import ToolHub from "./sections/ToolHub";
import Footer from "./sections/Footer";
import { siteConfig } from "./data/tools";
import "./App.css";

function App() {
    return (
        <main className="app">
            <Silk speed={5} scale={1} noiseIntensity={1.5} />

            <TargetCursor
                spinDuration={4}
                hideDefaultCursor
                parallaxOn
                hoverDuration={0.25}
                cursorColor="#ffffff"
                cursorColorOnTarget="#bf1c1c"
            />

            <header className="app-header">
                <a
                    className="app-header__brand"
                    href={siteConfig.homeUrl}
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
                </a>
            </header>

            <ToolHub />
            <Footer />
        </main>
    );
}

export default App;
