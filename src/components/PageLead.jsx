import { useLocation } from "react-router-dom";
import { getRouteMeta } from "../data/routeMeta.js";

function PageLead({ className = "" }) {
    const { pathname } = useLocation();
    const { description } = getRouteMeta(pathname);
    if (!description) return null;
    return <p className={className}>{description}</p>;
}

export default PageLead;
