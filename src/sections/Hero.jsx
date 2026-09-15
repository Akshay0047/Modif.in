import { useNavigate } from "react-router-dom";
import DepthText from "../components/DepthText";
import PixelCard from "../components/PixelCard";
import "./Hero.css";

const EDITOR_CARDS = [
    {
        id: "text",
        title: "Text Tools",
        description:
            "Comprehensive utilities for text analysis, formatting, encoding, and developer tools",
        icon: "/logos/text.png",
        pixelColor: "red",
        path: "/text",
    },
    {
        id: "image",
        title: "Image Tools",
        description: "A dedicated suite for image manipulation and processing",
        icon: "/logos/image.png",
        pixelColor: "green",
        path: "/image",
    },
    {
        id: "pdf",
        title: "Document Tools",
        description:
            "Powerful utilities for modifying PDF, DOCX, and CSV documents.",
        icon: "/logos/doc.png",
        pixelColor: "yellow",
        path: "/doc",
    },
];

function Hero() {
    const navigate = useNavigate();

    return (
        <section className="hero">
            <DepthText
                className="cursor-target"
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

            <p className="hero-subtitle">
                Simple tools for your digital world.
            </p>

            <div className="hero-editor-cards">
                {EDITOR_CARDS.map(
                    ({ id, title, description, icon, pixelColor, path }) => (
                        <PixelCard
                            key={id}
                            variant="blue"
                            title={title}
                            description={description}
                            icon={icon}
                            pixelColor={pixelColor}
                            className="hero-editor-card cursor-target hero-editor-card--clickable"
                            onClick={() => navigate(path)}
                        />
                    ),
                )}
            </div>
        </section>
    );
}

export default Hero;
