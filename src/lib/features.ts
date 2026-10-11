/** Çek & senet modülü: veriler silinmez, yalnızca menü, bildirim, ajanda ve raporlarda gizlenir. Tekrar açmak için true yapın. */
export const CHEQUES_ENABLED = false;

/** Kritik stok kontrolü (Ayarlar > Stok). Kurum ayarında açıkça false yazılmadıkça açıktır. */
export const criticalStockEnabled = (settings: unknown) => (settings as Record<string, unknown> | null)?.critical_stock_check !== false;
