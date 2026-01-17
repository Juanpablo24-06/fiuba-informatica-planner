import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import process from "process";

const loadEnvFile = async (filePath) => {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), filePath), "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1);
      if (!key) return;
      if (process.env[key] !== undefined) return;
      process.env[key] = value;
    });
  } catch {
    // ignore missing env files
  }
};

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const dataPath = path.join(process.cwd(), "data", "subjects.json");
const raw = await fs.readFile(dataPath, "utf8");
const subjects = JSON.parse(raw);

const subjectIdByName = new Map();

const upsertSubject = async (subject) => {
  let existing = null;
  if (subject.code) {
    const { data } = await supabase
      .from("subjects")
      .select("id")
      .eq("code", subject.code)
      .maybeSingle();
    existing = data;
  } else {
    const { data } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", subject.name)
      .maybeSingle();
    existing = data;
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("subjects")
      .update({
        name: subject.name,
        credits: subject.credits,
        weekly_hours: subject.weekly_hours,
        total_hours: subject.total_hours,
        term_suggested: subject.term_suggested,
        cycle: subject.cycle,
        type: subject.type,
        requirements: subject.requirements,
        template: subject.template,
        code: subject.code
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name: subject.name,
      credits: subject.credits,
      weekly_hours: subject.weekly_hours,
      total_hours: subject.total_hours,
      term_suggested: subject.term_suggested,
      cycle: subject.cycle,
      type: subject.type,
      requirements: subject.requirements,
      template: subject.template,
      code: subject.code
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
};

for (const subject of subjects) {
  const id = await upsertSubject(subject);
  subjectIdByName.set(subject.name, id);
}

const prerequisiteRows = [];
subjects.forEach((subject) => {
  const subjectId = subjectIdByName.get(subject.name);
  if (!subjectId) return;
  (subject.prerequisites ?? []).forEach((name) => {
    const prerequisiteId = subjectIdByName.get(name);
    if (!prerequisiteId) return;
    prerequisiteRows.push({
      subject_id: subjectId,
      prerequisite_id: prerequisiteId
    });
  });
});

if (prerequisiteRows.length) {
  const { error } = await supabase
    .from("subject_prerequisites")
    .upsert(prerequisiteRows, { onConflict: "subject_id,prerequisite_id" });
  if (error) throw error;
}

const { count, error: termError } = await supabase
  .from("terms")
  .select("id", { count: "exact", head: true });

if (termError) {
  throw termError;
}

if (!count) {
  await supabase.from("terms").insert([
    {
      label: "2026-1",
      start_date: "2026-03-15",
      end_date: "2026-07-15",
      is_current: true
    },
    {
      label: "2026-2",
      start_date: "2026-08-10",
      end_date: "2026-12-10",
      is_current: false
    }
  ]);
}

console.log("Seed completed.");
