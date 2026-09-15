import "./ToolButton.css";

function ToolButton({ name, isPopular = false, onClick }) {
    return (
        <button
            type="button"
            className={`tool-button cursor-target${isPopular ? " highlighted" : ""}`}
            onClick={onClick}
        >
            {isPopular ? <div className="tool-button__badge">Popular</div> : null}
            {name}
        </button>
    );
}

export default ToolButton;
