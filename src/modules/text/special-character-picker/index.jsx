import { useMemo, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyStatusLabel from "../_shared/CopyStatusLabel";
import TextToolShell from "../_shared/TextToolShell";
import {
    SPECIAL_CHARACTER_CATEGORIES,
    getSpecialCharacterCount,
    getSpecialCharacterSymbols,
} from "../_shared/specialCharacterData";

function filterSymbols(symbols, query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return symbols;

    return symbols.filter(
        (symbol) =>
            symbol.name.toLowerCase().includes(normalizedQuery) ||
            symbol.char.toLowerCase().includes(normalizedQuery),
    );
}

function CharacterGrid({ symbols, selectedChar, onSelect }) {
    return (
        <div className="text-tool-character-grid">
            {symbols.map((symbol) => (
                <button
                    key={`${symbol.char}-${symbol.name}`}
                    type="button"
                    className={`text-tool-character-card cursor-target${
                        selectedChar === symbol.char ? " is-selected" : ""
                    }`}
                    title={symbol.name}
                    onClick={() => onSelect(symbol.char)}
                >
                    <span className="text-tool-character-card__char">
                        {symbol.char}
                    </span>
                    <span className="text-tool-character-card__name">
                        {symbol.name}
                    </span>
                </button>
            ))}
        </div>
    );
}

function SpecialCharacterPicker() {
    const [activeCategory, setActiveCategory] = useState("latin-accented-lower");
    const [query, setQuery] = useState("");
    const [selectedChar, setSelectedChar] = useState("");
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    const totalCharacters = useMemo(
        () => getSpecialCharacterCount(),
        [],
    );

    const category = SPECIAL_CHARACTER_CATEGORIES.find(
        (entry) => entry.id === activeCategory,
    );

    const isSearching = query.trim().length > 0;

    const searchResults = useMemo(() => {
        if (!isSearching) return [];

        return SPECIAL_CHARACTER_CATEGORIES.flatMap((entry) => {
            const symbols = filterSymbols(
                getSpecialCharacterSymbols(entry),
                query,
            );

            if (symbols.length === 0) return [];

            return [{ category: entry, symbols }];
        });
    }, [isSearching, query]);

    const filteredCategoryGroups = useMemo(() => {
        if (!category || isSearching) return [];

        return category.groups
            .map((group) => ({
                ...group,
                symbols: filterSymbols(group.symbols, query),
            }))
            .filter((group) => group.symbols.length > 0);
    }, [category, isSearching, query]);

    const handleSymbolClick = async (char) => {
        setSelectedChar(char);

        try {
            await navigator.clipboard.writeText(char);
            setCopied(true);

            if (copyTimeoutRef.current) {
                window.clearTimeout(copyTimeoutRef.current);
            }

            copyTimeoutRef.current = window.setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch {
            setCopied(false);
        }
    };

    const visibleCount = isSearching
        ? searchResults.reduce(
              (total, result) => total + result.symbols.length,
              0,
          )
        : filteredCategoryGroups.reduce(
              (total, group) => total + group.symbols.length,
              0,
          );

    return (
        <TextToolShell
            title="Special Character Picker"
            description={`Browse and copy ${totalCharacters.toLocaleString()} special characters across ${SPECIAL_CHARACTER_CATEGORIES.length} organized categories.`}
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="special-character-picker-search"
                >
                    Search characters
                </label>
                <input
                    id="special-character-picker-search"
                    className="text-tool-input text-tool-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or character across all categories…"
                />

                <div className="text-tool-category-nav">
                    {SPECIAL_CHARACTER_CATEGORIES.map((entry) => {
                        const count = getSpecialCharacterSymbols(entry).length;

                        return (
                            <button
                                key={entry.id}
                                type="button"
                                className={`text-tool-category-chip cursor-target${
                                    !isSearching && activeCategory === entry.id
                                        ? " is-active"
                                        : ""
                                }`}
                                onClick={() => {
                                    setActiveCategory(entry.id);
                                    setQuery("");
                                }}
                            >
                                <span className="text-tool-category-chip__label">
                                    {entry.label}
                                </span>
                                <span className="text-tool-category-chip__count">
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <div>
                        <h2 className="text-tool-section-title">
                            {isSearching
                                ? "Search results"
                                : category?.label ?? "Characters"}
                        </h2>
                        {isSearching ? (
                            <p className="text-tool-hint">
                                {visibleCount.toLocaleString()} matching
                                character{visibleCount === 1 ? "" : "s"} across{" "}
                                {searchResults.length} categor
                                {searchResults.length === 1 ? "y" : "ies"}
                            </p>
                        ) : category?.description ? (
                            <p className="text-tool-hint">{category.description}</p>
                        ) : null}
                    </div>
                    <CopyStatusLabel copied={copied} />
                </div>

                {isSearching ? (
                    searchResults.length === 0 ? (
                        <p className="text-tool-empty">
                            No matching characters found.
                        </p>
                    ) : (
                        <div className="text-tool-character-sections">
                            {searchResults.map((result) => (
                                <section
                                    key={result.category.id}
                                    className="text-tool-character-section"
                                >
                                    <h3 className="text-tool-subsection-title">
                                        {result.category.label}
                                    </h3>
                                    <CharacterGrid
                                        symbols={result.symbols}
                                        selectedChar={selectedChar}
                                        onSelect={handleSymbolClick}
                                    />
                                </section>
                            ))}
                        </div>
                    )
                ) : filteredCategoryGroups.length === 0 ? (
                    <p className="text-tool-empty">No matching characters found.</p>
                ) : (
                    <div className="text-tool-character-sections">
                        {filteredCategoryGroups.map((group) => (
                            <section
                                key={group.label}
                                className="text-tool-character-section"
                            >
                                <h3 className="text-tool-subsection-title">
                                    {group.label}
                                </h3>
                                <CharacterGrid
                                    symbols={group.symbols}
                                    selectedChar={selectedChar}
                                    onSelect={handleSymbolClick}
                                />
                            </section>
                        ))}
                    </div>
                )}

                {selectedChar ? (
                    <p className="text-tool-hint" style={{ marginTop: "0.75rem" }}>
                        Last copied: {selectedChar}
                    </p>
                ) : null}
            </div>
        </TextToolShell>
    );
}

export default SpecialCharacterPicker;
