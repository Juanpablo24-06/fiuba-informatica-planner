import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const TABLES = [
  "subjects",
  "planner_entries",
  "planner_offers",
  "subject_prerequisites",
  "terms",
  "enrollments",
  "events",
  "calendar_sources",
  "calendar_events_raw",
  "calendar_event_enrichments",
  "chat_threads",
  "chat_messages",
  "ai_memories",
  "ai_memory_revisions"
];

const backupDir = process.argv[2];
if (!backupDir) throw new Error("Falta el directorio de destino del backup.");

const loadEnvFile = async (filename) => {
  try {
    const source = await fs.readFile(filename, "utf8");
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] ??= value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
};

await loadEnvFile(path.resolve(".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para exportar los datos."
  );
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const dataDir = path.join(backupDir, "data");
const migrationsDir = path.join(backupDir, "migrations");
await fs.mkdir(dataDir, { recursive: true });
await fs.cp(path.resolve("supabase/migrations"), migrationsDir, { recursive: true });

const manifest = {
  format: "supabase-portable-json-v1",
  created_at: new Date().toISOString(),
  source: new URL(supabaseUrl).host,
  tables: []
};

for (const table of TABLES) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  let missing = false;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .range(offset, offset + pageSize - 1);

    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        missing = true;
        break;
      }
      throw new Error(`No se pudo exportar ${table}: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  if (missing) {
    manifest.tables.push({ name: table, status: "missing", rows: 0 });
    continue;
  }

  const filename = `${table}.json`;
  await fs.writeFile(
    path.join(dataDir, filename),
    `${JSON.stringify(rows, null, 2)}\n`,
    "utf8"
  );
  manifest.tables.push({ name: table, status: "exported", rows: rows.length, file: `data/${filename}` });
}

await fs.writeFile(
  path.join(backupDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

const files = [];
const collectFiles = async (directory) => {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectFiles(absolute);
    else if (entry.name !== "checksums.txt") files.push(absolute);
  }
};
await collectFiles(backupDir);

const checksumLines = [];
for (const filename of files.sort()) {
  const digest = crypto
    .createHash("sha256")
    .update(await fs.readFile(filename))
    .digest("hex");
  checksumLines.push(`${digest}  ${path.relative(backupDir, filename)}`);
}
await fs.writeFile(path.join(backupDir, "checksums.txt"), `${checksumLines.join("\n")}\n`, "utf8");

for (const table of manifest.tables) {
  console.log(`${table.name}: ${table.status === "exported" ? `${table.rows} filas` : "aún no existe"}`);
}
