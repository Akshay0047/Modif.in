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
    const [dateInput, setDateInput] = useState("");

    const fromTimestamp = useMemo(
        () => safeExecute("timestamp", () => timestampToDate(timestampInput).toISOString()),
        [timestampInput],
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
                    <label className="text-tool-label" htmlFor="timestamp-input">
                        Unix timestamp
                    </label>
                    <input
                        id="timestamp-input"
                        className="text-tool-input"
                        value={timestampInput}
                        onChange={(event) => setTimestampInput(event.target.value)}
                        placeholder="1710000000 or 1710000000000"
                    />
                    <div className="text-tool-output-header" style={{ marginTop: "1rem" }}>
                        <h2 className="text-tool-section-title">Date output</h2>
                        <CopyButton
                            text={fromTimestamp.ok ? fromTimestamp.value : ""}
                            disabled={!fromTimestamp.ok}
                        />
                    </div>
                    {fromTimestamp.error ? (
                        <p className="text-tool-empty">{fromTimestamp.error}</p>
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
                        <p className="text-tool-empty">{fromDate.error}</p>
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
