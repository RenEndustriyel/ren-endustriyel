import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/**
 * İstek ya zamanlanmış görevden (x-cron-secret) ya da oturum açmış bir kullanıcıdan gelmeli.
 * Dönen değer: { cron: true } veya { userId }
 */
export async function authorize(req: Request): Promise<{ cron: boolean; userId?: string } | null> {
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && req.headers.get("x-cron-secret") === secret) return { cron: true };
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data, error } = await adminClient().auth.getUser(auth.slice(7));
  if (error || !data.user) return null;
  return { cron: false, userId: data.user.id };
}
