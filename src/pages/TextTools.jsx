import ToolHub from "../sections/ToolHub";
import { textPopularToolOrder, textToolsData } from "../data/textTools";

function TextTools() {
    return (
        <ToolHub
            title="TEXT TOOLS"
            subheading="Comprehensive utilities for text analysis, formatting, encoding, and developer tools"
            toolsData={textToolsData}
            popularToolOrder={textPopularToolOrder}
        />
    );
}

export default TextTools;
