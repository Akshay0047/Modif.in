import { useEffect, useRef } from "react";
import "./AnimatedList.css";

// Keep results immediately available while their optional animation loads.
// The combobox input owns focus and keyboard behavior for both presentations.
export default function SuggestionList({ id, items = [], selectedIndex = -1, onActiveChange, onItemSelect, itemClassName = "", Item = "div", itemAnimation }) {
    const listRef = useRef(null);

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    return (
        <div className="scroll-list-container">
            <div id={id} role="listbox" tabIndex={-1} aria-label="Matching tools" className="scroll-list" ref={listRef}>
                {items.map((item, index) => (
                    <Item
                        key={item}
                        id={`${id}-option-${index}`}
                        role="option"
                        aria-selected={selectedIndex === index}
                        data-index={index}
                        className={`item ${selectedIndex === index ? "selected" : ""} ${itemClassName}`.trim()}
                        onMouseEnter={() => onActiveChange?.(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onItemSelect?.(item, index)}
                        {...itemAnimation}
                    >
                        <p className="item-text">{item}</p>
                    </Item>
                ))}
            </div>
        </div>
    );
}
