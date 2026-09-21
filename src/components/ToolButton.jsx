import { useEffect, useRef, useState } from "react";
import "./ToolButton.css";

function ToolButton({ name, isPopular = false, onClick }) {
    const titleRef = useRef(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const element = titleRef.current;
        if (!element) return undefined;

        const updateOverflow = () => {
            setIsOverflowing(element.scrollWidth > element.clientWidth + 1);
        };

        updateOverflow();
        const observer = new ResizeObserver(updateOverflow);
        observer.observe(element);
        return () => observer.disconnect();
    }, [name]);

    return (
        <button
            type="button"
            className={`tool-button cursor-target${isPopular ? " highlighted" : ""}`}
            onClick={onClick}
            title={name}
        >
            {isPopular ? <div className="tool-button__badge">Popular</div> : null}
            <span
                ref={titleRef}
                className={`tool-button__title${isOverflowing ? " is-overflowing" : ""}`}
            >
                <span className="tool-button__title-track">
                    <span>{name}</span>
                    {isOverflowing ? <span aria-hidden="true">{name}</span> : null}
                </span>
            </span>
        </button>
    );
}

export default ToolButton;
