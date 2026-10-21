import { useNavigate } from "react-router-dom";
import DepthText from "../components/DepthText";
import PixelCard from "../components/PixelCard";
import "./Hero.css";
import SearchBar from "../components/SearchBar";
import { Link } from "react-router-dom";
import { textToolsData } from "../data/textTools";
import { imageToolsData } from "../data/imageTools";
import { docToolsData } from "../data/docTools";

const ALL_TOOLS = [["Text", textToolsData], ["Image", imageToolsData], ["Docs", docToolsData]]
    .flatMap(([hub, categories]) => categories.map((category) => ({ ...category,
        tools: category.tools.map((tool) => ({ ...tool, category: `${hub} · ${tool.category}` })),
    })));
const QUICK_TOOLS = [
    ["/text/text-counter", "Count words"],
    ["/text/case-converter", "Change text case"],
    ["/image/compress-image", "Compress image"],
    ["/image/crop-resize", "Crop & resize"],
    ["/doc/pdf-merger", "Merge PDF"],
    ["/doc/pdf-compressor", "Compress PDF"],
];

const EDITOR_CARDS = [
    {
        id: "text",
        title: "Text Tools",
        description:
            "Format, analyze, encode, and convert text in the browser.",
        icon: "/logos/text.webp",
        pixelColor: "red",
        path: "/text",
    },
    {
        id: "image",
        title: "Image Tools",
        description: "Compress, convert, resize, crop, and edit images.",
        icon: "/logos/image.webp",
        pixelColor: "green",
        path: "/image",
    },
    {
        id: "pdf",
        title: "Document Tools",
        description:
            "Convert, organize, repair, and redact PDF, DOCX, and CSV files.",
        icon: "/logos/doc.webp",
        pixelColor: "yellow",
        path: "/doc",
    },
];

function Hero() {
    const navigate = useNavigate();

    return (
        <section className="hero">
            <h1 className="hero-brand" aria-label="MODIF.in" translate="no"><span aria-hidden="true"><DepthText
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
            /></span></h1>

            <p className="hero-subtitle">
                Simple tools for your digital world.
            </p>
            <p className="hero-lead">
                Free tools for text, images, and documents. Everything runs in your browser. Your files and text never leave your device.
            </p>

            <div className="hero-search">
                <SearchBar categories={ALL_TOOLS} onSelect={(tool) => navigate(tool.path)} placeholder="Find a tool, e.g. compress image…" />
            </div>

            <nav className="hero-quick-tools" aria-label="Common tasks">
                {QUICK_TOOLS.map(([path, label]) => <Link className="cursor-target" key={path} to={path}>{label}</Link>)}
            </nav>

            <div className="hero-editor-cards">
                {EDITOR_CARDS.map(
                    ({ id, title, description, icon, pixelColor, path }) => (
                        <div key={id} className="hero-editor-card-wrap">
                            <PixelCard
                                variant="blue"
                                title={title}
                                description={description}
                                icon={icon}
                                pixelColor={pixelColor}
                                className="hero-editor-card cursor-target hero-editor-card--clickable"
                                to={path}
                            />
                        </div>
                    ),
                )}
            </div>
        </section>
    );
}

export default Hero;
