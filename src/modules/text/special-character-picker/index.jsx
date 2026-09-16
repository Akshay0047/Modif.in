import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { SPECIAL_CHARACTER_CATEGORIES } from "../_shared/symbolData";

function SpecialCharacterPicker() {
    const [activeCategory, setActiveCategory] = useState("accented");
    const [query, setQuery] = useState("");
    const [selectedChar, setSelectedChar] = useState("");

    const category = SPECIAL_CHARACTER_CATEGORIES.find(
        (entry) => entry.id === activeCategory,
    );

    const filteredSymbols = useMemo(() => {
        if (!category) return [];
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return category.symbols;

        return category.symbols.filter(
            (symbol) =>
                symbol.name.toLowerCase().includes(normalizedQuery) ||
                symbol.char.includes(normalizedQuery),
        );
    }, [category, query]);

    return (
        <TextToolShell
            title="Special Character Picker"
            description="Pick accented letters, typographic characters, quotes, dashes, and more."
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
                    placeholder="Search by name or character…"
                />

                <div className="text-tool-controls">
                    {SPECIAL_CHARACTER_CATEGORIES.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                activeCategory === entry.id ? " is-active" : ""
                            }`}
                            onClick={() => setActiveCategory(entry.id)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">
                        {category?.label ?? "Characters"}
                    </h2>
                    <CopyButton text={selectedChar} label="Copy selected" />
                </div>

                {filteredSymbols.length === 0 ? (
                    <p className="text-tool-empty">No matching characters found.</p>
                ) : (
                    <div className="text-tool-symbol-grid">
                        {filteredSymbols.map((symbol) => (
                            <button
                                key={`${symbol.char}-${symbol.name}`}
                                type="button"
                                className={`text-tool-symbol-button cursor-target${
                                    selectedChar === symbol.char
                                        ? " is-selected"
                                        : ""
                                }`}
                                title={symbol.name}
                                onClick={() => setSelectedChar(symbol.char)}
                            >
                                {symbol.char}
                            </button>
                        ))}
                    </div>
                )}

                {selectedChar ? (
                    <p className="text-tool-hint" style={{ marginTop: "0.75rem" }}>
                        Selected: {selectedChar}
                    </p>
                ) : null}
            </div>
        </TextToolShell>
    );
}

export default SpecialCharacterPicker;
