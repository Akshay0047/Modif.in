import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import CopyButton from "../_shared/CopyButton";
import TextToolShell from "../_shared/TextToolShell";
import {
    dateToTimestamps,
    safeExecute,
    timestampToDate,
} from "../_shared/developerUtils";

function TimestampConverter() {
    const [timestampInput, setTimestampInput] = useState("");
    const [timestampUnit, setTimestampUnit] = useState("seconds");
    const [dateInput, setDateInput] = useState("");

    const fromTimestamp = useMemo(
        () => safeExecute("timestamp", () => timestampToDate(timestampInput, timestampUnit).toISOString()),
        [timestampInput, timestampUnit],
    );

    const fromDate = useMemo(
        () => safeExecute("date", () => JSON.stringify(dateToTimestamps(dateInput), null, 2)),
        [dateInput],
    );

    return (
        <TextToolShell
            title="Timestamp Converter"
            description="Convert Unix timestamps to ISO dates and back again."
            leading={<BackButton />}
        >
            <div className="text-tool-grid text-tool-grid--2">
                <div className="text-tool-panel">
                    <div className="text-tool-controls" role="group" aria-label="Timestamp unit">
                        {["seconds", "milliseconds"].map((unit) => (
                            <button
                                key={unit}
                                type="button"
                                className={`text-tool-button cursor-target${timestampUnit === unit ? " is-active" : ""}`}
                                aria-pressed={timestampUnit === unit}
                                onClick={() => setTimestampUnit(unit)}
                            >
                                {unit === "seconds" ? "Seconds" : "Milliseconds"}
                            </button>
                        ))}
                    </div>
                    <label className="text-tool-label" htmlFor="timestamp-input">
                        Unix timestamp ({timestampUnit})
                    </label>
                    <input
                        id="timestamp-input"
                        className="text-tool-input"
                        value={timestampInput}
                        onChange={(event) => setTimestampInput(event.target.value)}
                        placeholder={timestampUnit === "seconds" ? "1710000000" : "999999999999"}
                        aria-invalid={Boolean(fromTimestamp.error)}
                        aria-describedby={fromTimestamp.error ? "timestamp-error" : undefined}
                    />
                    <div className="text-tool-output-header" style={{ marginTop: "1rem" }}>
                        <h2 className="text-tool-section-title">Date output</h2>
                        <CopyButton
                            text={fromTimestamp.ok ? fromTimestamp.value : ""}
                            disabled={!fromTimestamp.ok}
                        />
                    </div>
                    {fromTimestamp.error ? (
                        <p id="timestamp-error" className="text-tool-empty" role="alert">{fromTimestamp.error}</p>
                    ) : (
                        <textarea
                            className="text-tool-textarea"
                            value={fromTimestamp.value}
                            readOnly
                            aria-label="Converted date"
                        />
                    )}
                </div>

                <div className="text-tool-panel">
                    <label className="text-tool-label" htmlFor="date-input">
                        Date / time
                    </label>
                    <input
                        id="date-input"
                        aria-invalid={Boolean(fromDate.error)}
                        aria-describedby={fromDate.error ? "date-input-error" : undefined}
                        className="text-tool-input"
                        value={dateInput}
                        onChange={(event) => setDateInput(event.target.value)}
                        placeholder="2026-09-16T12:00:00.000Z"
                    />
                    <div className="text-tool-output-header" style={{ marginTop: "1rem" }}>
                        <h2 className="text-tool-section-title">Timestamp output</h2>
                        <CopyButton
                            text={fromDate.ok ? fromDate.value : ""}
                            disabled={!fromDate.ok}
                        />
                    </div>
                    {fromDate.error ? (
                        <p id="date-input-error" className="text-tool-empty" role="alert">{fromDate.error}</p>
                    ) : (
                        <textarea
                            className="text-tool-textarea"
                            value={fromDate.value}
                            readOnly
                            aria-label="Converted timestamps"
                        />
                    )}
                </div>
            </div>
        </TextToolShell>
    );
}

export default TimestampConverter;
