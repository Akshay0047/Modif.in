import ToolHubLayout from "../layouts/ToolHubLayout";
import { imageToolsData } from "../data/tools";

function ImageTools() {
    return (
        <ToolHubLayout
            title="IMAGE TOOLS"
            subheading="A dedicated suite for image manipulation and processing"
            color1="#021108"
            color2="#064e3b"
            toolsData={imageToolsData}
        />
    );
}

export default ImageTools;
