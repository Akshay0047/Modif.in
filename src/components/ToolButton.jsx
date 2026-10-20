import { Link } from "react-router-dom";
import "./ToolButton.css";

function ToolButton({ name, isPopular = false, to }) {
    return (
        <Link to={to} className={`tool-button cursor-target${isPopular ? " highlighted" : ""}`}>
            <span className="tool-button__title">{name}</span>
        </Link>
    );
}

export default ToolButton;
