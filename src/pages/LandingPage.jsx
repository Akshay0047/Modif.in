import { lazy, Suspense } from "react";
import CursorLayer from "../components/CursorLayer";
import Hero from "../sections/Hero";
import Footer from "../sections/Footer";

const DitherBackground = lazy(() => import("../components/Dither"));

function LandingPage() {
    return (
        <div className="app">
            <Suspense fallback={null}><DitherBackground
                waveColor={[
                    0.3215686274509804, 0.3607843137254902, 0.7764705882352941,
                ]}
                disableAnimation={false}
                enableMouseInteraction
                mouseRadius={0.1}
                colorNum={6.2}
                waveAmplitude={0.28}
                waveFrequency={4.6}
                waveSpeed={0.04}
                backgroundColor={[0, 0, 0]}
            /></Suspense>

            <CursorLayer
                spinDuration={6.4}
                hideDefaultCursor
                parallaxOn
                hoverDuration={0.25}
                cursorColor="#ffffff"
                cursorColorOnTarget="#bf1c1c"
            />

            <main id="main-content" tabIndex={-1}><Hero /></main>
            <Footer />
        </div>
    );
}

export default LandingPage;
