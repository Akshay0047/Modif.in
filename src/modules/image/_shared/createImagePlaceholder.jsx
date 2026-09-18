import BackButton from "../../../components/BackButton";
import ImageToolShell from "./ImageToolShell";

export function createImagePlaceholder(title) {
    function ImageToolPlaceholder() {
        return (
            <ImageToolShell>
                <BackButton />
                <div className="image-tool-placeholder">
                    <h1 className="image-tool-placeholder__title">{title}</h1>
                    <p className="image-tool-placeholder__note">
                        This tool is a placeholder. Implementation coming soon.
                    </p>
                </div>
            </ImageToolShell>
        );
    }

    return ImageToolPlaceholder;
}
