import WarpText from "../components/WarpText";
import SearchBar from "../components/SearchBar";
import ToolButton from "../components/ToolButton";
import { siteConfig, toolCategories } from "../data/tools";
import "./ToolHub.css";

function ToolHub() {
    const heading = `${siteConfig.itemLabel} TOOLS`;

    return (
        <>
            <header className="site-header">
                <a className="site-header__brand" href={siteConfig.homeUrl}>
                    MODIF.in
                </a>
            </header>

            <section className="tool-hub__intro" aria-labelledby="tool-hub-heading">
                <div className="tool-hub__heading-wrap">
                    <WarpText
                        text={heading}
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

                <p className="tool-hub__subheading">{siteConfig.subheading}</p>

                <SearchBar
                    categories={toolCategories}
                    onSelect={(tool) => {
                        console.info("Selected tool:", tool);
                    }}
                />

                <div className="tool-hub__badges">
                    <span>100% Private</span>
                    <span>Zero Latency</span>
                </div>
            </section>

            <section className="tool-hub__body" aria-label="Tool categories">
                {toolCategories.map((category) => (
                    <div key={category.id} className="tool-category">
                        <h2 className="tool-category__title">{category.name}</h2>
                        <div className="tool-category__grid">
                            {category.tools.map((tool) => (
                                <ToolButton
                                    key={tool.id}
                                    name={tool.name}
                                    featured={Boolean(tool.featured)}
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
