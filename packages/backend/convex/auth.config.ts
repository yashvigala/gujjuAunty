// Tells Convex which JWTs to accept: ones we issue ourselves.
// CONVEX_SITE_URL is a built-in env var on every deployment.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
