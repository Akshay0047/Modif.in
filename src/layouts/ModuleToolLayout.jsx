import { Outlet } from "react-router-dom";
import Footer from "../sections/Footer";
import { useToolPageScroll } from "../hooks/useToolPageScroll";
import "./ToolHubLayout.css";

function ModuleToolLayout() {
    useToolPageScroll();

    return (
        <div className="tool-hub-layout">
            <main id="main-content" tabIndex={-1}><Outlet /></main>

            <Footer />
        </div>
    );
}

export default ModuleToolLayout;
