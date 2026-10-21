import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import WarpText from "../components/WarpText";
import SearchBar from "../components/SearchBar";
import ToolButton from "../components/ToolButton";
import { prepareHubToolsData } from "../data/tools";
import "./ToolHub.css";

function ToolHub({
    title,
    subheading,
    toolsData = [],
    popularToolOrder = [],
}) {
    const navigate = useNavigate();
    const displayToolsData = useMemo(
        () => prepareHubToolsData(toolsData, popularToolOrder),
        [toolsData, popularToolOrder],
    );

    const handleToolSelect = (tool) => {
        if (tool?.path) {
            navigate(tool.path);
            return;
        }
        console.info("Open tool:", tool);
    };

    return (
        <>
            <section className="tool-hub__intro" aria-labelledby="tool-hub-heading">
                <h1 className="tool-hub__heading-wrap" id="tool-hub-heading">
                    <span className="tool-hub__heading-text">{title}</span>
                    <span aria-hidden="true">
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
                    </span>
                </h1>

                <p className="tool-hub__subheading">{subheading}</p>

                <div className="tool-hub__search-wrap">
                    <SearchBar
                        categories={displayToolsData}
                        onSelect={handleToolSelect}
                    />
                </div>

                <p className="tool-hub__badges">No account needed · Browser tools</p>
            </section>

            <details className="tool-hub__category-jump">
            <summary className="cursor-target">Browse all categories</summary>
            <nav className="tool-hub__categories" aria-label="Jump to category">
                {displayToolsData.map((category) => <a className="cursor-target" key={category.id} href={`#${category.id}`}>{category.name}</a>)}
            </nav>
            </details>

            <section
                className="tool-hub__body tool-hub__grid"
                aria-label="Tool categories"
            >
                {displayToolsData.map((category) => (
                    <div key={category.id} className="tool-category">
                        <h2 className="tool-category__title" id={category.id}>{category.name}</h2>
                        <div className="tool-category__grid">
                            {category.tools.map((tool) => (
                                <ToolButton
                                    key={tool.id}
                                    name={tool.name}
                                    isPopular={Boolean(tool.isPopular)}
                                    to={tool.path}
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
