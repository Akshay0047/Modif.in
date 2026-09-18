const ROW_TOLERANCE = 4;
const COL_TOLERANCE = 8;

function clusterValues(values, tolerance) {
    if (!values.length) return [];
    const sorted = [...values].sort((a, b) => a - b);
    const clusters = [[sorted[0]]];

    for (let index = 1; index < sorted.length; index += 1) {
        const value = sorted[index];
        const cluster = clusters[clusters.length - 1];
        if (value - cluster[cluster.length - 1] <= tolerance) {
            cluster.push(value);
        } else {
            clusters.push([value]);
        }
    }

    return clusters.map((cluster) => cluster.reduce((sum, value) => sum + value, 0) / cluster.length);
}

function nearestIndex(value, anchors) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    anchors.forEach((anchor, index) => {
        const distance = Math.abs(anchor - value);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });
    return bestIndex;
}

export function detectTableFromTextItems(items) {
    if (!items.length) return { headers: [], rows: [] };

    const rowAnchors = clusterValues(items.map((item) => item.y), ROW_TOLERANCE);
    const colAnchors = clusterValues(items.map((item) => item.x), COL_TOLERANCE);

    const grid = new Map();
    items.forEach((item) => {
        const row = nearestIndex(item.y, rowAnchors);
        const col = nearestIndex(item.x, colAnchors);
        const key = `${row}:${col}`;
        grid.set(key, `${grid.get(key) ?? ""}${item.text}`.trim());
    });

    const maxRow = Math.max(...rowAnchors.map((_, index) => index));
    const maxCol = Math.max(...colAnchors.map((_, index) => index));
    const matrix = [];

    for (let row = 0; row <= maxRow; row += 1) {
        const cells = [];
        for (let col = 0; col <= maxCol; col += 1) {
            cells.push(grid.get(`${row}:${col}`) ?? "");
        }
        matrix.push(cells);
    }

    const nonEmptyRows = matrix.filter((row) => row.some((cell) => cell.trim()));
    if (!nonEmptyRows.length) return { headers: [], rows: [] };

    const [header, ...rows] = nonEmptyRows;
    return { headers: header, rows };
}

export function tableToCsv(headers, rows) {
    const escape = (value) => {
        const text = String(value ?? "");
        if (text.includes(",") || text.includes('"') || text.includes("\n")) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };

    const lines = [
        headers.map(escape).join(","),
        ...rows.map((row) => row.map(escape).join(",")),
    ];
    return lines.join("\n");
}
