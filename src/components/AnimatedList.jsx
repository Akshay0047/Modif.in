import { motion, useReducedMotion } from "motion/react";
import SuggestionList from "./SuggestionList";

// The combobox input owns focus and keyboard behavior; this list only renders options.
function AnimatedList({ id, items = [], selectedIndex = -1, onActiveChange, onItemSelect, itemClassName = "" }) {
    const reducedMotion = useReducedMotion();

    return (
        <SuggestionList
            id={id}
            items={items}
            selectedIndex={selectedIndex}
            onActiveChange={onActiveChange}
            onItemSelect={onItemSelect}
            itemClassName={itemClassName}
            Item={motion.div}
            itemAnimation={{
                initial: reducedMotion ? false : { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.15 },
            }}
        />
    );
}

export default AnimatedList;
