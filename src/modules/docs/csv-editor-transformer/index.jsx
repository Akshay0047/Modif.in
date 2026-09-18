import { useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import DocToolShell from "../_shared/DocToolShell";
import FileDropZone from "../_shared/components/FileDropZone";
import { downloadText } from "../_shared/downloadUtils";
import { getBaseName, readFileAsText } from "../_shared/fileUtils";
import { parseCsv, unparseCsv } from "../_shared/csvUtils";

function CsvEditorTransformer() {
    const [rows, setRows] = useState([]);
    const [columns, setColumns] = useState([]);
    const [filename, setFilename] = useState("");
    const [search, setSearch] = useState("");
    const [filterColumn, setFilterColumn] = useState("");
    const [filterValue, setFilterValue] = useState("");
    const [error, setError] = useState("");

    const handleFile = async (files) => {
        const file = files[0];
        if (!file) return;
        setError("");
        try {
            const text = await readFileAsText(file);
            const parsed = parseCsv(text);
            setRows(parsed);
            setColumns(parsed.length ? Object.keys(parsed[0]) : []);
            setFilename(getBaseName(file.name));
        } catch (parseError) {
            setError(parseError instanceof Error ? parseError.message : "Failed to parse CSV.");
        }
    };

    const filteredRows = useMemo(() => {
        let result = rows;
        if (filterColumn && filterValue) {
            result = result.filter((row) =>
                String(row[filterColumn] ?? "")
                    .toLowerCase()
                    .includes(filterValue.toLowerCase()),
            );
        }
        if (search) {
            const query = search.toLowerCase();
            result = result.filter((row) =>
                Object.values(row).some((value) => String(value).toLowerCase().includes(query)),
            );
        }
        return result;
    }, [rows, filterColumn, filterValue, search]);

    const removeDuplicates = () => {
        const seen = new Set();
        setRows((current) =>
            current.filter((row) => {
                const key = JSON.stringify(row);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }),
        );
    };

    const moveColumn = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= columns.length) return;
        setColumns((current) => {
            const next = [...current];
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
        setRows((current) =>
            current.map((row) => {
                const reordered = {};
                const nextColumns = [...columns];
                [nextColumns[index], nextColumns[target]] = [nextColumns[target], nextColumns[index]];
                nextColumns.forEach((key) => {
                    reordered[key] = row[key];
                });
                return reordered;
            }),
        );
    };

    const exportCsv = () => {
        const ordered = filteredRows.map((row) => {
            const entry = {};
            columns.forEach((key) => {
                entry[key] = row[key];
            });
            return entry;
        });
        downloadText(unparseCsv(ordered), `${filename || "export"}-edited.csv`, "text/csv");
    };

    return (
        <DocToolShell
            title="CSV Editor & Transformer"
            description="Filter, search, reorder columns, and remove duplicate rows before exporting CSV."
            leading={<BackButton />}
        >
            <div className="doc-tool-panel">
                <FileDropZone accept=".csv,text/csv" label="Drop a CSV file here" onFiles={handleFile} />

                {rows.length ? (
                    <>
                        <div className="doc-tool-grid doc-tool-grid--3" style={{ marginTop: "1rem" }}>
                            <div>
                                <label className="doc-tool-label" htmlFor="csv-search">Search</label>
                                <input
                                    id="csv-search"
                                    className="doc-tool-input cursor-target"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search all columns"
                                />
                            </div>
                            <div>
                                <label className="doc-tool-label" htmlFor="filter-column">Filter column</label>
                                <select
                                    id="filter-column"
                                    className="doc-tool-select cursor-target"
                                    value={filterColumn}
                                    onChange={(event) => setFilterColumn(event.target.value)}
                                >
                                    <option value="">All</option>
                                    {columns.map((column) => (
                                        <option key={column} value={column}>{column}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="doc-tool-label" htmlFor="filter-value">Filter value</label>
                                <input
                                    id="filter-value"
                                    className="doc-tool-input cursor-target"
                                    value={filterValue}
                                    onChange={(event) => setFilterValue(event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="doc-tool-controls">
                            <button type="button" className="doc-tool-button cursor-target" onClick={removeDuplicates}>
                                Remove duplicates
                            </button>
                            <button
                                type="button"
                                className="doc-tool-button doc-tool-button--primary cursor-target"
                                onClick={exportCsv}
                            >
                                Export CSV
                            </button>
                        </div>

                        <div className="doc-tool-controls">
                            {columns.map((column, index) => (
                                <span key={column} style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center" }}>
                                    <span className="doc-tool-status">{column}</span>
                                    <button
                                        type="button"
                                        className="doc-tool-button cursor-target"
                                        onClick={() => moveColumn(index, -1)}
                                    >
                                        ←
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

                        <div className="doc-tool-table-wrap">
                            <table className="doc-tool-table">
                                <thead>
                                    <tr>
                                        {columns.map((column) => <th key={column}>{column}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.slice(0, 100).map((row, index) => (
                                        <tr key={index}>
                                            {columns.map((column) => (
                                                <td key={column}>{row[column]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredRows.length > 100 ? (
                            <p className="doc-tool-status">Showing first 100 of {filteredRows.length} rows.</p>
                        ) : (
                            <p className="doc-tool-status">{filteredRows.length} rows shown.</p>
                        )}
                    </>
                ) : null}

                {error ? <p className="doc-tool-error">{error}</p> : null}
            </div>
        </DocToolShell>
    );
}

export default CsvEditorTransformer;
