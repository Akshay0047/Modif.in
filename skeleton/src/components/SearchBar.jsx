import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedList from "./AnimatedList";
import { filterTools } from "../data/tools";
import "./SearchBar.css";

function SearchBar({ categories, onSelect }) {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const rootRef = useRef(null);

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

    return (
        <div className="search-bar" ref={rootRef}>
            <label className="search-bar__label" htmlFor="tool-search">
                Search tools
            </label>
            <input
                id="tool-search"
                className="search-bar__input"
                type="search"
                value={query}
                placeholder="Search category or component…"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsFocused(true)}
            />
            {showResults ? (
                resultLabels.length > 0 ? (
                    <AnimatedList
                        items={resultLabels}
                        onItemSelect={handleSelect}
                        enableArrowNavigation
                        showGradients
                    />
                ) : (
                    <div className="search-bar__empty" role="status">
                        No matching tools found.
                    </div>
                )
            ) : null}
        </div>
    );
}

export default SearchBar;
