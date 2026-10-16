import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ModuleToolLayout from "./layouts/ModuleToolLayout";
import AppShell from "./layouts/AppShell";
import NotFoundPage from "./pages/NotFoundPage";
import RouteContent from "./layouts/RouteContent";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const ImageTools = lazy(() => import("./pages/ImageTools"));
const TextTools = lazy(() => import("./pages/TextTools"));
const DocTools = lazy(() => import("./pages/DocTools"));

// Auto-register every tool subpage placed under src/modules/<module>/<slug>/index.jsx.
// The module directory name maps to the route prefix used by each tool's `path`
// in src/data/*Tools.js (e.g. the "docs" module serves tools under the "/doc" prefix).
const toolPageModules = import.meta.glob("./modules/*/*/index.jsx");

const MODULE_PREFIX = {
    text: "text",
    image: "image",
    docs: "doc",
};

const toolRoutes = Object.entries(toolPageModules)
    .map(([filePath, load]) => {
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
            Component: lazy(load),
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
    return (
        <AppShell>
        <Routes>
            <Route path="/" element={<RouteContent><LandingPage /></RouteContent>} />

            <Route element={<ModuleToolLayout />}>
                <Route path="image">
                    <Route index element={<RouteContent><ImageTools /></RouteContent>} />
                    {routesByModule.image.map(({ childPath, Component }) => (
                        <Route
                            key={childPath}
                            path={childPath}
                            element={<RouteContent><Component /></RouteContent>}
                        />
                    ))}
                </Route>

                <Route path="text">
                    <Route index element={<RouteContent><TextTools /></RouteContent>} />
                    {routesByModule.text.map(({ childPath, Component }) => (
                        <Route
                            key={childPath}
                            path={childPath}
                            element={<RouteContent><Component /></RouteContent>}
                        />
                    ))}
                </Route>

                <Route path="doc">
                    <Route index element={<RouteContent><DocTools /></RouteContent>} />
                    {routesByModule.doc.map(({ childPath, Component }) => (
                        <Route
                            key={childPath}
                            path={childPath}
                            element={<RouteContent><Component /></RouteContent>}
                        />
                    ))}
                </Route>
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
        </AppShell>
    );
}

export default App;
