import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { KAOMOJI_CATEGORIES } from "../_shared/symbolData";

function AsciiKaomoji() {
    const [activeCategory, setActiveCategory] = useState("ascii");
    const [query, setQuery] = useState("");

    const category = KAOMOJI_CATEGORIES.find((entry) => entry.id === activeCategory);

    const filteredItems = useMemo(() => {
        if (!category) return [];
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return category.items;

        return category.items.filter(
            (item) =>
                item.label.toLowerCase().includes(normalizedQuery) ||
                item.value.toLowerCase().includes(normalizedQuery),
        );
    }, [category, query]);

    return (
        <TextToolShell
            title="ASCII & Kaomoji"
            description="Browse ASCII emojis, kaomoji, and emoticons as one-line copyable expressions."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label className="text-tool-label" htmlFor="ascii-kaomoji-search">
                    Search expressions
                </label>
                <input
                    id="ascii-kaomoji-search"
                    className="text-tool-input text-tool-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by label or expression…"
                />

                <div className="text-tool-controls">
                    {KAOMOJI_CATEGORIES.map((entry) => (
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
                <h2 className="text-tool-section-title">
                    {category?.label ?? "Expressions"}
                </h2>
                {filteredItems.length === 0 ? (
                    <p className="text-tool-empty">No matching expressions found.</p>
                ) : (
                    <div className="text-tool-expression-grid">
                        {filteredItems.map((item) => (
                            <div
                                key={`${item.label}-${item.value}`}
                                className="text-tool-expression-card"
                            >
                                <span className="text-tool-expression-card__label">
                                    {item.label}
                                </span>
                                <span className="text-tool-expression-card__value">
                                    {item.value}
                                </span>
                                <div style={{ marginTop: "0.75rem" }}>
                                    <CopyButton text={item.value} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </TextToolShell>
    );
}

export default AsciiKaomoji;
