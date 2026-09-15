import WarpText from "../components/WarpText";
import SearchBar from "../components/SearchBar";
import ToolButton from "../components/ToolButton";
import "./ToolHub.css";

function ToolHub({ title, subheading, toolsData = [] }) {
    return (
        <>
            <section className="tool-hub__intro" aria-labelledby="tool-hub-heading">
                <div className="tool-hub__heading-wrap">
                    <WarpText
                        text={title}
                        color="#f8fafc"
                        fontFamily="Georgia, serif"
                        fontSize="clamp(2.25rem, 7vw, 4.5rem)"
                        fontWeight={700}
                        warpScale={2.8}
                        pointerStrength={0.8}
                        speed={0.9}
                        letterSpacing="-0.03em"
                        lineHeight={0.95}
                    />
                </div>

                <p className="tool-hub__subheading">{subheading}</p>

                <div className="tool-hub__search-wrap">
                    <SearchBar
                        categories={toolsData}
                        onSelect={(tool) => {
                            console.info("Selected tool:", tool);
                        }}
                    />
                </div>

                <div className="tool-hub__badges">
                    <div className="tooltip-container">
                        <span>100% Private</span>
                        <div className="tooltip-box">
                            All processing happens locally in your browser. No
                            files are ever uploaded.
                        </div>
                    </div>
                    <div className="tooltip-container">
                        <span>Zero Latency</span>
                        <div className="tooltip-box">
                            Tools execute instantly on your device without
                            waiting for server queues.
                        </div>
                    </div>
                </div>
            </section>

            <section
                className="tool-hub__body tool-hub__grid"
                aria-label="Tool categories"
            >
                {toolsData.map((category) => (
                    <div key={category.id} className="tool-category">
                        <h2 className="tool-category__title">{category.name}</h2>
                        <div className="tool-category__grid">
                            {category.tools.map((tool) => (
                                <ToolButton
                                    key={tool.id}
                                    name={tool.name}
                                    featured={Boolean(tool.featured)}
                                    highlighted={Boolean(tool.highlighted)}
                                    isPopular={Boolean(tool.isPopular)}
                                    onClick={() => {
                                        console.info("Open tool:", tool);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </>
    );
}

export default ToolHub;
