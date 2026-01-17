import crypto from "crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const derived = crypto.scryptSync(password, salt, 32);
const hash = `scrypt:${salt}:${derived.toString("hex")}`;
console.log(hash);
