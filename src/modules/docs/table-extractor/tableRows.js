import { toCsv } from "../_shared/csvUtils.js";

export function groupIntoTable(textItems) {
    if (!textItems.length) return [];

    const sorted = [...textItems].sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.x - b.x;
    });

    const rows = [];
    let currentRow = [];
    let currentY = sorted[0]?.y ?? 0;

    for (const item of sorted) {
        if (Math.abs(item.y - currentY) > 8) {
            if (currentRow.length) rows.push(currentRow);
            currentRow = [item];
            currentY = item.y;
        } else {
            currentRow.push(item);
        }
    }
    if (currentRow.length) rows.push(currentRow);

    const columnPositions = [];
    rows.forEach((row) => {
        row.forEach((cell) => {
            const existing = columnPositions.find((x) => Math.abs(x - cell.x) < 15);
            if (existing === undefined) columnPositions.push(cell.x);
        });
    });
    columnPositions.sort((a, b) => a - b);

    return rows.map((row) => {
        const cells = columnPositions.map(() => "");
        row.forEach((cell) => {
            const colIndex = columnPositions.findIndex((x) => Math.abs(x - cell.x) < 15);
            if (colIndex >= 0) {
                cells[colIndex] = cells[colIndex]
                    ? `${cells[colIndex]} ${cell.text}`
                    : cell.text;
            }
        });
        return cells;
    });
}

export function rowsFromPages(pages) {
    const tables = pages.map((items) => groupIntoTable(items));
    const width = tables.reduce(
        (max, table) => Math.max(max, ...table.map((row) => row.length)),
        0,
    );

    return tables.flatMap((table, pageIndex) =>
        table.map((cells) => {
            const row = { Page: String(pageIndex + 1) };
            for (let index = 0; index < width; index += 1) {
                row[`Column ${index + 1}`] = cells[index] ?? "";
            }
            return row;
        }),
    );
}

export function formatExtractedTable(rows, format) {
    if (format === "json") return JSON.stringify(rows ?? [], null, 2);
    return toCsv(rows ?? []);
}
