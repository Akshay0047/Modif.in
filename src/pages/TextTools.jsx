import ToolHub from "../sections/ToolHub";
import { textPopularToolOrder, textToolsData } from "../data/textTools";

function TextTools() {
    return (
        <ToolHub
            title="Text Tools"
            subheading="Free online tools to format, analyze, convert, and encode text."
            toolsData={textToolsData}
            popularToolOrder={textPopularToolOrder}
        />
    );
}

export default TextTools;
