import { useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import useGeneratedResult from "../_shared/useGeneratedResult";
import { generateFakeData } from "../_shared/generatorUtils";

const DATA_TYPES = [
    { id: "name", label: "Names" },
    { id: "email", label: "Emails" },
    { id: "phone", label: "Phone numbers" },
    { id: "address", label: "Addresses" },
    { id: "company", label: "Companies" },
    { id: "date", label: "Dates" },
];

function generateRecords(type, count) {
    return Array.from({ length: count }, () => generateFakeData(type)).join("\n");
}

function FakeDataGenerator() {
    const [type, setType] = useState("name");
    const [count, setCount] = useState(5);

    const result = useGeneratedResult(generateRecords, [type, count]);

    const output = result.ok ? result.value : "";

    return (
        <TextToolShell
            title="Fake Data Generator"
            description="Generate sample names, emails, phone numbers, addresses, companies, and dates."
            leading={<BackButton />}
        >
            <div className="text-tool-panel">
                <h2 className="text-tool-section-title">Data type</h2>
                <div className="text-tool-controls">
                    {DATA_TYPES.map((entry) => (
                        <button aria-pressed={type === entry.id}
                            key={entry.id}
                            type="button"
                            className={`text-tool-button cursor-target${
                                type === entry.id ? " is-active" : ""
                            }`}
                            onClick={() => setType(entry.id)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>

                <label className="text-tool-label" htmlFor="fake-data-count">
                    Number of records: {count}
                </label>
                <input
                    id="fake-data-count"
                    className="text-tool-range"
                    type="range"
                    min={1}
                    max={25}
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                />

                <div className="text-tool-controls">
                    <button
                        type="button"
                        className="text-tool-button cursor-target"
                        onClick={result.regenerate}
                    >
                        Regenerate
                    </button>
                </div>
            </div>

            <div className="text-tool-panel">
                <div className="text-tool-output-header">
                    <h2 className="text-tool-section-title">Generated fake data</h2>
                    <CopyButton text={output} disabled={!result.ok} />
                </div>
                {result.error ? <p className="text-tool-empty" role="alert">{result.error}</p> : null}
                <textarea
                    className="text-tool-textarea"
                    value={output}
                    readOnly
                    aria-label="Generated fake data"
                />
            </div>
        </TextToolShell>
    );
}

export default FakeDataGenerator;
