"use client";

import * as React from "react";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useContactBalances, useContacts, type Row } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { ContactForm } from "./contact-form";

export function ContactPicker({
  value,
  onChange,
  kind,
  placeholder,
  clearable,
}: {
  value: string | null;
  onChange: (id: string | null, contact?: Row<"contacts">) => void;
  kind?: "customer" | "supplier";
  placeholder?: string;
  clearable?: boolean;
}) {
  const contacts = useContacts();
  const balances = useContactBalances();
  const [createName, setCreateName] = React.useState<string | null>(null);
  const bal = React.useMemo(() => new Map((balances.data ?? []).map((b) => [b.contact_id, Number(b.balance)])), [balances.data]);
  const options = React.useMemo(
    () =>
      (contacts.data ?? [])
        .filter((c) => !kind || c.kind === kind || c.kind === "both")
        .map((c) => {
          const b = bal.get(c.id) ?? 0;
          return {
            value: c.id,
            label: c.name,
            sub: [c.tax_number, c.city, b ? `${b > 0 ? "Borçlu" : "Alacaklı"} ${formatMoney(Math.abs(b))}` : null].filter(Boolean).join(" · "),
            keywords: `${c.code ?? ""} ${c.phone ?? ""} ${c.mobile ?? ""}`,
          };
        }),
    [contacts.data, kind, bal],
  );
  return (
    <>
      <Combobox
        value={value}
        onChange={(id) => onChange(id, contacts.data?.find((c) => c.id === id))}
        options={options}
        clearable={clearable}
        placeholder={placeholder ?? (kind === "supplier" ? "Tedarikçi seçin" : "Müşteri seçin")}
        searchPlaceholder="Unvan, VKN, telefon…"
        onCreate={(s) => setCreateName(s || "")}
        createLabel={kind === "supplier" ? "Yeni tedarikçi" : "Yeni müşteri"}
      />
      <Dialog open={createName !== null} onOpenChange={(o) => !o && setCreateName(null)}>
        <DialogContent title={kind === "supplier" ? "Yeni tedarikçi" : "Yeni müşteri"} className="sm:max-w-2xl">
          <ContactForm
            defaultKind={kind ?? "customer"}
            defaultName={createName ?? ""}
            onSaved={(c) => {
              setCreateName(null);
              onChange(c.id, c);
            }}
            onCancel={() => setCreateName(null)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
