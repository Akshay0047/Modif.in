import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ImageTools from "./pages/ImageTools";
import TextTools from "./pages/TextTools";
import DocTools from "./pages/DocTools";

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
            Component: module.default,
        };
    })
    .filter(Boolean);

function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/image" element={<ImageTools />} />
            <Route path="/text" element={<TextTools />} />
            <Route path="/doc" element={<DocTools />} />

            {toolRoutes.map(({ path, Component }) => (
                <Route key={path} path={path} element={<Component />} />
            ))}
        </Routes>
    );
}

export default App;
