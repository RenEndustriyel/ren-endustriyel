"use client";

import { useParam } from "@/lib/use-param";
import { ContactDetail } from "@/components/contacts/contact-detail";

export default function Page() {
  const id = useParam("id");
  return id ? <ContactDetail id={id} /> : null;
}
