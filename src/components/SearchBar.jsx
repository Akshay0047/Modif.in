import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import SuggestionList from "./SuggestionList";
import { filterTools } from "../data/tools";
import "./SearchBar.css";

let animatedListModule;
const loadAnimatedList = () => animatedListModule ??= import("./AnimatedList")
    .catch(() => ({ default: SuggestionList }));
const AnimatedList = lazy(loadAnimatedList);

function SearchBar({ categories, onSelect, placeholder = "Find a tool by name or category…" }) {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputId = useId();
    const listId = `${inputId}-results`;
    const rootRef = useRef(null);
    const inputRef = useRef(null);

    const matches = useMemo(
        () => filterTools(query, categories),
        [query, categories],
    );

    const resultLabels = useMemo(
        () => matches.map((tool) => tool.searchLabel),
        [matches],
    );

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setIsFocused(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () =>
            document.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    const handleSelect = (label) => {
        const selected = matches.find((tool) => tool.searchLabel === label);
        if (selected) {
            onSelect?.(selected);
        }
        setQuery("");
        setIsFocused(false);
    };

    const showResults = isFocused && query.trim().length > 0;
    const activeIndex = selectedIndex < matches.length ? selectedIndex : -1;

    const listProps = {
        id: listId,
        itemClassName: "search-bar__suggestion-item cursor-target",
        items: resultLabels,
        onItemSelect: handleSelect,
        selectedIndex: activeIndex,
        onActiveChange: setSelectedIndex,
    };

    const handleKeyDown = (event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape" || event.key === "Tab") {
            setIsFocused(false);
            setSelectedIndex(-1);
            if (event.key === "Escape" && showResults) event.preventDefault();
            return;
        }
        if (matches.length && ["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            setIsFocused(true);
            setSelectedIndex((previous) => event.key === "ArrowDown"
                ? (previous + 1) % matches.length
                : (previous <= 0 ? matches.length : previous) - 1);
        } else if (event.key === "Enter" && showResults && activeIndex >= 0) {
            event.preventDefault();
            handleSelect(resultLabels[activeIndex]);
        }
    };

    return (
        <div className="search-bar" ref={rootRef}>
            <label className="search-bar__label" htmlFor={inputId}>
                Search tools
            </label>
            <input
                ref={inputRef}
                id={inputId}
                className="search-bar__input cursor-target"
                type="search"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showResults && matches.length > 0}
                aria-controls={showResults && matches.length ? listId : undefined}
                aria-activedescendant={showResults && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
                value={query}
                name="tool-search"
                placeholder={placeholder}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedIndex(-1);
                    setIsFocused(true);
                }}
                onFocus={() => {
                    setIsFocused(true);
                    void loadAnimatedList();
                }}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
            />
            {query && <button className="search-bar__clear cursor-target" type="button" aria-label="Clear search"
                onClick={() => {
                    setQuery("");
                    setSelectedIndex(-1);
                    inputRef.current?.focus();
                }}><span aria-hidden="true">×</span></button>}
            {showResults ? (
                resultLabels.length > 0 ? (
                    <div className="search-dropdown-menu">
                        <Suspense fallback={<SuggestionList {...listProps} />}>
                            <AnimatedList {...listProps} />
                        </Suspense>
                    </div>
                ) : (
                    <div
                        className="search-dropdown-menu search-dropdown-menu--empty"
                        role="status"
                    >
                        No matching tools found.
                    </div>
                )
            ) : null}
            <span className="search-bar__label" role="status">
                {showResults ? `${matches.length} matching tools` : ""}
            </span>
        </div>
    );
}

export default SearchBar;
