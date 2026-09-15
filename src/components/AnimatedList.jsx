import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useInView } from "motion/react";
import "./AnimatedList.css";

const AnimatedItem = ({
    children,
    delay = 0,
    index,
    onMouseEnter,
    onClick,
}) => {
    const ref = useRef(null);
    const inView = useInView(ref, { amount: 0.5, triggerOnce: false });

    return (
        <motion.div
            ref={ref}
            data-index={index}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={
                inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }
            }
            transition={{ duration: 0.2, delay }}
            style={{ marginBottom: "0.5rem", cursor: "pointer" }}
        >
            {children}
        </motion.div>
    );
};

function AnimatedList({
    items = [],
    onItemSelect,
    showGradients = true,
    enableArrowNavigation = true,
    className = "",
    itemClassName = "",
    displayScrollbar = true,
    initialSelectedIndex = -1,
}) {
    const listRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
    const [keyboardNav, setKeyboardNav] = useState(false);
    const [topGradientOpacity, setTopGradientOpacity] = useState(0);
    const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

    const handleItemMouseEnter = useCallback((index) => {
        setSelectedIndex(index);
    }, []);

    const handleItemClick = useCallback(
        (item, index) => {
            setSelectedIndex(index);
            onItemSelect?.(item, index);
        },
        [onItemSelect],
    );

    const handleScroll = useCallback((event) => {
        const { scrollTop, scrollHeight, clientHeight } = event.target;
        setTopGradientOpacity(Math.min(scrollTop / 50, 1));
        const bottomDistance = scrollHeight - (scrollTop + clientHeight);
        setBottomGradientOpacity(
            scrollHeight <= clientHeight
                ? 0
                : Math.min(bottomDistance / 50, 1),
        );
    }, []);

    useEffect(() => {
        if (!enableArrowNavigation) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
                event.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
            } else if (
                event.key === "ArrowUp" ||
                (event.key === "Tab" && event.shiftKey)
            ) {
                event.preventDefault();
                setKeyboardNav(true);
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (event.key === "Enter") {
                if (selectedIndex >= 0 && selectedIndex < items.length) {
                    event.preventDefault();
                    onItemSelect?.(items[selectedIndex], selectedIndex);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

    useEffect(() => {
        if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;

        const container = listRef.current;
        const selectedItem = container.querySelector(
            `[data-index="${selectedIndex}"]`,
        );
        if (!selectedItem) return;

        const extraMargin = 50;
        const containerScrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const itemTop = selectedItem.offsetTop;
        const itemBottom = itemTop + selectedItem.offsetHeight;

        if (itemTop < containerScrollTop + extraMargin) {
            container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
        } else if (
            itemBottom >
            containerScrollTop + containerHeight - extraMargin
        ) {
            container.scrollTo({
                top: itemBottom - containerHeight + extraMargin,
                behavior: "smooth",
            });
        }

        setKeyboardNav(false);
    }, [selectedIndex, keyboardNav]);

    if (items.length === 0) return null;

    return (
        <div className={`scroll-list-container ${className}`.trim()}>
            <div
                ref={listRef}
                className={`scroll-list ${displayScrollbar ? "" : "no-scrollbar"}`.trim()}
                onScroll={handleScroll}
            >
                {items.map((item, index) => (
                    <AnimatedItem
                        key={`${item}-${index}`}
                        delay={0.05}
                        index={index}
                        onMouseEnter={() => handleItemMouseEnter(index)}
                        onClick={() => handleItemClick(item, index)}
                    >
                        <div
                            className={`item ${selectedIndex === index ? "selected" : ""} ${itemClassName}`.trim()}
                        >
                            <p className="item-text">{item}</p>
                        </div>
                    </AnimatedItem>
                ))}
            </div>
            {showGradients ? (
                <>
                    <div
                        className="top-gradient"
                        style={{ opacity: topGradientOpacity }}
                    />
                    <div
                        className="bottom-gradient"
                        style={{ opacity: bottomGradientOpacity }}
                    />
                </>
            ) : null}
        </div>
    );
}

export default AnimatedList;
