import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BACKUP_TABLES } from "@/lib/backup";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secretParam = req.nextUrl.searchParams.get("token") || req.nextUrl.searchParams.get("key");
  const expectedSecret = process.env.BACKUP_SECRET_TOKEN || "ren_muhasebe_backup_secret_2026";

  const isTokenValid =
    (authHeader && authHeader === `Bearer ${expectedSecret}`) ||
    secretParam === expectedSecret;

  // Supabase URL & Key (Admin service role if exists, or publishable key)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://araetdkscwosdbwdemlk.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_tfPWKeB0mjDYqs7seLcvHw_58FvH0AX";

  // If token is invalid and no valid bearer token was provided, reject
  if (!isTokenValid) {
    // If not matching secret token, check if bearer is a valid user JWT
    if (authHeader?.startsWith("Bearer ")) {
      const userToken = authHeader.replace("Bearer ", "");
      const userClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${userToken}` } },
      });
      const { data: { user }, error: userErr } = await userClient.auth.getUser();
      if (userErr || !user) {
        return NextResponse.json({ error: "Yetkisiz erişim. Geçerli bir yedekleme belirteci veya oturum gereklidir." }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Yetkisiz erişim. 'token' parametresi veya 'Authorization' başlığı gereklidir." }, { status: 401 });
    }
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const orgId = req.nextUrl.searchParams.get("orgId");
  const download = req.nextUrl.searchParams.get("download") === "1";

  try {
    const result: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    let totalRecords = 0;

    for (const table of BACKUP_TABLES) {
      let query = (supabase as any).from(table).select("*");
      if (orgId) {
        if (table !== "profiles" && table !== "organizations") {
          query = query.eq("org_id", orgId);
        } else if (table === "organizations") {
          query = query.eq("id", orgId);
        }
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        result[table] = data;
        counts[table] = data.length;
        totalRecords += data.length;
      } else {
        result[table] = [];
        counts[table] = 0;
      }
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      app: "Ren Endüstriyel Ön Muhasebe",
      orgId: orgId || "all",
      counts,
      totalRecords,
      tables: result,
    };

    if (download) {
      const filename = `Ren_Yedek_${dateStr}.json`;
      return new NextResponse(JSON.stringify(backupData, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(backupData);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Yedek oluşturulurken hata oluştu", details: msg }, { status: 500 });
  }
}
