import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://araetdkscwosdbwdemlk.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "sb_publishable_tfPWKeB0mjDYqs7seLcvHw_58FvH0AX";

    // İstek yapan kullanıcının oturumu
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return NextResponse.json({ error: "Geçersiz oturum" }, { status: 401 });
    }

    const body = await req.json();
    const { orgId, email, password, fullName, role, contactId } = body as {
      orgId?: string;
      email?: string;
      password?: string;
      fullName?: string;
      role?: string;
      contactId?: string;
    };

    if (!orgId || !email || !password || !role) {
      return NextResponse.json({ error: "E-posta, şifre, rol ve firma bilgisi zorunludur" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi girin" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Şifre en az 8 karakter olmalıdır" }, { status: 400 });
    }

    // Yetki kontrolü: İstek yapan kişi bu firmanın yöneticisi mi?
    const { data: callerMembership, error: membershipError } = await callerClient
      .from("memberships")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", caller.id)
      .maybeSingle();

    if (membershipError || !callerMembership || !["owner", "admin"].includes(callerMembership.role)) {
      return NextResponse.json({ error: "Yeni kullanıcı eklemek için yönetici yetkisi gereklidir" }, { status: 403 });
    }

    const isB2B = role === "b2b";
    // Veritabanı constraint hatasını engellemek için b2b rolü DB seviyesinde salt-okunur 'accountant' olarak kaydedilir
    const dbRole = isB2B ? "accountant" : role;

    // 1. Önce firmaya davet kaydı oluşturalım
    const { data: invData, error: invError } = await callerClient
      .from("invitations")
      .insert({
        org_id: orgId,
        email: trimmedEmail,
        role: dbRole as any,
        invited_by: caller.id,
      })
      .select()
      .single();

    if (invError) {
      return NextResponse.json({ error: `Davet kaydı oluşturulamadı: ${invError.message}` }, { status: 400 });
    }

    // 2. Kullanıcıyı Supabase Auth'a kaydedelim
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let createdUser: any = null;
    let needsEmailConfirmation = false;

    if (serviceRoleKey) {
      // Service Role varsa doğrudan onaylı (email_confirm: true) kullanıcı oluştur
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName?.trim() || trimmedEmail.split("@")[0],
          is_b2b: isB2B,
          role: isB2B ? "b2b" : role,
          contact_id: contactId || undefined,
        },
      });

      if (adminError) {
        if (adminError.message.toLowerCase().includes("already registered") || adminError.message.toLowerCase().includes("already exists")) {
          return NextResponse.json({
            success: true,
            alreadyRegistered: true,
            message: "Kullanıcı sistemde zaten kayıtlı olduğu için firmaya davet tanımlandı. Kullanıcı mevcut şifresiyle giriş yapabilir.",
          });
        }
        return NextResponse.json({ error: `Kullanıcı oluşturulamadı: ${adminError.message}` }, { status: 400 });
      }

      createdUser = adminData.user;
      needsEmailConfirmation = false;
    } else {
      // Service Role yoksa izole anon client ile signUp kullan
      const isolatedAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: signUpData, error: signUpError } = await isolatedAuthClient.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName?.trim() || trimmedEmail.split("@")[0],
            is_b2b: isB2B,
            role: isB2B ? "b2b" : role,
            contact_id: contactId || undefined,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("already registered") || signUpError.message.toLowerCase().includes("already exists")) {
          return NextResponse.json({
            success: true,
            alreadyRegistered: true,
            message: "Kullanıcı sistemde zaten kayıtlı olduğu için firmaya davet tanımlandı. Kullanıcı mevcut şifresiyle giriş yapabilir.",
          });
        }
        return NextResponse.json({ error: `Kullanıcı oluşturulamadı: ${signUpError.message}` }, { status: 400 });
      }

      createdUser = signUpData.user;
      needsEmailConfirmation = !signUpData.session && !(signUpData.user as any)?.confirmed_at;
    }

    // 3. Eğer B2B ise firma ayarlarındaki b2b_emails ve b2b_contacts listelerine de ekleyelim
    if (isB2B) {
      try {
        const { data: orgData } = await callerClient.from("organizations").select("settings").eq("id", orgId).single();
        const existingSettings = (orgData?.settings && typeof orgData.settings === "object" ? orgData.settings : {}) as Record<string, any>;
        const currentB2BEmails: string[] = Array.isArray(existingSettings.b2b_emails) ? existingSettings.b2b_emails : [];
        const currentB2BContacts: Record<string, string> =
          existingSettings.b2b_contacts && typeof existingSettings.b2b_contacts === "object" ? existingSettings.b2b_contacts : {};

        const nextEmails = currentB2BEmails.includes(trimmedEmail) ? currentB2BEmails : [...currentB2BEmails, trimmedEmail];
        const nextContacts = contactId ? { ...currentB2BContacts, [trimmedEmail]: contactId } : currentB2BContacts;

        await callerClient
          .from("organizations")
          .update({
            settings: {
              ...existingSettings,
              b2b_emails: nextEmails,
              b2b_contacts: nextContacts,
            },
          })
          .eq("id", orgId);
      } catch {
        // settings güncellemesi opsiyonel yedek
      }
    }

    return NextResponse.json({
      success: true,
      needsEmailConfirmation,
      user: createdUser,
      message: needsEmailConfirmation
        ? `${trimmedEmail} kullanıcısı oluşturuldu. Supabase güvenlik ayarlarında 'E-posta Onayı (Confirm email)' açık olduğundan, kullanıcının gelen kutusundaki onay bağlantısına tıklaması veya Supabase panelinden 'Confirm email' ayarının kapatılması gerekir.`
        : `${trimmedEmail} kullanıcısı (${isB2B ? "B2B Bayi" : role}) başarıyla oluşturuldu ve şifresi aktif.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Sunucu hatası" }, { status: 500 });
  }
}
