export function createTool(prefix, id, name, category, isPopular = false) {
    return {
        id,
        name,
        category,
        isPopular,
        path: `/${prefix}/${id}`,
    };
}
