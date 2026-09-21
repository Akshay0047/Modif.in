import ToolHub from "../sections/ToolHub";
import { docPopularToolOrder, docToolsData } from "../data/docTools";

function DocTools() {
    return (
        <ToolHub
            title="DOC TOOLS"
            subheading="Powerful utilities for modifying PDF, DOCX, and CSV documents."
            toolsData={docToolsData}
            popularToolOrder={docPopularToolOrder}
        />
    );
}

export default DocTools;
