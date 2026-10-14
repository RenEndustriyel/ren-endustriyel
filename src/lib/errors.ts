/** Supabase / Postgres hatalarını kullanıcıya uygun Türkçe mesaja çevirir. */
export function errorMessage(err: unknown): string {
  if (!err) return "Bilinmeyen hata";
  const e = err as { message?: string; code?: string; details?: string };
  const msg = e.message ?? String(err);
  if (e.code === "23505") {
    // hangi kuralın tekrarlandığını söyle (Postgres mesajında kısıt adı geçer)
    const text = `${msg} ${e.details ?? ""}`;
    if (/products_barcode_uniq/.test(text)) return "Bu barkod başka bir ürün kartında kayıtlı.";
    if (/products_code_uniq/.test(text)) return "Bu ürün kodu başka bir ürün kartında kayıtlı.";
    if (/contacts_code_uniq/.test(text)) return "Bu cari kodu başka bir caride kayıtlı.";
    if (/documents_number_uniq/.test(text)) return "Bu belge numarası aynı türde başka bir belgede kayıtlı.";
    return `Bu kayıt zaten mevcut (tekrarlanan değer). ${e.details ?? ""}`.trim();
  }
  if (e.code === "23503") return "Bu kayıt başka kayıtlarda kullanıldığı için işlem yapılamadı.";
  if (e.code === "42501" || /row-level security/i.test(msg)) return "Bu işlem için yetkiniz yok.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Bağlantı yok. İnternet bağlantınızı kontrol edin.";
  const map: Record<string, string> = {
    "Invalid login credentials": "E-posta veya şifre hatalı.",
    "Email not confirmed": "E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu kontrol edin.",
    "User already registered": "Bu e-posta ile kayıtlı bir kullanıcı var.",
    "Password should be at least 6 characters.": "Şifre en az 6 karakter olmalı.",
  };
  for (const [k, v] of Object.entries(map)) if (msg.includes(k)) return v;
  if (/rate limit/i.test(msg)) return "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.";
  return msg;
}
