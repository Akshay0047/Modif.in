import "./ToolButton.css";

function ToolButton({ name, featured = false, onClick }) {
    return (
        <button
            type="button"
            className={`tool-button cursor-target ${featured ? "tool-button--featured" : ""}`.trim()}
            onClick={onClick}
        >
            {name}
        </button>
    );
}

export default ToolButton;
