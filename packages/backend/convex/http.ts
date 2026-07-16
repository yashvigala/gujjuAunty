import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mounts the auth endpoints (token issuance/refresh, signin) on
// https://<deployment>.convex.site
auth.addHttpRoutes(http);

export default http;
