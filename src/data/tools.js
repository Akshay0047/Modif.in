export { imageToolsData } from "./imageTools.js";
export { textToolsData } from "./textTools.js";
export { docToolsData } from "./docTools.js";

export function flattenTools(categories = []) {
    return categories.flatMap((category) =>
        category.tools.map((tool) => ({
            ...tool,
            category: tool.category ?? category.name,
            categoryId: category.id,
            searchLabel: `${tool.category ?? category.name} : ${tool.name}`,
        })),
    );
}

export function filterTools(query, categories = []) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return flattenTools(categories).filter(
        (tool) =>
            tool.name.toLowerCase().includes(normalized) ||
            tool.category.toLowerCase().includes(normalized) ||
            tool.searchLabel.toLowerCase().includes(normalized),
    );
}
