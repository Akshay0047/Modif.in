import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import "./AnimatedList.css";

// The combobox input owns focus and keyboard behavior; this list only renders options.
function AnimatedList({ id, items = [], selectedIndex = -1, onActiveChange, onItemSelect, itemClassName = "" }) {
    const listRef = useRef(null);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    return (
        <div className="scroll-list-container">
            <div id={id} role="listbox" aria-label="Matching tools" className="scroll-list" ref={listRef}>
                {items.map((item, index) => (
                    <motion.div
                        key={item}
                        id={`${id}-option-${index}`}
                        role="option"
                        aria-selected={selectedIndex === index}
                        data-index={index}
                        className={`item ${selectedIndex === index ? "selected" : ""} ${itemClassName}`.trim()}
                        onMouseEnter={() => onActiveChange?.(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onItemSelect?.(item, index)}
                        initial={reducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                    >
                        <p className="item-text">{item}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

export default AnimatedList;
