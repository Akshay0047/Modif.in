import ToolHub from "../sections/ToolHub";
import { imagePopularToolOrder, imageToolsData } from "../data/imageTools";

function ImageTools() {
    return (
        <ToolHub
            title="Image Tools"
            subheading="Free online tools to compress, convert, resize, crop, and edit images."
            toolsData={imageToolsData}
            popularToolOrder={imagePopularToolOrder}
        />
    );
}

export default ImageTools;
