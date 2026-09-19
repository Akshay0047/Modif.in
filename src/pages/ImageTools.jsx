import ToolHubLayout from "../layouts/ToolHubLayout";
import { imagePopularToolOrder, imageToolsData } from "../data/imageTools";

function ImageTools() {
    return (
        <ToolHubLayout
            title="IMAGE TOOLS"
            subheading="A dedicated suite for image manipulation and processing"
            color1="#021108"
            color2="#064e3b"
            toolsData={imageToolsData}
            popularToolOrder={imagePopularToolOrder}
        />
    );
}

export default ImageTools;
