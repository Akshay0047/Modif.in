import { useLocation, useNavigate } from "react-router-dom";
import { canGoBack, fallbackPath } from "./backNavigation";
import "./BackButton.css";

function BackButton() {
    const navigate = useNavigate();
    const location = useLocation();

    const goBack = () => {
        if (canGoBack(window.history.state)) {
            navigate(-1);
            return;
        }
        navigate(fallbackPath(location.pathname));
    };

    return (
        <button
            type="button"
            className="back-button cursor-target"
            onClick={goBack}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            Back
        </button>
    );
}

export default BackButton;
