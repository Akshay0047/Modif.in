import { useMemo, useRef, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyStatusLabel from "../_shared/CopyStatusLabel";
import TextToolShell from "../_shared/TextToolShell";
import { DIVIDER_CATEGORIES } from "../_shared/dividerData";

function SeparatorsDividers() {
    const [activeCategory, setActiveCategory] = useState("simple");
    const [query, setQuery] = useState("");
    const [selectedDivider, setSelectedDivider] = useState("");
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef(null);

    const category = DIVIDER_CATEGORIES.find(
        (entry) => entry.id === activeCategory,
    );

    const filteredDividers = useMemo(() => {
        if (!category) return [];
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return category.dividers;

        return category.dividers.filter(
            (divider) =>
                divider.name.toLowerCase().includes(normalizedQuery) ||
                divider.value.toLowerCase().includes(normalizedQuery),
        );
    }, [category, query]);

    const handleDividerClick = async (value) => {
        setSelectedDivider(value);

        try {
            await navigator.clipboard.writeText(value);
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

    return (
        <TextToolShell
            title="Separators and Dividers"
            description="Copy decorative text dividers for social posts, bios, notes, and messages."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <label
                    className="text-tool-label"
                    htmlFor="separators-dividers-search"
                >
                    Search dividers
                </label>
                <input
                    id="separators-dividers-search"
                    className="text-tool-input text-tool-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or divider text…"
                />

                <div className="text-tool-controls">
                    {DIVIDER_CATEGORIES.map((entry) => (
                        <button aria-pressed={activeCategory === entry.id}
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
                        {category?.label ?? "Dividers"}
                    </h2>
                    <CopyStatusLabel copied={copied} />
                </div>

                {filteredDividers.length === 0 ? (
                    <p className="text-tool-empty">No matching dividers found.</p>
                ) : (
                    <div className="text-tool-divider-grid">
                        {filteredDividers.map((divider) => (
                            <button aria-pressed={selectedDivider === divider.value}
                                key={`${divider.name}-${divider.value}`}
                                type="button"
                                className={`text-tool-divider-card cursor-target${
                                    selectedDivider === divider.value
                                        ? " is-selected"
                                        : ""
                                }`}
                                title={divider.name}
                                onClick={() => handleDividerClick(divider.value)}
                            >
                                <span className="text-tool-divider-card__label">
                                    {divider.name}
                                </span>
                                <span className="text-tool-divider-card__value">
                                    {divider.value}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </TextToolShell>
    );
}

export default SeparatorsDividers;
