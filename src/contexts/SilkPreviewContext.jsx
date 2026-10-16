import { createContext, useContext } from "react";

export const SilkPreviewContext = createContext(null);

export function useSilkPreview() {
    return useContext(SilkPreviewContext);
}
