"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Star, Warehouse, Ruler, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type UnitItem = {
  id: string;
  name: string;
  code: string;
  sort_order: number;
};

export function UnitsSettings() {
  const { org, canWrite, isAdmin } = useOrg();
  const canManage = isAdmin || canWrite;
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  // Düzenleme modalı
  const [editingUnit, setEditingUnit] = React.useState<UnitItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editCode, setEditCode] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);

  const q = useQuery({
    queryKey: ["units", org!.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").eq("org_id", org!.id).is("deleted_at", null).order("sort_order");
      if (error) throw error;
      return (data ?? []) as UnitItem[];
    },
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("units").insert({
      org_id: org!.id,
      name: name.trim(),
      code: (code.trim() || name.trim()).toLocaleUpperCase("tr-TR").replace(/\s+/g, ""),
      sort_order: (q.data?.length ?? 0) + 1,
    });
    setAdding(false);
    if (error) return toast.error(errorMessage(error));
    setName("");
    setCode("");
    qc.invalidateQueries({ queryKey: ["units"] });
  };

  const startEdit = (u: UnitItem) => {
    setEditingUnit(u);
    setEditName(u.name);
    setEditCode(u.code);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    if (!editName.trim()) {
      toast.error("Birim adı gereklidir");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("units")
      .update({
        name: editName.trim(),
        code: (editCode.trim() || editName.trim()).toLocaleUpperCase("tr-TR").replace(/\s+/g, ""),
      })
      .eq("id", editingUnit.id);
    setSavingEdit(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Birim güncellendi");
    setEditingUnit(null);
    qc.invalidateQueries({ queryKey: ["units"] });
  };

  const remove = async (u: UnitItem) => {
    const ok = await confirm({
      title: `"${u.name}" Birimini Sil`,
      description: "Bu birimi silmek istediğinizden emin misiniz?",
      confirmText: "Birimi Sil",
      danger: true,
    });
    if (!ok) return;

    const { error } = await supabase.from("units").update({ deleted_at: new Date().toISOString() }).eq("id", u.id);
    if (error) return toast.error(errorMessage(error));
    toast.success("Birim silindi");
    qc.invalidateQueries({ queryKey: ["units"] });
  };

  return (
    <>
      <Card>
        <CardHeader icon={<Ruler />} title="Birimler" />
        {q.isPending ? (
          <Skeleton className="m-5 h-24" />
        ) : (
          <ul className="divide-y divide-border">
            {q.data?.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="flex-1 text-sm font-medium">{u.name}</span>
                <Badge>{u.code}</Badge>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => startEdit(u)}
                      aria-label={`${u.name} birimini düzenle`}
                      title="Düzenle"
                      className="text-muted hover:text-text"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => remove(u)}
                      aria-label={`${u.name} birimini sil`}
                      title="Sil"
                      className="text-muted hover:text-danger hover:bg-danger-soft/20"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {canWrite && (
          <form onSubmit={add} className="flex gap-2 border-t border-border px-4 py-3 sm:px-5">
            <Input placeholder="Birim adı (örn. Metre)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Kod" value={code} onChange={(e) => setCode(e.target.value)} className="w-24 uppercase" />
            <Button type="submit" loading={adding} aria-label="Birim ekle">
              <Plus />
            </Button>
          </form>
        )}
      </Card>

      {/* Birim Düzenle Modalı */}
      <Dialog open={!!editingUnit} onOpenChange={(open) => !open && setEditingUnit(null)}>
        <DialogContent title="Birimi Düzenle" description="Birim adı ve kısaltma kodunu güncelleyin">
          {editingUnit && (
            <form onSubmit={saveEdit} className="space-y-4 pt-2">
              <Field label="Birim Adı *" htmlFor="edit-unit-name">
                <Input
                  id="edit-unit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Örn. Adet, Koli, Kilogram"
                  autoFocus
                  required
                />
              </Field>
              <Field label="Birim Kodu *" htmlFor="edit-unit-code">
                <Input
                  id="edit-unit-code"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="Örn. ADET, KLI, KG"
                  className="uppercase"
                  required
                />
              </Field>
              <div className="mt-5 flex justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingUnit(null)}>
                  Vazgeç
                </Button>
                <Button type="submit" loading={savingEdit}>
                  Kaydet
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

type WarehouseItem = {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
};

export function WarehousesSettings() {
  const { org, isAdmin, canWrite } = useOrg();
  const canManage = isAdmin || canWrite;
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  // Düzenleme modalı
  const [editingWarehouse, setEditingWarehouse] = React.useState<WarehouseItem | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editAddress, setEditAddress] = React.useState("");
  const [editIsDefault, setEditIsDefault] = React.useState(false);
  const [savingEdit, setSavingEdit] = React.useState(false);

  const q = useQuery({
    queryKey: ["warehouses", org!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .eq("org_id", org!.id)
        .is("deleted_at", null)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as WarehouseItem[];
    },
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    const isFirst = !q.data?.length;
    const { error } = await supabase.from("warehouses").insert({
      org_id: org!.id,
      name: name.trim(),
      address: address.trim() || null,
      is_default: isFirst,
    });
    setAdding(false);
    if (error) return toast.error(errorMessage(error));
    toast.success("Yeni depo eklendi");
    setName("");
    setAddress("");
    qc.invalidateQueries({ queryKey: ["warehouses"] });
  };

  const makeDefault = async (id: string) => {
    await supabase.from("warehouses").update({ is_default: false }).eq("org_id", org!.id).eq("is_default", true);
    const { error } = await supabase.from("warehouses").update({ is_default: true }).eq("id", id);
    if (error) toast.error(errorMessage(error));
    else toast.success("Varsayılan depo güncellendi");
    qc.invalidateQueries({ queryKey: ["warehouses"] });
  };

  const startEdit = (w: WarehouseItem) => {
    setEditingWarehouse(w);
    setEditName(w.name);
    setEditAddress(w.address ?? "");
    setEditIsDefault(w.is_default);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    if (!editName.trim()) {
      toast.error("Depo adı gereklidir");
      return;
    }

    setSavingEdit(true);
    try {
      if (editIsDefault && !editingWarehouse.is_default) {
        await supabase
          .from("warehouses")
          .update({ is_default: false })
          .eq("org_id", org!.id)
          .eq("is_default", true);
      }

      const { error } = await supabase
        .from("warehouses")
        .update({
          name: editName.trim(),
          address: editAddress.trim() || null,
          is_default: editIsDefault,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingWarehouse.id);

      if (error) throw error;

      toast.success("Depo bilgileri güncellendi");
      setEditingWarehouse(null);
      qc.invalidateQueries({ queryKey: ["warehouses"] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const removeWarehouse = async (w: WarehouseItem) => {
    const list = q.data ?? [];
    if (list.length <= 1) {
      toast.warning("Sistemde en az 1 adet aktif depo bulunmalıdır. Başka bir depo ekledikten sonra bu depoyu silebilirsiniz.");
      return;
    }

    const otherWarehouse = list.find((x) => x.id !== w.id);
    const isDefault = w.is_default;

    const ok = await confirm({
      title: `"${w.name}" Deposunu Sil`,
      description: isDefault
        ? `Bu depo şu anda varsayılan depodur. Silindiğinde varsayılan depo otomatik olarak "${otherWarehouse?.name}" yapılacak ve geçmiş kayıtlar korunacaktır. Depoyu silmek istiyor musunuz?`
        : "Bu depoyu silmek istediğinizden emin misiniz? Depoya ait geçmiş hareket kayıtları sistemde saklanmaya devam eder.",
      confirmText: "Depoyu Sil",
      danger: true,
    });
    if (!ok) return;

    try {
      if (isDefault && otherWarehouse) {
        await supabase
          .from("warehouses")
          .update({ is_default: true })
          .eq("id", otherWarehouse.id);
      }

      const { error } = await supabase
        .from("warehouses")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", w.id);

      if (error) throw error;

      toast.success(
        isDefault && otherWarehouse
          ? `"${w.name}" deposu silindi. Varsayılan depo "${otherWarehouse.name}" olarak ayarlandı.`
          : `"${w.name}" deposu silindi.`
      );
      qc.invalidateQueries({ queryKey: ["warehouses"] });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <>
      <Card>
        <CardHeader icon={<Warehouse />} title="Depolar" />
        {q.isPending ? (
          <Skeleton className="m-5 h-16" />
        ) : (
          <ul className="divide-y divide-border">
            {q.data?.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text">{w.name}</span>
                    {w.is_default && (
                      <Badge tone="primary" className="gap-1 shrink-0 text-[11px]">
                        <Star className="size-3" /> Varsayılan
                      </Badge>
                    )}
                  </div>
                  {w.address && (
                    <p className="mt-0.5 truncate text-xs text-muted">{w.address}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!w.is_default && canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs text-muted hover:text-text"
                      onClick={() => makeDefault(w.id)}
                      title="Bu depoyu varsayılan yap"
                    >
                      Varsayılan yap
                    </Button>
                  )}
                  {canManage && (
                    <>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => startEdit(w)}
                        aria-label={`${w.name} deposunu düzenle`}
                        title="Düzenle"
                        className="text-muted hover:text-text hover:bg-surface-2"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeWarehouse(w)}
                        aria-label={`${w.name} deposunu sil`}
                        title="Depoyu sil"
                        className="text-muted hover:text-danger hover:bg-danger-soft/20"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <form onSubmit={add} className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:px-5">
            <div className="flex gap-2">
              <Input
                placeholder="Depo adı (örn. Merkez Depo, Raf A)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" loading={adding} aria-label="Depo ekle">
                <Plus /> Depo Ekle
              </Button>
            </div>
            <Input
              placeholder="Adres / Konum Açıklaması (İsteğe bağlı)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="text-xs"
            />
          </form>
        )}
      </Card>

      {/* Depo Düzenle Modalı */}
      <Dialog open={!!editingWarehouse} onOpenChange={(open) => !open && setEditingWarehouse(null)}>
        <DialogContent title="Depoyu Düzenle" description="Depo adı, adres ve varsayılan durumunu güncelleyin">
          {editingWarehouse && (
            <form onSubmit={saveEdit} className="space-y-4 pt-2">
              <Field label="Depo Adı *" htmlFor="edit-wh-name">
                <Input
                  id="edit-wh-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Örn. Merkez Depo, Şube 1"
                  autoFocus
                  required
                />
              </Field>

              <Field label="Adres / Konum Açıklaması (İsteğe bağlı)" htmlFor="edit-wh-address">
                <Input
                  id="edit-wh-address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Örn. Kat 2 / Raf B veya Şube açık adresi"
                />
              </Field>

              <div className="rounded-xl border border-border bg-surface-2/40 p-3.5">
                <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                  <div>
                    <div className="text-sm font-semibold text-text">Varsayılan Depo</div>
                    <div className="text-xs text-muted">
                      Yeni işlemler ve satışlarda ilk seçilecek ana depo
                    </div>
                  </div>
                  <Switch
                    checked={editIsDefault}
                    onCheckedChange={(checked) => {
                      if (editingWarehouse.is_default && !checked) {
                        toast.info("En az bir depo varsayılan olmalıdır. Başka bir depoyu varsayılan yapabilirsiniz.");
                        return;
                      }
                      setEditIsDefault(checked);
                    }}
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingWarehouse(null)}
                >
                  Vazgeç
                </Button>
                <Button type="submit" loading={savingEdit}>
                  Kaydet
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

