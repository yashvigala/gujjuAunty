// One-time setup: generates the RS256 keypair Convex Auth uses to sign and
// verify its JWTs, then prints the two env vars to set on the deployment.
//
//   node scripts/generate-auth-keys.mjs
//
// JWT_PRIVATE_KEY — signs tokens (secret!)   JWKS — public key, verifies them.
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { writeFileSync } from "node:fs";

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

writeFileSync("jwt_private_key.tmp", privateKey.trimEnd().replace(/\n/g, " "));
writeFileSync("jwks.tmp", jwks);

console.log("Wrote jwt_private_key.tmp and jwks.tmp — set them with:");
console.log('  npx convex env set JWT_PRIVATE_KEY -- "$(cat jwt_private_key.tmp)"');
console.log('  npx convex env set JWKS -- "$(cat jwks.tmp)"');
console.log("Then DELETE both .tmp files.");
