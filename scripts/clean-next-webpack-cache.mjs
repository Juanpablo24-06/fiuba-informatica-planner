import fs from "node:fs/promises";
import path from "node:path";

const webpackCacheDir = path.join(
  process.cwd(),
  ".next",
  "cache",
  "webpack"
);

try {
  await fs.rm(webpackCacheDir, { recursive: true, force: true });
} catch (error) {
  if (!(error instanceof Error)) {
    throw error;
  }
}
