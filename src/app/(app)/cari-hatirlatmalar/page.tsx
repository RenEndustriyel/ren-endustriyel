import { Metadata } from "next";
import { RemindersList } from "@/components/contacts/reminders-list";

export const metadata: Metadata = {
  title: "Hatırlatmalar · Ren Endüstriyel",
  description: "Cari hatırlatmalar ve açık satış takibi",
};

export default function RemindersPage() {
  return <RemindersList />;
}
