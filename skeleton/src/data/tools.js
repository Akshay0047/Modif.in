/**
 * Subdomain skeleton data — replace ITEM, subheading, categories, and tools
 * when copying this folder for text.modif.in, image.modif.in, or docs.modif.in.
 */
export const siteConfig = {
    itemLabel: "ITEM",
    subheading:
        "Placeholder subheading for this subdomain. Replace with a concise description of the tool suite.",
    homeUrl: "#",
};

export const toolCategories = [
    {
        id: "category",
        name: "Category",
        tools: [
            { id: "component-1", name: "Component 1", featured: true },
            { id: "component-2", name: "Component 2", featured: true },
            { id: "component-3", name: "Component 3", featured: true },
            { id: "component-4", name: "Component 4" },
            { id: "component-5", name: "Component 5" },
            { id: "component-6", name: "Component 6" },
        ],
    },
];

export function flattenTools(categories = toolCategories) {
    return categories.flatMap((category) =>
        category.tools.map((tool) => ({
            ...tool,
            category: category.name,
            categoryId: category.id,
            searchLabel: `${category.name} : ${tool.name}`,
        })),
    );
}

export function filterTools(query, categories = toolCategories) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return flattenTools(categories).filter(
        (tool) =>
            tool.name.toLowerCase().includes(normalized) ||
            tool.category.toLowerCase().includes(normalized) ||
            tool.searchLabel.toLowerCase().includes(normalized),
    );
}
