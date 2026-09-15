export function flattenTools(categories = []) {
    return categories.flatMap((category) =>
        category.tools.map((tool) => ({
            ...tool,
            category: category.name,
            categoryId: category.id,
            searchLabel: `${category.name} : ${tool.name}`,
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

function createCategoryTools(prefix) {
    return [
        {
            id: `${prefix}-category-1`,
            name: "Category",
            tools: [
                {
                    id: `${prefix}-component-1`,
                    name: "Component 1",
                    featured: true,
                    highlighted: true,
                },
                {
                    id: `${prefix}-component-2`,
                    name: "Component 2",
                    featured: true,
                    highlighted: true,
                },
                {
                    id: `${prefix}-component-3`,
                    name: "Component 3",
                    featured: true,
                    highlighted: true,
                },
                { id: `${prefix}-component-4`, name: "Component 4" },
                { id: `${prefix}-component-5`, name: "Component 5" },
                { id: `${prefix}-component-6`, name: "Component 6" },
            ],
        },
        {
            id: `${prefix}-category-2`,
            name: "Category",
            tools: [
                {
                    id: `${prefix}-component-7`,
                    name: "Component 7",
                    featured: true,
                    highlighted: true,
                },
                {
                    id: `${prefix}-component-8`,
                    name: "Component 8",
                    featured: true,
                    highlighted: true,
                },
                { id: `${prefix}-component-9`, name: "Component 9" },
                { id: `${prefix}-component-10`, name: "Component 10" },
                { id: `${prefix}-component-11`, name: "Component 11" },
                { id: `${prefix}-component-12`, name: "Component 12" },
            ],
        },
    ];
}

export const imageToolsData = createCategoryTools("image");
export const textToolsData = createCategoryTools("text");
export const docToolsData = createCategoryTools("doc");
