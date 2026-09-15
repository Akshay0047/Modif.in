import ToolHubLayout from "../layouts/ToolHubLayout";
import { textToolsData } from "../data/tools";

function TextTools() {
    return (
        <ToolHubLayout
            title="TEXT TOOLS"
            subheading="Comprehensive utilities for text analysis, formatting, encoding, and developer tools"
            color1="#1a0505"
            color2="#4a0f0f"
            toolsData={textToolsData}
        />
    );
}

export default TextTools;
