import type { SessionPayload } from "@/lib/session";

const base64urlToUint8 = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
};

const getKey = async (secret: string) => {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", secretBytes);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["decrypt"]);
};

export const unsealSessionEdge = async (
  token: string,
  secret: string
): Promise<SessionPayload | null> => {
  try {
    const raw = base64urlToUint8(token);
    if (raw.length < 28) return null;
    const iv = raw.slice(0, 12);
    const tagLength = 16;
    const ciphertext = raw.slice(12);
    const key = await getKey(secret);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, tagLength: tagLength * 8 },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    const payload = JSON.parse(decoder.decode(decrypted)) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
};
