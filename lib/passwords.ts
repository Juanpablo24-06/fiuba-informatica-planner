import crypto from "crypto";

const SCRYPT_PREFIX = "scrypt";

export const verifyPassword = (password: string, storedHash: string) => {
  try {
    const [prefix, salt, hash] = storedHash.split(":");
    if (prefix !== SCRYPT_PREFIX || !salt || !hash) return false;
    const derived = crypto.scryptSync(password, salt, 32);
    const hashBuffer = Buffer.from(hash, "hex");
    if (hashBuffer.length !== derived.length) return false;
    return crypto.timingSafeEqual(hashBuffer, derived);
  } catch {
    return false;
  }
};

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 32);
  return `${SCRYPT_PREFIX}:${salt}:${derived.toString("hex")}`;
};
