import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseAdminClient = SupabaseClient;

const readSupabaseAdminConfig = () => ({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
});

export const isSupabaseAdminConfigured = () => {
  const { supabaseUrl, serviceRoleKey } = readSupabaseAdminConfig();
  return Boolean(supabaseUrl && serviceRoleKey);
};

let supabaseAdminSingleton: SupabaseAdminClient | null = null;

export const getSupabaseAdmin = (): SupabaseAdminClient => {
  const { supabaseUrl, serviceRoleKey } = readSupabaseAdminConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase env vars.");
  }

  if (!supabaseAdminSingleton) {
    supabaseAdminSingleton = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
  }

  return supabaseAdminSingleton;
};

// Keep the existing `supabaseAdmin.from(...).select(...)` call sites intact while
// delaying client creation until a route actually needs the service role key.
export const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
  get(_target, property) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  }
}) as SupabaseAdminClient;
