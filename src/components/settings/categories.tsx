"use client";

import * as React from "react";
import { Plus, Trash2, Tags } from "lucide-react";
import { useCategories, useSave, useUpdate } from "@/lib/data";
import { useOrg } from "@/providers/org-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";

const TYPES = [
  { value: "expense", label: "Masraf" },
  { value: "income", label: "Gelir" },
  { value: "product", label: "Ürün" },
] as const;

export function CategorySettings() {
  const { canWrite, isAdmin } = useOrg();
  const [type, setType] = React.useState<(typeof TYPES)[number]["value"]>("expense");
  const cats = useCategories(type);
  const save = useSave("categories");
  const { update, remove } = useUpdate("categories");
  const [name, setName] = React.useState("");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await save.save({ type, name: name.trim(), sort_order: (cats.data?.length ?? 0) + 1 });
    setName("");
  };
  return (
    <Card>
      <CardHeader icon={<Tags />} title="Kategoriler" action={<Segmented value={type} onChange={setType} options={TYPES.map((t) => ({ value: t.value, label: t.label }))} />} />
      <ul className="divide-y divide-border">
        {cats.data?.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-2">
            <input
              type="color"
              value={c.color ?? "#9aa1ab"}
              disabled={!canWrite}
              onChange={(e) => update(c.id, { color: e.target.value })}
              className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="Renk"
            />
            <Input defaultValue={c.name} disabled={!canWrite} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && update(c.id, { name: e.target.value.trim() })} className="h-9 flex-1" />
            {isAdmin && (
              <Button size="icon-sm" variant="ghost" onClick={() => remove(c.id, "Kategori silindi")} aria-label="Sil">
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canWrite && (
        <form onSubmit={add} className="flex gap-2 border-t border-border p-3">
          <Input placeholder="Yeni kategori" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" size="icon" aria-label="Ekle">
            <Plus />
          </Button>
        </form>
      )}
    </Card>
  );
}
