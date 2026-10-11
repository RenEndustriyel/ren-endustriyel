"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useRows, type Row } from "@/lib/data";
import { Card, CardHeader } from "@/components/ui/card";

/** Kayda ekli dosyalar (fiş fotoğrafı vb.) */
export function Attachments({ entityType, entityId }: { entityType: string; entityId: string }) {
  const list = useRows<Row<"attachments">>("attachments", { params: [entityType, entityId], filter: (q) => q.eq("entity_type", entityType).eq("entity_id", entityId) });
  const urls = useQuery({
    queryKey: ["att-urls", list.data?.map((a) => a.id).join(",")],
    enabled: !!list.data?.length,
    queryFn: async () => {
      const out: Record<string, string> = {};
      for (const a of list.data ?? []) {
        const { data } = await supabase.storage.from("files").createSignedUrl(a.storage_path, 3600);
        if (data) out[a.id] = data.signedUrl;
      }
      return out;
    },
  });
  if (!list.data?.length) return null;
  return (
    <Card>
      <CardHeader icon={<Paperclip />} title="Ekler" />
      <div className="grid grid-cols-3 gap-2 p-3">
        {list.data.map((a) => (
          <a key={a.id} href={urls.data?.[a.id]} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
            {a.mime_type?.startsWith("image/") && urls.data?.[a.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls.data[a.id]} alt={a.file_name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center text-xs text-muted">{a.file_name}</div>
            )}
          </a>
        ))}
      </div>
    </Card>
  );
}
