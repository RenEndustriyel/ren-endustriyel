import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://araetdkscwosdbwdemlk.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_tfPWKeB0mjDYqs7seLcvHw_58FvH0AX";

/** Tarayıcı istemcisi — oturum localStorage'da tutulur (çevrimdışı çalışabilmesi için). */
export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "ren-auth",
  },
});

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
