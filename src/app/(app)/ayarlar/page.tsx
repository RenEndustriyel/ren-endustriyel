"use client";

import { useOrg } from "@/providers/org-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyForm } from "@/components/settings/company-form";
import { NumberSeriesSettings } from "@/components/settings/number-series";
import { UnitsSettings, WarehousesSettings } from "@/components/settings/simple-lists";
import { StockWarningSettings } from "@/components/settings/stock-settings";
import { UsersSettings } from "@/components/settings/users";
import { CategorySettings } from "@/components/settings/categories";
import { NotificationSettings, RatesSettings } from "@/components/settings/notifications";
import { DataResetSettings } from "@/components/settings/data-reset";
import { BackupSettings } from "@/components/settings/backup-settings";

export default function SettingsPage() {
  const { isAdmin } = useOrg();
  return (
    <div className="mx-auto max-w-5xl">
      {!isAdmin && (
        <p className="mb-4 rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning">
          Ayarları yalnızca firma sahibi ve yöneticiler değiştirebilir.
        </p>
      )}
      <Tabs defaultValue="firma">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="firma">Firma Bilgileri</TabsTrigger>
          <TabsTrigger value="numara">Belge Numaraları</TabsTrigger>
          <TabsTrigger value="stok">Stok ve Depolar</TabsTrigger>
          <TabsTrigger value="kategori">Kategoriler</TabsTrigger>
          <TabsTrigger value="kullanici">Kullanıcılar</TabsTrigger>
          <TabsTrigger value="bildirim">Bildirim ve Kur</TabsTrigger>
          <TabsTrigger value="yedekleme">Yedekleme</TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="sifirla"
              className="text-danger data-[state=active]:bg-danger-soft data-[state=active]:text-danger font-medium"
            >
              Verileri Sıfırla
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="firma">
          <CompanyForm />
        </TabsContent>
        <TabsContent value="numara">
          <NumberSeriesSettings />
        </TabsContent>
        <TabsContent value="stok" className="flex flex-col gap-4">
          <StockWarningSettings />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <UnitsSettings />
            <WarehousesSettings />
          </div>
        </TabsContent>
        <TabsContent value="kategori">
          <CategorySettings />
        </TabsContent>
        <TabsContent value="kullanici">
          <UsersSettings />
        </TabsContent>
        <TabsContent value="bildirim" className="grid items-start gap-4 lg:grid-cols-2">
          <NotificationSettings />
          <RatesSettings />
        </TabsContent>
        <TabsContent value="yedekleme">
          <BackupSettings />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="sifirla">
            <DataResetSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
