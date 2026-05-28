import { generateKeyPairSync } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../.keys");

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "jwt-private.pem"), privateKey, "utf8");
writeFileSync(path.join(outDir, "jwt-public.pem"), publicKey, "utf8");

console.log("Wrote apps/api/.keys/jwt-private.pem and jwt-public.pem");
console.log("Add to .env (escape newlines as \\n or use multiline):");
console.log("JWT_PRIVATE_KEY=<contents of jwt-private.pem>");
console.log("JWT_PUBLIC_KEY=<contents of jwt-public.pem>");
