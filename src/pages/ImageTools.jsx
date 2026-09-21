import ToolHub from "../sections/ToolHub";
import { imagePopularToolOrder, imageToolsData } from "../data/imageTools";

function ImageTools() {
    return (
        <ToolHub
            title="IMAGE TOOLS"
            subheading="A dedicated suite for image manipulation and processing"
            toolsData={imageToolsData}
            popularToolOrder={imagePopularToolOrder}
        />
    );
}

export default ImageTools;
