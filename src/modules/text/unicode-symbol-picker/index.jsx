import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { UNICODE_SYMBOL_CATEGORIES } from "../_shared/symbolData";

function UnicodeSymbolPicker() {
    const [activeCategory, setActiveCategory] = useState("arrows");
    const [query, setQuery] = useState("");
    const [selectedChar, setSelectedChar] = useState("");

    const category = UNICODE_SYMBOL_CATEGORIES.find(
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
            title="Unicode Symbol Picker"
            description="Pick arrows, math symbols, currency signs, Greek letters, shapes, and more."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="unicode-symbol-picker-search"
                >
                    Search symbols
                </label>
                <input
                    id="unicode-symbol-picker-search"
                    className="text-tool-input text-tool-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or symbol…"
                />

                <div className="text-tool-controls">
                    {UNICODE_SYMBOL_CATEGORIES.map((entry) => (
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
                        {category?.label ?? "Symbols"}
                    </h2>
                    <CopyButton text={selectedChar} label="Copy selected" />
                </div>

                {filteredSymbols.length === 0 ? (
                    <p className="text-tool-empty">No matching symbols found.</p>
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
                        Selected: {selectedChar} — click a symbol to select, then
                        copy.
                    </p>
                ) : null}
            </div>
        </TextToolShell>
    );
}

export default UnicodeSymbolPicker;
