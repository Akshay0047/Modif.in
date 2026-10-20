const POPULAR_TOOLS_CATEGORY_ID = "popular-tools";

function sortToolsPopularFirst(tools = []) {
    return [...tools].sort(
        (left, right) => Number(right.isPopular) - Number(left.isPopular),
    );
}

function orderPopularTools(tools = [], popularToolOrder = []) {
    if (popularToolOrder.length === 0) return tools;

    const orderMap = new Map(
        popularToolOrder.map((toolId, index) => [toolId, index]),
    );

    return [...tools].sort((left, right) => {
        const leftIndex = orderMap.has(left.id)
            ? orderMap.get(left.id)
            : Number.POSITIVE_INFINITY;
        const rightIndex = orderMap.has(right.id)
            ? orderMap.get(right.id)
            : Number.POSITIVE_INFINITY;

        if (leftIndex !== rightIndex) return leftIndex - rightIndex;
        return left.name.localeCompare(right.name);
    });
}

function buildPopularCategory(categories = [], popularToolOrder = []) {
    const seen = new Set();
    const tools = [];

    for (const category of categories) {
        for (const tool of category.tools) {
            if (!tool.isPopular || seen.has(tool.id)) continue;
            seen.add(tool.id);
            tools.push(tool);
        }
    }

    if (tools.length === 0) return null;

    return {
        id: POPULAR_TOOLS_CATEGORY_ID,
        name: "Popular Tools",
        tools: orderPopularTools(tools, popularToolOrder),
    };
}

export function prepareHubToolsData(categories = [], popularToolOrder = []) {
    const sortedCategories = categories.map((category) => ({
        ...category,
        tools: sortToolsPopularFirst(category.tools),
    }));

    const popularCategory = buildPopularCategory(
        sortedCategories,
        popularToolOrder,
    );
    if (!popularCategory) return sortedCategories;

    return [popularCategory, ...sortedCategories];
}

export function flattenTools(categories = []) {
    const seen = new Set();

    return categories.flatMap((category) =>
        category.tools.flatMap((tool) => {
            const key = tool.path ?? tool.id;
            if (seen.has(key)) return [];
            seen.add(key);

            return [
                {
                    ...tool,
                    category: tool.category ?? category.name,
                    categoryId: category.id,
                    searchLabel: `${tool.category ?? category.name} : ${tool.name}`,
                },
            ];
        }),
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
