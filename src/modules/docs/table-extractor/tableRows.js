import { toCsv } from "../_shared/csvUtils.js";

function columnPositionsFor(textItems) {
    const positions = [];
    [...textItems].sort((a, b) => a.x - b.x).forEach((cell) => {
        const existing = positions.find((x) => Math.abs(x - cell.x) < 15);
        if (existing === undefined) positions.push(cell.x);
    });
    return positions;
}

export function groupIntoTable(textItems, columnPositions = columnPositionsFor(textItems)) {
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
    const columnPositions = columnPositionsFor(pages.flat());
    const tables = pages.map((items) => groupIntoTable(items, columnPositions));
    const width = columnPositions.length;

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
