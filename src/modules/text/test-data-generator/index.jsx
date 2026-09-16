import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import { generateTestData } from "../_shared/generatorUtils";

const TEST_DATA_TYPES = [
    { id: "id", label: "ID" },
    { id: "uuid", label: "UUID" },
    { id: "username", label: "Username" },
    { id: "email", label: "Email" },
    { id: "url", label: "URL" },
    { id: "timestamp", label: "Timestamp" },
    { id: "boolean", label: "Boolean" },
    { id: "status", label: "Status" },
];

function TestDataGenerator() {
    const [selectedTypes, setSelectedTypes] = useState(
        TEST_DATA_TYPES.map((entry) => entry.id),
    );
    const [seed, setSeed] = useState(0);

    const output = useMemo(() => {
        const activeTypes =
            selectedTypes.length > 0
                ? selectedTypes
                : TEST_DATA_TYPES.map((entry) => entry.id);

        return activeTypes
            .map((type) => {
                const label = TEST_DATA_TYPES.find((entry) => entry.id === type)?.label;
                return `${label}: ${generateTestData(type)}`;
            })
            .join("\n");
    }, [selectedTypes, seed]);

    const toggleType = (id) => {
        setSelectedTypes((current) =>
            current.includes(id)
                ? current.filter((entry) => entry !== id)
                : [...current, id],
        );
    };

    return (
        <TextToolShell
            title="Test Data Generator"
            description="Generate simple developer-oriented dummy values for quick testing."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Value types</h2>
                <div className="text-tool-checkbox-grid">
                    {TEST_DATA_TYPES.map((entry) => (
                        <label
                            key={entry.id}
                            className="text-tool-checkbox cursor-target"
                        >
                            <input
                                type="checkbox"
                                checked={selectedTypes.includes(entry.id)}
                                onChange={() => toggleType(entry.id)}
                            />
                            {entry.label}
                        </label>
                    ))}
                </div>

                <div className="text-tool-controls">
                    <button
                        type="button"
                        className="text-tool-button cursor-target"
                        onClick={() => setSeed((value) => value + 1)}
                    >
                        Regenerate
                    </button>
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated test data</h2>
                    <CopyButton text={output} />
                </div>
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated test data"
                />
            </div>
        </TextToolShell>
    );
}

export default TestDataGenerator;
