import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/FileDropZone";
import { dedupeRows, filterRows, parseCsv, toCsv } from "../_shared/csvUtils";
import { downloadBlob } from "../_shared/downloadUtils";

function CsvEditorTransformer() {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [search, setSearch] = useState("");
    const [dedupeKey, setDedupeKey] = useState("");
    const [status, setStatus] = useState("");

    const filtered = useMemo(() => {
        let rows = data;
        if (search) rows = filterRows(rows, search);
        if (dedupeKey) rows = dedupeRows(rows, dedupeKey);
        return rows;
    }, [data, search, dedupeKey]);

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) {
            setData([]);
            setHeaders([]);
            return;
        }
        const text = await file.text();
        const parsed = parseCsv(text);
        setData(parsed);
        setHeaders(Object.keys(parsed[0] ?? {}));
        setStatus(`Loaded ${parsed.length} rows.`);
    };

    const moveColumn = (index, direction) => {
        const next = [...headers];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        setHeaders(next);
    };

    const handleExport = () => {
        const rows = filtered.map((row) => {
            const ordered = {};
            headers.forEach((key) => {
                ordered[key] = row[key];
            });
            return ordered;
        });
        const csv = toCsv(rows);
        downloadBlob(new Blob([csv], { type: "text/csv" }), "transformed.csv");
        setStatus("CSV exported successfully.");
    };

    return (
        <DocToolShell
            title="CSV Editor & Transformer"
            description="Filter, search, deduplicate, and reorder columns before exporting."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone
                    accept=".csv,text/csv"
                    onFiles={handleFile}
                    label="Drop a CSV file"
                />

                {headers.length > 0 ? (
                    <>
                        <div className="doc-tool-grid doc-tool-grid--2" style={{ marginTop: "1rem" }}>
                            <div>
                                <label htmlFor="csv-row-search" className="doc-tool-label">Search rows</label>
                                <input id="csv-row-search"
                                    className="doc-tool-input cursor-target"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Filter by value…"
                                />
                            </div>
                            <div>
                                <label htmlFor="csv-dedupe-column" className="doc-tool-label">Dedupe by column</label>
                                <select id="csv-dedupe-column"
                                    className="doc-tool-select cursor-target"
                                    value={dedupeKey}
                                    onChange={(e) => setDedupeKey(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {headers.map((h) => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="doc-tool-controls" style={{ marginTop: "1rem" }}>
                            <span className="doc-tool-status">{filtered.length} rows shown</span>
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={handleExport}
                            >
                                Export CSV
                            </button>
                        </div>

                        <div className="doc-tool-controls" style={{ marginTop: "0.5rem" }}>
                            {headers.map((header, index) => (
                                <span key={header} style={{ display: "flex", gap: "0.25rem" }}>
                                    <button
                                        type="button"
                                        className="doc-tool-button cursor-target"
                                        onClick={() => moveColumn(index, -1)}
                                    >
                                        ← {header}
                                    </button>
                                    <button
                                        type="button"
                                        className="doc-tool-button cursor-target"
                                        onClick={() => moveColumn(index, 1)}
                                    >
                                        →
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className="doc-tool-table-wrap" style={{ marginTop: "1rem" }}>
                            <table className="doc-tool-table">
                                <thead>
                                    <tr>
                                        {headers.map((h) => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.slice(0, 100).map((row, i) => (
                                        <tr key={i}>
                                            {headers.map((h) => <td key={h}>{row[h]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length > 100 ? (
                                <p className="doc-tool-status">Showing first 100 of {filtered.length} rows</p>
                            ) : null}
                        </div>
                    </>
                ) : null}

                {status ? <p className="doc-tool-status">{status}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default CsvEditorTransformer;
