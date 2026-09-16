import { useNavigate } from "react-router-dom";
import "./BackButton.css";

function BackButton() {
    const navigate = useNavigate();

    return (
        <button
            type="button"
            className="back-button cursor-target"
            onClick={() => navigate(-1)}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            Back
        </button>
    );
}

export default BackButton;
