import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackGaPageView } from "../analytics/ga";

/**
 * Fires one GA4 page_view per client-side navigation (React Router).
 * Initial load and all route changes share the same code path.
 */
export function useGaPageViews() {
    const location = useLocation();

    useEffect(() => {
        trackGaPageView();
    }, [location.pathname, location.search]);
}
