import ToolHub from "../sections/ToolHub";
import { docPopularToolOrder, docToolsData } from "../data/docTools";

function DocTools() {
    return (
        <ToolHub
            title="PDF & Document Tools"
            subheading="Free online tools to convert, organize, redact, and edit PDF, DOCX, and CSV files."
            toolsData={docToolsData}
            popularToolOrder={docPopularToolOrder}
        />
    );
}

export default DocTools;
