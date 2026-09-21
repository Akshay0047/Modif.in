import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ImageTools from "./pages/ImageTools";
import TextTools from "./pages/TextTools";
import DocTools from "./pages/DocTools";
import ModuleToolLayout from "./layouts/ModuleToolLayout";
import { useModuleScrollbarTheme } from "./hooks/useModuleScrollbarTheme";

// Auto-register every tool subpage placed under src/modules/<module>/<slug>/index.jsx.
// The module directory name maps to the route prefix used by each tool's `path`
// in src/data/*Tools.js (e.g. the "docs" module serves tools under the "/doc" prefix).
const toolPageModules = import.meta.glob("./modules/*/*/index.jsx", {
    eager: true,
});

const MODULE_PREFIX = {
    text: "text",
    image: "image",
    docs: "doc",
};

const toolRoutes = Object.entries(toolPageModules)
    .map(([filePath, module]) => {
        const match = filePath.match(
            /^\.\/modules\/([^/]+)\/([^/]+)\/index\.jsx$/,
        );
        if (!match) return null;

        const [, moduleName, slug] = match;
        const prefix = MODULE_PREFIX[moduleName];
        if (!prefix) return null;

        return {
            path: `/${prefix}/${slug}`,
            childPath: slug,
            module: prefix,
            Component: module.default,
        };
    })
    .filter(Boolean);

function groupRoutesByModule(routes) {
    const groups = { image: [], text: [], doc: [] };
    for (const route of routes) {
        if (groups[route.module]) {
            groups[route.module].push(route);
        }
    }
    return groups;
}

const routesByModule = groupRoutesByModule(toolRoutes);

function App() {
    useModuleScrollbarTheme();

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/image" element={<ModuleToolLayout module="image" />}>
                <Route index element={<ImageTools />} />
                {routesByModule.image.map(({ childPath, Component }) => (
                    <Route
                        key={childPath}
                        path={childPath}
                        element={<Component />}
                    />
                ))}
            </Route>

            <Route path="/text" element={<ModuleToolLayout module="text" />}>
                <Route index element={<TextTools />} />
                {routesByModule.text.map(({ childPath, Component }) => (
                    <Route
                        key={childPath}
                        path={childPath}
                        element={<Component />}
                    />
                ))}
            </Route>

            <Route path="/doc" element={<ModuleToolLayout module="doc" />}>
                <Route index element={<DocTools />} />
                {routesByModule.doc.map(({ childPath, Component }) => (
                    <Route
                        key={childPath}
                        path={childPath}
                        element={<Component />}
                    />
                ))}
            </Route>
        </Routes>
    );
}

export default App;
