import "./ToolButton.css";

function ToolButton({
    name,
    featured = false,
    highlighted = false,
    isPopular = false,
    onClick,
}) {
    const isHighlighted = Boolean(featured || highlighted || isPopular);

    return (
        <button
            type="button"
            className={`tool-button cursor-target${isHighlighted ? " highlighted" : ""}`}
            onClick={onClick}
        >
            {isHighlighted && (
                <div className="tool-button__badge">Popular</div>
            )}
            {name}
        </button>
    );
}

export default ToolButton;
