import ToolHubLayout from "../layouts/ToolHubLayout";
import { docPopularToolOrder, docToolsData } from "../data/docTools";

function DocTools() {
    return (
        <ToolHubLayout
            title="DOC TOOLS"
            subheading="Powerful utilities for modifying PDF, DOCX, and CSV documents."
            color1="#1a1602"
            color2="#5c450a"
            toolsData={docToolsData}
            popularToolOrder={docPopularToolOrder}
        />
    );
}

export default DocTools;
