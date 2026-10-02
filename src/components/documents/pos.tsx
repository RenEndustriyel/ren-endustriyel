"use client";

import * as React from "react";
import Link from "next/link";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Banknote,
  CreditCard,
  Landmark,
  BookUser,
  CheckCircle2,
  Printer,
  History,
  AlertTriangle,
  Monitor,
  ScanBarcode,
  PauseCircle,
  PlayCircle,
  Search,
  X,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Settings,
  Clock,
  User,
  Eye,
  EyeOff,
  Percent,
  FileText,
  RotateCcw,
  Camera,
  TrendingUp,
  Sparkles,
  Barcode,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Package,
  Coins,
  Layers,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  newId,
  useAccounts,
  useCategories,
  useContacts,
  useProducts,
  useRpc,
  useUnits,
  type Row,
} from "@/lib/data";
import { addDays, calcDocument, convertVat } from "@/lib/doc-calc";
import { formatDate, formatMoney, formatQty, isoDate } from "@/lib/format";
import { rateFor, useRates } from "@/lib/rates";
import { useOrg } from "@/providers/org-provider";
import { useConfirm } from "@/components/ui/confirm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScanButton } from "@/components/shared/barcode-scanner";
import { BarcodeLabelModal } from "@/components/products/barcode-label-modal";
import { useLocalStorage } from "@/lib/use-local-storage";
import { cn } from "@/lib/utils";

// --- SOUND EFFECTS (Web Audio API) ---
function playPosSound(type: "scan" | "success" | "error" | "click") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "scan") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.07); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.14); // G5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } else if (type === "error") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    }
  } catch {}
}

// --- TYPES ---
export type CartLine = {
  key: string;
  product?: Row<"products">;
  product_id?: string;
  name: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  vat_rate: number;
  unit?: string;
  stock_qty?: number;
  is_unlisted?: boolean;
};

type Method = "cash" | "credit_card" | "bank_transfer" | "credit" | "mixed";

type HeldSale = {
  id: string;
  time: string;
  cart: CartLine[];
  contactId: string | null;
  contactName?: string;
  manualVatRate: number | null;
  method: Method;
  discountValue: number;
  discountType: "rate" | "amount";
};

type PosSaleRecord = {
  id: string;
  date: number;
  customerName: string;
  contactId?: string | null;
  total: number;
  method: string;
  lines: Array<{ name: string; qty: number; unitPrice: number; vat: number; total: number }>;
  isReturn?: boolean;
};

export function PosPage() {
  const { org } = useOrg();
  const confirm = useConfirm();
  const orgSettings = (org?.settings && typeof org.settings === "object" ? org.settings : {}) as Record<string, any>;
  const warnNegativeStock = orgSettings.warn_negative_stock !== false;
  const blockNegativeStock = orgSettings.block_negative_stock === true;

  // Data queries
  const products = useProducts();
  const units = useUnits();
  const cats = useCategories("product");
  const contacts = useContacts();
  const accounts = useAccounts();
  const rates = useRates();
  const saveDoc = useRpc<Row<"documents">>("save_document");

  // Local storage states
  const [storedTheme, setStoredTheme] = useLocalStorage("ren-pos-theme");
  const theme: "classic" | "premium" = (storedTheme as "classic" | "premium") || "classic";
  const setTheme = (val: "classic" | "premium") => setStoredTheme(val);
  const [storedAcc, setStoredAcc] = useLocalStorage("ren-pos-accounts");
  const [heldSalesRaw, setHeldSalesRaw] = useLocalStorage("ren-pos-held-sales");
  const [shiftRaw, setShiftRaw] = useLocalStorage("ren-pos-shift");
  const [salesHistoryRaw, setSalesHistoryRaw] = useLocalStorage("ren-pos-history");

  const isDarkTheme = theme === "premium";

  // POS States
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [selectedRowIdx, setSelectedRowIdx] = React.useState<number>(0);
  const [quantityInput, setQuantityInput] = React.useState<string>("1");
  const [multiplier, setMultiplier] = React.useState<number>(1);
  const [showMultipliers, setShowMultipliers] = React.useState(false);
  const [barcodeQuery, setBarcodeQuery] = React.useState<string>("");
  const [selectedCatId, setSelectedCatId] = React.useState<string>("");
  const [contactId, setContactId] = React.useState<string | null>(null);
  const [priceTier, setPriceTier] = React.useState<"retail" | "wholesale">("retail");
  const [posMode, setPosMode] = React.useState<"sale" | "return">("sale");
  const [invoiceType, setInvoiceType] = React.useState<"normal" | "efatura" | "earsiv">("normal");
  const [cashierName, setCashierName] = React.useState<string>("Operatör");
  const [showCashBalance, setShowCashBalance] = React.useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [receivedInput, setReceivedInput] = React.useState<string>("");
  const [quickKeysWidth, setQuickKeysWidth] = React.useState<number>(320);
  const [isEditingQuickKeys, setIsEditingQuickKeys] = React.useState(false);

  // Discount states
  const [discountType, setDiscountType] = React.useState<"rate" | "amount">("rate");
  const [discountValue, setDiscountValue] = React.useState<number>(0);
  const [manualVatRate, setManualVatRate] = React.useState<number | null>(null);

  // Modals state
  const [customerModalOpen, setCustomerModalOpen] = React.useState(false);
  const [mixedPayModalOpen, setMixedPayModalOpen] = React.useState(false);
  const [unlistedModalOpen, setUnlistedModalOpen] = React.useState(false);
  const [discountModalOpen, setDiscountModalOpen] = React.useState(false);
  const [oldReceiptsModalOpen, setOldReceiptsModalOpen] = React.useState(false);
  const [zReportModalOpen, setZReportModalOpen] = React.useState(false);
  const [priceCheckModalOpen, setPriceCheckModalOpen] = React.useState(false);
  const [productListModalOpen, setProductListModalOpen] = React.useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = React.useState(false);
  const [mobileQuickDrawerOpen, setMobileQuickDrawerOpen] = React.useState(false);
  const [receiptDoneModal, setReceiptDoneModal] = React.useState<PosSaleRecord | null>(null);

  // References
  const barcodeInputRef = React.useRef<HTMLInputElement>(null);
  const quantityInputRef = React.useRef<HTMLInputElement>(null);
  const receivedInputRef = React.useRef<HTMLInputElement>(null);
  const customerSearchRef = React.useRef<HTMLInputElement>(null);

  // Real-time clock
  const [currentTime, setCurrentTime] = React.useState<string>("");
  React.useEffect(() => {
    const update = () => setCurrentTime(new Date().toLocaleTimeString("tr-TR"));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Accounts & balances
  const allAccounts = accounts.data ?? [];
  const activeCashAccounts = allAccounts.filter((a) => a.is_active && a.type === "cash" && a.currency === "TRY");
  const activeBankAccounts = allAccounts.filter((a) => a.is_active && a.type === "bank" && a.currency === "TRY");
  const totalCashBalance = activeCashAccounts.reduce((sum, a) => sum + Number(a.balance ?? 0), 0);

  const selectedCustomer = (contacts.data ?? []).find((c) => c.id === contactId);

  // Price calculations
  const getProductPrice = React.useCallback(
    (p: Row<"products">) => {
      const wholesale = (p as any).wholesale_price ? Number((p as any).wholesale_price) : null;
      let raw = priceTier === "wholesale" && wholesale ? wholesale : Number(p.sale_price || 0);
      if (p.sale_currency && p.sale_currency !== "TRY") {
        raw *= rateFor(rates.data, p.sale_currency) || 1;
      }
      return Math.round(convertVat(raw, Number(p.vat_rate || 20), p.sale_price_includes_vat ?? true, true) * 100) / 100;
    },
    [priceTier, rates.data]
  );

  // Document calculations
  const calc = React.useMemo(() => {
    return calcDocument(
      {
        prices_include_vat: true,
        discount_type: discountType,
        discount_value: discountValue,
        exchange_rate: 1,
      },
      cart.map((l) => ({
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_rate: l.discount_rate,
        vat_rate: Number(l.vat_rate),
      }))
    );
  }, [cart, discountType, discountValue]);

  const receivedAmount = Number(receivedInput.replace(",", ".")) || 0;
  const changeAmount = receivedAmount > calc.total ? Math.round((receivedAmount - calc.total) * 100) / 100 : 0;

  // Sync to customer kiosk display
  React.useEffect(() => {
    if (cart.length === 0) {
      try {
        localStorage.setItem("ren:pos-display", JSON.stringify({ mode: "idle", updatedAt: Date.now() }));
      } catch {}
      return;
    }
    const last = cart[cart.length - 1];
    try {
      localStorage.setItem(
        "ren:pos-display",
        JSON.stringify({
          mode: "item",
          sku: last.barcode || "",
          productName: last.name,
          qty: last.quantity,
          unitPriceGross: last.unit_price,
          cartTotal: calc.total,
          cartCount: cart.reduce((s, l) => s + l.quantity, 0),
          updatedAt: Date.now(),
        })
      );
    } catch {}
  }, [cart, calc.total]);

  // Focus barcode on mount
  React.useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // --- CART OPERATIONS ---
  const addToCart = React.useCallback(
    (product: Row<"products">, customQty?: number) => {
      const qtyToAdd = customQty !== undefined ? customQty : (parseFloat(quantityInput) || 1) * multiplier;
      const unitPrice = getProductPrice(product);
      const vat = manualVatRate !== null ? manualVatRate : Number(product.vat_rate ?? 20);

      setCart((prev) => {
        const existingIdx = prev.findIndex((l) => l.product_id === product.id);
        if (existingIdx >= 0) {
          return prev.map((l, idx) =>
            idx === existingIdx ? { ...l, quantity: Math.round((l.quantity + qtyToAdd) * 1000) / 1000 } : l
          );
        }
        return [
          ...prev,
          {
            key: newId(),
            product_id: product.id,
            product,
            name: product.name,
            barcode: product.barcode || product.code || "",
            quantity: qtyToAdd,
            unit_price: unitPrice,
            discount_rate: 0,
            vat_rate: vat,
            unit: (units.data ?? []).find((u) => u.id === product.unit_id)?.code || "ad",
            stock_qty: Number(product.stock_qty ?? 0),
          },
        ];
      });

      playPosSound("scan");
      setQuantityInput("1");
      setMultiplier(1);
      setShowMultipliers(false);
      setBarcodeQuery("");
      barcodeInputRef.current?.focus();
    },
    [quantityInput, multiplier, getProductPrice, manualVatRate, units.data]
  );

  const addUnlistedToCart = (name: string, price: number, vat: number, qty: number) => {
    setCart((prev) => [
      ...prev,
      {
        key: newId(),
        name,
        quantity: qty,
        unit_price: price,
        discount_rate: 0,
        vat_rate: vat,
        unit: "ad",
        is_unlisted: true,
      },
    ]);
    playPosSound("scan");
    setUnlistedModalOpen(false);
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = barcodeQuery.trim();
    if (!raw) return;

    // Check multiplier syntax: e.g. "4*8690001" or "3x8690001"
    let parsedQty = (parseFloat(quantityInput) || 1) * multiplier;
    let code = raw;

    const starMatch = raw.match(/^(\d+(?:[.,]\d+)?)[*xX](.+)$/);
    if (starMatch) {
      parsedQty = parseFloat(starMatch[1].replace(",", ".")) || 1;
      code = starMatch[2].trim();
    }

    const allProds = products.data ?? [];
    const matched = allProds.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
        (p.code && p.code.toLowerCase() === code.toLowerCase()) ||
        p.name.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      addToCart(matched, parsedQty);
    } else {
      playPosSound("error");
      toast.error(`Barkod veya ürün bulunamadı: "${code}"`);
    }
  };

  // Keyboard Shortcuts Handler (F1 - F12)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default on F keys
      if (/^F([1-9]|1[0-2])$/.test(e.key) && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
      }

      // F1: Nakit Satış
      if (e.key === "F1") {
        e.preventDefault();
        handlePayment("cash");
      }
      // F2: Ürün Ara Listesi
      else if (e.key === "F2") {
        e.preventDefault();
        setProductListModalOpen(true);
      }
      // F3: Miktar Alanına Odaklan
      else if (e.key === "F3") {
        e.preventDefault();
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }
      // F4: Barkod Alanına Odaklan
      else if (e.key === "F4") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      }
      // F5: Ödenen Tutar Alanı
      else if (e.key === "F5") {
        e.preventDefault();
        receivedInputRef.current?.focus();
        receivedInputRef.current?.select();
      }
      // F6: Veresiye Satış
      else if (e.key === "F6") {
        e.preventDefault();
        handlePayment("credit");
      }
      // F7: Tam Ekran
      else if (e.key === "F7") {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
      // F8: Müşteri Seç
      else if (e.key === "F8") {
        e.preventDefault();
        setCustomerModalOpen(true);
      }
      // F9: Kredi Kartı Satış
      else if (e.key === "F9") {
        e.preventDefault();
        handlePayment("credit_card");
      }
      // F10: Karma Ödeme (Nakit+Kart)
      else if (e.key === "F10") {
        e.preventDefault();
        setMixedPayModalOpen(true);
      }
      // F11: İndirim Tutar (₺)
      else if (e.key === "F11") {
        e.preventDefault();
        setDiscountType("amount");
        setDiscountModalOpen(true);
      }
      // F12: İskonto Oranı (%)
      else if (e.key === "F12") {
        e.preventDefault();
        setDiscountType("rate");
        setDiscountModalOpen(true);
      }
      // Ctrl + Enter: Satışı Tamamla
      else if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        handlePayment("cash");
      }
      // ArrowUp / ArrowDown in Cart Table
      else if (
        (e.key === "ArrowUp" || e.key === "ArrowDown") &&
        cart.length > 0 &&
        !(document.activeElement instanceof HTMLInputElement)
      ) {
        e.preventDefault();
        setSelectedRowIdx((prev) => (e.key === "ArrowUp" ? Math.max(0, prev - 1) : Math.min(cart.length - 1, prev + 1)));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, calc.total, receivedAmount, contactId]);

  // Held Sales Storage
  const heldSales: HeldSale[] = React.useMemo(() => {
    try {
      return heldSalesRaw ? JSON.parse(heldSalesRaw) : [];
    } catch {
      return [];
    }
  }, [heldSalesRaw]);

  const holdCurrentSale = () => {
    if (!cart.length) return toast.error("Bekletilecek ürün yok");
    if (heldSales.length >= 5) return toast.error("En fazla 5 bekleyen satış tutulabilir");
    const newHeld: HeldSale = {
      id: newId(),
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      cart: [...cart],
      contactId,
      contactName: selectedCustomer?.name,
      manualVatRate,
      method: "cash",
      discountValue,
      discountType,
    };
    setHeldSalesRaw(JSON.stringify([newHeld, ...heldSales]));
    setCart([]);
    setContactId(null);
    setDiscountValue(0);
    setReceivedInput("");
    toast.success("Satış beklemeye alındı");
  };

  const restoreHeldSale = (item: HeldSale) => {
    setCart(item.cart);
    setContactId(item.contactId);
    setManualVatRate(item.manualVatRate);
    setDiscountValue(item.discountValue);
    setDiscountType(item.discountType);
    setHeldSalesRaw(JSON.stringify(heldSales.filter((h) => h.id !== item.id)));
    toast.success("Bekleyen satış yüklendi");
  };

  // --- PAYMENT COMPLETION ---
  const handlePayment = async (
    methodType: Method,
    options?: { cashAmount?: number; cardAmount?: number; cashAccountId?: string; cardAccountId?: string }
  ) => {
    if (!cart.length) {
      toast.error("Sepette ürün yok");
      return;
    }

    if (methodType === "credit" && !contactId) {
      playPosSound("error");
      toast.error("Veresiye için müşteri seçin (F8)");
      setCustomerModalOpen(true);
      return;
    }

    const defaultCashId = activeCashAccounts[0]?.id || allAccounts[0]?.id || "";
    const defaultBankId = activeBankAccounts[0]?.id || allAccounts[0]?.id || "";
    const finalAccountId =
      methodType === "cash"
        ? defaultCashId
        : methodType === "credit_card"
        ? defaultBankId
        : "";

    if (methodType !== "credit" && methodType !== "mixed" && !finalAccountId) {
      toast.error("Önce Kasa veya Banka hesabı tanımlayın.");
      return;
    }

    // Negative stock check
    if (warnNegativeStock || blockNegativeStock) {
      const negativeList = cart.filter(
        (l) => l.product && l.product.track_stock && Number(l.product.stock_qty || 0) - l.quantity < 0
      );
      if (negativeList.length > 0) {
        if (blockNegativeStock) {
          playPosSound("error");
          toast.error("Eksi stoklu ürün satışı işletme ayarlarında engellenmiştir!");
          return;
        }
        if (warnNegativeStock) {
          const ok = await confirm({
            title: "⚠️ Eksi Stok Uyarısı",
            description: `Sepetteki bazı ürünler stok miktarından fazladır:\n${negativeList
              .map((n) => `• ${n.name} (Stok: ${n.stock_qty})`)
              .join("\n")}\nDevam edilsin mi?`,
            confirmText: "Satışı Onayla",
          });
          if (!ok) return;
        }
      }
    }

    const docId = newId();
    const isReturn = posMode === "return";
    const docType = isReturn ? "sales_return" : "pos_sale";

    try {
      await saveDoc.call({
        p_doc: {
          id: docId,
          org_id: org!.id,
          doc_type: docType,
          status: "approved",
          issue_date: isoDate(),
          due_date: methodType === "credit" ? addDays(isoDate(), selectedCustomer?.payment_term_days || 30) : isoDate(),
          contact_id: contactId,
          currency: "TRY",
          exchange_rate: 1,
          prices_include_vat: true,
          discount_type: discountType,
          discount_value: discountValue,
          description: isReturn
            ? "Hızlı Satış İadesi"
            : `POS Satışı · ${methodType === "cash" ? "Nakit" : methodType === "credit_card" ? "Kart" : methodType === "mixed" ? "Karma" : "Veresiye"}`,
        },
        p_lines: cart.map((l) => ({
          product_id: l.product_id || null,
          description: l.name,
          quantity: l.quantity,
          unit_factor: 1,
          unit_price: l.unit_price,
          discount_rate: l.discount_rate,
          vat_rate: Number(l.vat_rate),
        })),
        p_payment:
          methodType === "credit"
            ? null
            : {
                id: newId(),
                account_id: finalAccountId || defaultCashId,
                method: methodType === "mixed" ? "cash" : methodType,
                amount: calc.total,
              },
      });

      playPosSound("success");
      toast.success(isReturn ? "İade tamamlandı" : "Satış tamamlandı");

      const saleRecord: PosSaleRecord = {
        id: docId,
        date: Date.now(),
        customerName: selectedCustomer?.name || "Perakende Müşteri",
        contactId,
        total: calc.total,
        method: methodType === "cash" ? "Nakit" : methodType === "credit_card" ? "Kredi Kartı" : methodType === "credit" ? "Veresiye" : "Nakit + Kart",
        lines: cart.map((l) => ({
          name: l.name,
          qty: l.quantity,
          unitPrice: l.unit_price,
          vat: l.vat_rate,
          total: Math.round(l.quantity * l.unit_price * 100) / 100,
        })),
        isReturn,
      };

      // Save to history
      const prevHist: PosSaleRecord[] = salesHistoryRaw ? JSON.parse(salesHistoryRaw) : [];
      setSalesHistoryRaw(JSON.stringify([saleRecord, ...prevHist.slice(0, 30)]));

      // Show receipt modal
      setReceiptDoneModal(saleRecord);

      // Reset
      setCart([]);
      setContactId(null);
      setDiscountValue(0);
      setReceivedInput("");
      setPosMode("sale");
      barcodeInputRef.current?.focus();
    } catch (err: any) {
      playPosSound("error");
      toast.error(`Satış kaydedilemedi: ${err?.message || err}`);
    }
  };

  // Undo last sale
  const handleUndoLastSale = async () => {
    const prevHist: PosSaleRecord[] = salesHistoryRaw ? JSON.parse(salesHistoryRaw) : [];
    if (!prevHist.length) return toast.info("Geri alınacak son satış bulunamadı");
    const last = prevHist[0];

    const ok = await confirm({
      title: "Son Satış Geri Alınsın mı?",
      description: `"${last.customerName}" adına kesilen ${formatMoney(last.total)} tutarındaki satış geri alınacaktır.`,
      confirmText: "Evet, Geri Al",
    });
    if (!ok) return;

    // Load lines into cart as return mode
    setCart(
      last.lines.map((l) => ({
        key: newId(),
        name: l.name,
        quantity: l.qty,
        unit_price: l.unitPrice,
        discount_rate: 0,
        vat_rate: l.vat,
        unit: "ad",
      }))
    );
    setContactId(last.contactId || null);
    setPosMode("return");
    setSalesHistoryRaw(JSON.stringify(prevHist.slice(1)));
    toast.success("Son satış sepete iade olarak yüklendi");
  };

  // Quick Key Slots (Category filter or all)
  const quickKeyProducts = React.useMemo(() => {
    const list = products.data ?? [];
    if (!selectedCatId) return list.slice(0, 24);
    return list.filter((p) => p.category_id === selectedCatId).slice(0, 24);
  }, [products.data, selectedCatId]);

  // Autocomplete products when typing barcode
  const autocompleteList = React.useMemo(() => {
    const q = barcodeQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return (products.data ?? [])
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q))
      )
      .slice(0, 7);
  }, [barcodeQuery, products.data]);

  return (
    <div
      className={cn(
        isFullscreen ? "fixed inset-0 z-[999] flex flex-col overflow-hidden" : "flex flex-col h-full min-h-0 overflow-hidden",
        isDarkTheme
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
          : "bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100",
        "w-full max-w-full select-none"
      )}
    >
      {/* =========================================================================
          1. TOP MAIN HEADER BAR (Cash Register, Currency, Cashier, Live Cash, Clock, Themes)
          ========================================================================= */}
      <header
        className={cn(
          "shrink-0 h-10 md:h-11 px-2 md:px-4 flex items-center gap-2 md:gap-3 text-xs md:text-sm font-medium border-b",
          isDarkTheme
            ? "bg-gradient-to-r from-slate-800 to-slate-700 border-slate-700 text-slate-100"
            : "bg-gradient-to-r from-teal-700 to-teal-600 border-teal-600/30 text-white shadow-sm"
        )}
      >
        {/* Kasa Adı */}
        <div className="flex items-center gap-1.5 font-bold tracking-wide text-[13px] md:text-[15px] min-w-0">
          <Package size={17} className="shrink-0 opacity-90" />
          <span className="truncate max-w-[14rem] sm:max-w-none">{org?.name || "Ren POS"}</span>
        </div>

        {/* Para Birimi Badge */}
        <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">TRY</span>

        <span className="opacity-30 hidden sm:inline">|</span>

        {/* Kasiyer Seçici */}
        <div className="hidden sm:inline-flex items-center gap-1.5 max-w-[10rem] text-xs">
          <User size={14} className="opacity-80 shrink-0" />
          <select
            value={cashierName}
            onChange={(e) => setCashierName(e.target.value)}
            className="bg-transparent border-0 outline-none font-semibold text-xs truncate cursor-pointer text-white"
          >
            <option value="Operatör" className="text-slate-900">Operatör</option>
            <option value="Kasiyer 1" className="text-slate-900">Kasiyer 1</option>
            <option value="Yönetici" className="text-slate-900">Yönetici</option>
          </select>
        </div>

        <span className="opacity-30 hidden lg:inline">|</span>

        {/* Canlı Kasa Bakiyesi Toggle */}
        <button
          type="button"
          onClick={() => setShowCashBalance((v) => !v)}
          className="hidden lg:inline-flex items-center gap-1.5 tabular-nums text-xs font-semibold hover:bg-white/10 px-2 py-1 rounded-md transition"
          title={showCashBalance ? "Kasa tutarını gizle" : "Kasa tutarını göster"}
        >
          <Coins size={14} className="opacity-80" />
          <span>Kasa: {showCashBalance ? formatMoney(totalCashBalance) : "₺ •••••"}</span>
          {showCashBalance ? <EyeOff size={13} className="opacity-70" /> : <Eye size={13} className="opacity-70" />}
        </button>

        {/* Sağ: Online, Saat, Tema, Ayarlar, Tam Ekran */}
        <div className="ml-auto flex items-center gap-2 md:gap-3 shrink-0">
          {/* Online Işık */}
          <div className="hidden xl:inline-flex items-center gap-1.5 text-xs text-white/90">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </div>

          {/* Canlı Saat */}
          <div className="inline-flex items-center gap-1 tabular-nums font-semibold text-white text-xs md:text-sm">
            <Clock size={14} className="opacity-80" />
            <span>{currentTime}</span>
          </div>

          {/* Tema Seçici: Classic (Yeşil) / Premium (Koyu) */}
          <div className="hidden sm:flex items-center rounded-lg bg-black/20 p-0.5 text-xs font-bold">
            <button
              onClick={() => setTheme("classic")}
              className={cn(
                "px-2 py-0.5 rounded-md flex items-center gap-1 transition text-[11px]",
                !isDarkTheme ? "bg-white text-teal-900 shadow-xs" : "text-white/80 hover:text-white"
              )}
              title="Açık Yeşil Tema"
            >
              <Sun size={12} /> Klasik
            </button>
            <button
              onClick={() => setTheme("premium")}
              className={cn(
                "px-2 py-0.5 rounded-md flex items-center gap-1 transition text-[11px]",
                isDarkTheme ? "bg-teal-400 text-slate-900 shadow-xs font-bold" : "text-white/80 hover:text-white"
              )}
              title="Koyu Tema"
            >
              <Moon size={12} /> Premium
            </button>
          </div>

          {/* Tam Ekran Toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-white/15 transition text-white"
            title={isFullscreen ? "Tam ekrandan çık (F7)" : "Tam ekran (F7)"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. SUB-HEADER ACTION RIBBON (Customer, Return Mode, Undo, Barcode Print, Wholesale, Z-Report)
          ========================================================================= */}
      <div
        className={cn(
          "shrink-0 px-2 md:px-3 py-1.5 flex flex-nowrap items-center gap-1.5 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isDarkTheme ? "bg-slate-800/80 border-slate-700/80" : "bg-teal-50/80 border-teal-200"
        )}
      >
        {/* Müşteri Seç Butonu (F8) */}
        <button
          type="button"
          onClick={() => setCustomerModalOpen(true)}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition shadow-xs",
            isDarkTheme
              ? "bg-teal-600 text-white hover:bg-teal-500 border border-teal-400/40"
              : "bg-teal-700 text-white hover:bg-teal-800"
          )}
          title="Müşteri Seç (F8)"
        >
          <User size={14} className="shrink-0" />
          <span className="max-w-[10rem] md:max-w-[13rem] truncate">
            {selectedCustomer ? selectedCustomer.name : "Perakende Müşteri"}
          </span>
          {selectedCustomer && (
            <span className="rounded bg-white/20 px-1 py-0.5 text-[10px] tabular-nums font-mono">
              {formatMoney((selectedCustomer as any).balance ?? 0)}
            </span>
          )}
          <kbd className="hidden md:inline text-[10px] font-normal opacity-80 ml-0.5">F8</kbd>
        </button>

        {/* Hızlı Tuşlar (Mobil Çekmece Butonu) */}
        <button
          type="button"
          onClick={() => setMobileQuickDrawerOpen(true)}
          className={cn(
            "md:hidden shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold",
            isDarkTheme ? "bg-teal-700/50 text-white border border-teal-500/30" : "bg-teal-100 text-teal-900 border border-teal-300"
          )}
        >
          <Sparkles size={13} /> Hızlı Tuşlar
        </button>

        {/* İade Modu Toggle */}
        <button
          type="button"
          onClick={() => setPosMode((prev) => (prev === "sale" ? "return" : "sale"))}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
            posMode === "return"
              ? "bg-rose-600 text-white animate-pulse"
              : isDarkTheme
              ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
              : "bg-white border border-teal-200 text-teal-900 hover:bg-teal-50"
          )}
          title="İade Satış Modu"
        >
          <RotateCcw size={13} />
          <span>İade Modu</span>
        </button>

        {/* Son Satışı Geri Al */}
        <button
          type="button"
          onClick={handleUndoLastSale}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
            isDarkTheme ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-white border border-teal-200 text-teal-900 hover:bg-teal-50"
          )}
          title="Son satışı geri al"
        >
          <span>↩ Geri Al</span>
        </button>

        {/* Barkod Yazdır */}
        <button
          type="button"
          onClick={() => setBarcodeModalOpen(true)}
          className={cn(
            "shrink-0 hidden sm:inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
            isDarkTheme ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-white border border-teal-200 text-teal-900 hover:bg-teal-50"
          )}
          title="Barkod Etiketi Bas"
        >
          <Barcode size={13} /> Barkod Yazdır
        </button>

        {/* Fiyat Gör Ekranı */}
        <button
          type="button"
          onClick={() => setPriceCheckModalOpen(true)}
          className={cn(
            "shrink-0 hidden sm:inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
            isDarkTheme ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-white border border-teal-200 text-teal-900 hover:bg-teal-50"
          )}
          title="Fiyat Gör / Müşteri Ekranı"
        >
          <Monitor size={13} /> Fiyat Gör
        </button>

        {/* 2. Fiyat (Toptan) Toggle */}
        <button
          type="button"
          onClick={() => setPriceTier((p) => (p === "retail" ? "wholesale" : "retail"))}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
            priceTier === "wholesale"
              ? "bg-amber-500 text-white"
              : isDarkTheme
              ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
              : "bg-white border border-teal-200 text-teal-900 hover:bg-teal-50"
          )}
          title="Toptan / Perakende Fiyat Değiştir"
        >
          <Tag size={13} /> {priceTier === "wholesale" ? "Toptan Fiyatı" : "2. Fiyat"}
        </button>

        {/* Z Raporu */}
        <button
          type="button"
          onClick={() => setZReportModalOpen(true)}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
            isDarkTheme ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-white border border-teal-200 text-teal-900 hover:bg-teal-50"
          )}
          title="Z Raporu — Gün Sonu"
        >
          <FileText size={13} /> Z Raporu
        </button>

        {/* Fatura Türü Seçici */}
        <div className="md:ml-auto inline-flex items-center gap-1.5 text-xs font-bold shrink-0">
          <select
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as any)}
            className={cn(
              "rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer",
              isDarkTheme
                ? "bg-slate-800 border border-slate-600 text-slate-100"
                : "bg-white border border-teal-300 text-teal-900"
            )}
          >
            <option value="normal">Fiş / Satış Notu</option>
            <option value="efatura">e-Fatura</option>
            <option value="earsiv">e-Arşiv Fatura</option>
          </select>
        </div>
      </div>

      {/* İade Modu Üst Şeridi */}
      {posMode === "return" && (
        <div className="shrink-0 px-3 py-1.5 flex items-center justify-between border-b bg-rose-600 text-white text-xs font-bold">
          <div className="flex items-center gap-2">
            <RotateCcw size={15} className="animate-spin" />
            <span>İADE MODU AKTİF — Okutulan ürünler stoka geri girer ve tutar iade olarak kaydedilir.</span>
          </div>
          <button
            type="button"
            onClick={() => setPosMode("sale")}
            className="underline hover:opacity-80 text-white font-bold"
          >
            Normal Satışa Dön
          </button>
        </div>
      )}

      {/* =========================================================================
          3. 12-COLUMN INPUT BAR (Quantity, Multiplier Buttons, Barcode/Search, Cancel)
          ========================================================================= */}
      <div
        className={cn(
          "shrink-0 px-2 md:px-3 py-2 grid grid-cols-12 gap-2 border-b",
          isDarkTheme ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200"
        )}
      >
        {/* Miktar (2 Column) */}
        <div className="col-span-3 sm:col-span-2 min-w-0">
          <label className="text-[11px] font-bold uppercase tracking-wide text-teal-800 dark:text-teal-400 block mb-0.5">
            Miktar (F3)
          </label>
          <div className="flex items-stretch gap-1">
            <div className="hidden sm:flex flex-col">
              <button
                type="button"
                onClick={() => setQuantityInput((v) => String((parseFloat(v) || 0) + 1))}
                className="h-5 w-6 rounded-t bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-300"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => setQuantityInput((v) => String(Math.max(1, (parseFloat(v) || 0) - 1)))}
                className="h-5 w-6 rounded-b bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-300"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <input
              ref={quantityInputRef}
              type="number"
              min={0.01}
              step="any"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  barcodeInputRef.current?.focus();
                }
              }}
              onFocus={(e) => e.currentTarget.select()}
              className={cn(
                "w-full h-10 rounded-lg px-1 text-center text-xl font-black tabular-nums outline-none border transition-colors",
                isDarkTheme
                  ? "bg-slate-900 border-slate-700 text-white focus:border-teal-400"
                  : "bg-white border-teal-300 text-slate-900 focus:border-teal-600"
              )}
            />
          </div>
        </div>

        {/* Çarpan Butonları (2 Column - Hidden on mobile) */}
        <div className="hidden sm:block sm:col-span-2 min-w-0 relative">
          <label className="text-[11px] font-bold uppercase tracking-wide text-teal-800 dark:text-teal-400 block mb-0.5">
            Çarpan
          </label>
          <div className="flex gap-1 h-10">
            {[2, 3, 4, 5].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMultiplier(m);
                  barcodeInputRef.current?.focus();
                }}
                className={cn(
                  "flex-1 rounded-lg text-sm font-black tabular-nums transition border",
                  multiplier === m
                    ? "bg-teal-600 text-white border-teal-600"
                    : isDarkTheme
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                    : "bg-white border-teal-200 text-teal-900 hover:bg-teal-50"
                )}
              >
                {m}×
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowMultipliers((v) => !v)}
              className={cn(
                "w-8 rounded-lg text-sm font-black transition border flex items-center justify-center",
                multiplier > 5
                  ? "bg-amber-500 text-white border-amber-500"
                  : isDarkTheme
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-white border-teal-200 text-teal-900"
              )}
            >
              {multiplier > 5 ? `${multiplier}×` : "+"}
            </button>
          </div>

          {/* Diğer Çarpanlar Popover */}
          {showMultipliers && (
            <div className="absolute left-0 top-full mt-1 z-30 flex gap-1 rounded-lg p-1.5 shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {[6, 8, 10, 12, 20, 24, 50, 100].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setMultiplier(num);
                    setShowMultipliers(false);
                    barcodeInputRef.current?.focus();
                  }}
                  className="px-2 py-1 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-teal-600 hover:text-white"
                >
                  {num}×
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Barkod / Ürün Arama Input (7-8 Column) */}
        <div className="col-span-7 sm:col-span-7 min-w-0 relative">
          <label className="text-[11px] font-bold uppercase tracking-wide text-teal-800 dark:text-teal-400 block mb-0.5">
            Barkod / Ürün Ara (F4)
          </label>
          <form onSubmit={handleBarcodeSubmit} className="flex gap-1.5 h-10">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value)}
                placeholder="Barkod okutun veya ürün adı yazın..."
                className={cn(
                  "w-full h-full rounded-lg pl-9 pr-14 text-sm md:text-base font-semibold outline-none border transition-colors",
                  isDarkTheme
                    ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-teal-400"
                    : "bg-white border-teal-300 text-slate-900 placeholder:text-slate-400 focus:border-teal-600"
                )}
              />
              {/* Aktif Çarpan Rozeti */}
              {multiplier > 1 && (
                <button
                  type="button"
                  onClick={() => setMultiplier(1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-1.5 py-0.5 tabular-nums shadow-xs"
                  title="Çarpanı sıfırla (1x)"
                >
                  {multiplier}×
                </button>
              )}
            </div>

            {/* Tüm Ürünler (F2) Butonu */}
            <button
              type="button"
              onClick={() => setProductListModalOpen(true)}
              className={cn(
                "px-3 rounded-lg flex items-center justify-center transition border font-bold text-xs shrink-0",
                isDarkTheme
                  ? "bg-teal-700/40 text-teal-200 border-teal-500/30 hover:bg-teal-700/60"
                  : "bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100"
              )}
              title="Tüm Ürün Listesi (F2)"
            >
              <Search size={15} className="mr-1 hidden sm:inline" />
              <span>Ürünler (F2)</span>
            </button>

            {/* Kamera Barkod Okut Butonu */}
            <button
              type="button"
              onClick={() => setBarcodeModalOpen(true)}
              className="px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shrink-0 transition"
              title="Kamera ile Barkod Okut"
            >
              <Camera size={16} />
            </button>
          </form>

          {/* Canlı Arama Sonuçları Popup */}
          {autocompleteList.length > 0 && (
            <div
              className={cn(
                "absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-2xl z-40 max-h-80 overflow-y-auto",
                isDarkTheme ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
              )}
            >
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide border-b bg-slate-50 dark:bg-slate-800/80 text-slate-500">
                Bulunan Ürünler — Dokunarak Sepete Ekle
              </div>
              {autocompleteList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left border-b last:border-0 hover:bg-teal-50 dark:hover:bg-slate-800/60 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">{p.name}</div>
                    <div className="text-xs text-slate-400">
                      Barkod: {p.barcode || "—"} · Stok: {p.stock_qty ?? 0} ad
                    </div>
                  </div>
                  <div className="text-sm font-black text-teal-600 dark:text-teal-400 tabular-nums shrink-0 ml-3">
                    {formatMoney(getProductPrice(p))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* İptal Butonu (1-2 Column) */}
        <div className="col-span-2 sm:col-span-1 min-w-0">
          <label className="text-[11px] font-bold uppercase tracking-wide text-rose-600 block mb-0.5 truncate">
            İptal
          </label>
          <button
            type="button"
            onClick={async () => {
              if (!cart.length) return;
              const ok = await confirm({
                title: "Satış İptal Edilsin mi?",
                description: "Sepetteki tüm ürünler temizlenecektir.",
                confirmText: "Evet, İptal Et",
              });
              if (ok) {
                setCart([]);
                setDiscountValue(0);
                setReceivedInput("");
                toast.info("Satış iptal edildi");
              }
            }}
            className="w-full h-10 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 flex items-center justify-center transition"
            title="Satışı İptal Et"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          4. MAIN MIDDLE WORKSPACE (Left: Cart Table & Payment | Right: Quick Keys Panel)
          ========================================================================= */}
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* SOL: SEPET VE ÖDEME ALANI */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Sepet Tablosu */}
          <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center text-slate-400">
                <ShoppingCart size={48} className="opacity-30 mb-3" />
                <p className="text-base font-bold text-slate-600 dark:text-slate-300">Sepette ürün yok</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Barkod okutun, sağdaki hızlı ürün butonlarına basın veya F2 tuşuyla ürün arayın.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse text-left">
                <thead
                  className={cn(
                    "sticky top-0 z-10 text-xs font-bold uppercase tracking-wider",
                    isDarkTheme ? "bg-slate-800 text-slate-200" : "bg-teal-700 text-white"
                  )}
                >
                  <tr>
                    <th className="py-2.5 px-3 w-32 hidden xl:table-cell">Barkod</th>
                    <th className="py-2.5 px-3">Ürünün Adı</th>
                    <th className="py-2.5 px-2 text-right w-20">Kalan</th>
                    <th className="py-2.5 px-2 text-right w-24">Fiyatı</th>
                    <th className="py-2.5 px-2 text-center w-32 xl:w-36">Miktar</th>
                    <th className="py-2.5 px-2 text-left w-16 hidden sm:table-cell">Birim</th>
                    <th className="py-2.5 px-3 text-right w-28">Tutar</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {cart.map((line, idx) => {
                    const isSelected = selectedRowIdx === idx;
                    const lineTotal = Math.round(line.quantity * line.unit_price * (1 - line.discount_rate / 100) * 100) / 100;
                    const isOutOfStock = (line.stock_qty ?? 0) <= 0;

                    return (
                      <tr
                        key={line.key}
                        onClick={() => setSelectedRowIdx(idx)}
                        className={cn(
                          "cursor-pointer transition",
                          isSelected
                            ? isDarkTheme
                              ? "bg-teal-900/40"
                              : "bg-teal-50"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        )}
                      >
                        {/* Barkod */}
                        <td className="py-2 px-3 font-mono text-xs text-slate-400 hidden xl:table-cell truncate">
                          {line.barcode || "—"}
                        </td>

                        {/* Ürün Adı */}
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{line.name}</div>
                          {line.is_unlisted && (
                            <span className="inline-block text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                              Stoksuz Ürün
                            </span>
                          )}
                        </td>

                        {/* Kalan Stok */}
                        <td className="py-2 px-2 text-right tabular-nums text-xs">
                          <span
                            className={cn(
                              "font-bold",
                              isOutOfStock ? "text-rose-600" : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {line.stock_qty !== undefined ? line.stock_qty : "—"}
                          </span>
                        </td>

                        {/* Fiyatı (Tıklanıp Düzenlenebilir) */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            value={line.unit_price}
                            onChange={(e) => {
                              const newP = parseFloat(e.target.value) || 0;
                              setCart((prev) => prev.map((l, i) => (i === idx ? { ...l, unit_price: newP } : l)));
                            }}
                            className="w-20 bg-transparent text-right font-bold tabular-nums outline-none border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-teal-500"
                          />
                        </td>

                        {/* Miktar Stepper */}
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCart((prev) =>
                                  prev.map((l, i) =>
                                    i === idx ? { ...l, quantity: Math.max(1, l.quantity - 1) } : l
                                  )
                                );
                              }}
                              className="size-7 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold"
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              step="any"
                              value={line.quantity}
                              onChange={(e) => {
                                const newQ = parseFloat(e.target.value) || 1;
                                setCart((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: newQ } : l)));
                              }}
                              className="w-12 text-center font-black tabular-nums bg-transparent outline-none text-sm"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCart((prev) =>
                                  prev.map((l, i) => (i === idx ? { ...l, quantity: l.quantity + 1 } : l))
                                );
                              }}
                              className="size-7 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </td>

                        {/* Birim */}
                        <td className="py-2 px-2 text-xs text-slate-500 hidden sm:table-cell">{line.unit || "ad"}</td>

                        {/* Tutar */}
                        <td className="py-2 px-3 text-right font-black tabular-nums text-sm text-slate-900 dark:text-slate-100">
                          {formatMoney(lineTotal)}
                        </td>

                        {/* Sil Butonu */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCart((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Satırdan kaldır"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* =========================================================================
              ALT ÖDEME VE KASA KONTROL MERKEZİ (Totals, Ödenen, Para Üstü, Hızlı Banknotlar, Ödeme Butonları)
              ========================================================================= */}
          <div
            className={cn(
              "shrink-0 p-2.5 sm:p-3 border-t",
              isDarkTheme ? "bg-slate-800/90 border-slate-700" : "bg-white border-slate-200 shadow-md"
            )}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">
              {/* SOL KISIM: Ödeme Butonları Grid (7 Columns) */}
              <div className="md:col-span-7 flex flex-col gap-1.5 order-2 md:order-1">
                {/* 1. Sıra: Büyük Nakit ve Kart Butonları */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePayment("cash")}
                    disabled={!cart.length}
                    className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white flex items-center justify-center gap-2 font-black text-base shadow-sm transition disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Banknote size={20} />
                    <span>Nakit</span>
                    <kbd className="bg-white/25 px-1.5 py-0.5 rounded text-xs font-mono">F1</kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePayment("credit_card")}
                    disabled={!cart.length}
                    className="h-12 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white flex items-center justify-center gap-2 font-black text-base shadow-sm transition disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <CreditCard size={20} />
                    <span>Kart</span>
                    <kbd className="bg-white/25 px-1.5 py-0.5 rounded text-xs font-mono">F9</kbd>
                  </button>
                </div>

                {/* 2. Sıra: Veresiye, Karma, Çek */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePayment("credit")}
                    disabled={!cart.length}
                    className="h-9 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <BookUser size={14} /> Veresiye <kbd className="text-[10px] opacity-60">F6</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMixedPayModalOpen(true)}
                    disabled={!cart.length}
                    className="h-9 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Coins size={14} /> Karma <kbd className="text-[10px] opacity-60">F10</kbd>
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info("Çek ödemesi için cari ve çek modülünü kullanın")}
                    disabled={!cart.length}
                    className="h-9 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Landmark size={14} /> Çek
                  </button>
                </div>

                {/* 3. Sıra: İskonto, İndirim ₺, Fatura, Fiş */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("rate");
                      setDiscountModalOpen(true);
                    }}
                    disabled={!cart.length}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Percent size={13} /> İskonto %
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("amount");
                      setDiscountModalOpen(true);
                    }}
                    disabled={!cart.length}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Coins size={13} /> İndirim ₺
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePayment("cash")}
                    disabled={!cart.length}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <FileText size={13} /> Fatura
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={!cart.length}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Printer size={13} /> Fiş
                  </button>
                </div>

                {/* 4. Sıra: Beklet, Önizle, Eski Fiş, Kâr */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={holdCurrentSale}
                    disabled={!cart.length}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition relative"
                  >
                    <PauseCircle size={13} /> Beklet
                    {heldSales.length > 0 && (
                      <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                        {heldSales.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptDoneModal({
                      id: "preview",
                      date: Date.now(),
                      customerName: selectedCustomer?.name || "Perakende Müşteri",
                      total: calc.total,
                      method: "Önizleme",
                      lines: cart.map((l) => ({ name: l.name, qty: l.quantity, unitPrice: l.unit_price, vat: l.vat_rate, total: l.quantity * l.unit_price })),
                    })}
                    disabled={!cart.length}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Eye size={13} /> Önizle
                  </button>
                  <button
                    type="button"
                    onClick={() => setOldReceiptsModalOpen(true)}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <History size={13} /> Eski Fiş
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cost = cart.reduce((sum, l) => sum + (Number(l.product?.avg_cost || 0) * l.quantity), 0);
                      const profit = calc.net_total - cost;
                      const margin = calc.net_total > 0 ? Math.round((profit / calc.net_total) * 100) : 0;
                      toast.info(`Tahmini Brüt Kâr: ${formatMoney(profit)} (Marj: %${margin})`);
                    }}
                    disabled={!cart.length}
                    className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <TrendingUp size={13} /> Kâr
                  </button>
                </div>
              </div>

              {/* SAĞ KISIM: Toplam, Ödenen, Para Üstü ve Hızlı Para Tuşları (5 Columns) */}
              <div className="md:col-span-5 flex flex-col gap-2 order-1 md:order-2">
                {/* GENEL TOPLAM KUTUSU */}
                <div
                  className={cn(
                    "rounded-xl p-2.5 flex items-center justify-between border shadow-inner",
                    isDarkTheme
                      ? "bg-slate-900/90 border-slate-700"
                      : "bg-teal-50/80 border-teal-200"
                  )}
                >
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
                      ÖDENECEK TUTAR
                    </div>
                    <div className="text-xs text-slate-400">
                      {cart.length} kalem · KDV Dahil
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-teal-700 dark:text-teal-300">
                    {formatMoney(calc.total)}
                  </div>
                </div>

                {/* ÖDENEN & PARA ÜSTÜ YAN YANA */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Ödenen Girişi */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      ÖDENEN (F5)
                    </label>
                    <input
                      ref={receivedInputRef}
                      type="number"
                      step="any"
                      placeholder="0,00"
                      value={receivedInput}
                      onChange={(e) => setReceivedInput(e.target.value)}
                      className={cn(
                        "w-full h-10 rounded-lg px-2 text-center text-lg font-black tabular-nums outline-none border transition-colors",
                        isDarkTheme
                          ? "bg-slate-900 border-slate-700 text-white focus:border-teal-400"
                          : "bg-white border-teal-300 text-slate-900 focus:border-teal-600"
                      )}
                    />
                  </div>

                  {/* Para Üstü Göstergesi */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">
                      PARA ÜSTÜ
                    </label>
                    <div className="w-full h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatMoney(changeAmount)}
                    </div>
                  </div>
                </div>

                {/* PARA ÜSTÜ TUŞLARI (HIZLI BANKNOTLAR) */}
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { label: "Tam", action: () => setReceivedInput(String(calc.total)) },
                    { label: "20", action: () => setReceivedInput((v) => String((Number(v) || 0) + 20)) },
                    { label: "50", action: () => setReceivedInput((v) => String((Number(v) || 0) + 50)) },
                    { label: "100", action: () => setReceivedInput((v) => String((Number(v) || 0) + 100)) },
                    { label: "200", action: () => setReceivedInput((v) => String((Number(v) || 0) + 200)) },
                    { label: "500", action: () => setReceivedInput((v) => String((Number(v) || 0) + 500)) },
                    { label: "1000", action: () => setReceivedInput((v) => String((Number(v) || 0) + 1000)) },
                    { label: "+100", action: () => setReceivedInput((v) => String((Number(v) || 0) + 100)) },
                    { label: "−100", action: () => setReceivedInput((v) => String(Math.max(0, (Number(v) || 0) - 100))) },
                    { label: "Sil", action: () => setReceivedInput("") },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={btn.action}
                      className={cn(
                        "h-7 rounded-md text-xs font-black tabular-nums transition active:scale-95 border",
                        btn.label === "Tam"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : btn.label === "Sil"
                          ? "bg-rose-500/20 text-rose-600 border-rose-500/30"
                          : isDarkTheme
                          ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                          : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-teal-50"
                      )}
                    >
                      {btn.label.startsWith("+") || btn.label.startsWith("−") || btn.label === "Tam" || btn.label === "Sil"
                        ? btn.label
                        : `₺${btn.label}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: HIZLI TUŞLAR PANELİ (QUICK KEYS DESKTOP) */}
        <div
          style={{ width: `${quickKeysWidth}px` }}
          className={cn(
            "hidden md:flex relative shrink-0 flex-col border-l min-h-0",
            isDarkTheme ? "bg-slate-900 border-slate-800" : "bg-teal-50/40 border-slate-200"
          )}
        >
          {/* Sürükle-Bırak Genişlik Ayırıcı */}
          <div
            className="group absolute -left-1.5 top-0 bottom-0 w-3 z-20 cursor-col-resize touch-none"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startW = quickKeysWidth;
              const onMove = (ev: MouseEvent) => {
                const delta = startX - ev.clientX;
                setQuickKeysWidth(Math.max(260, Math.min(500, startW + delta)));
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-transparent group-hover:bg-teal-500 transition" />
          </div>

          {/* Kategori Sekmeleri & Düzenle Butonu */}
          <div className="shrink-0 p-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1">
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
              <button
                type="button"
                onClick={() => setSelectedCatId("")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-bold transition whitespace-nowrap",
                  !selectedCatId
                    ? "bg-teal-700 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                )}
              >
                Tümü
              </button>
              {(cats.data ?? []).slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCatId(c.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-bold transition whitespace-nowrap",
                    selectedCatId === c.id
                      ? "bg-teal-700 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsEditingQuickKeys((v) => !v)}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-bold shrink-0 transition",
                isEditingQuickKeys
                  ? "bg-amber-500 text-white"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {isEditingQuickKeys ? "Bitti" : "Düzenle"}
            </button>
          </div>

          {/* Stoksuz Ürün Ekle Butonu */}
          <button
            type="button"
            onClick={() => setUnlistedModalOpen(true)}
            className="shrink-0 mx-2.5 mt-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/40 dark:hover:bg-teal-900/60 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700 transition"
          >
            <Plus size={14} /> Stoksuz Ürün Sat
          </button>

          {/* Hızlı Tuşlar Kartlar Grid */}
          <div className="flex-1 overflow-y-auto p-2.5 grid grid-cols-2 lg:grid-cols-3 gap-2 auto-rows-[90px]">
            {quickKeyProducts.map((p) => {
              const isOutOfStock = (p.stock_qty ?? 0) <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className={cn(
                    "relative flex flex-col justify-between p-2 rounded-xl border text-left transition active:scale-[0.98] shadow-xs group",
                    isDarkTheme
                      ? "bg-slate-800/80 border-slate-700 hover:border-teal-400"
                      : "bg-white border-teal-200 hover:border-teal-500 hover:shadow-sm"
                  )}
                >
                  <div className="line-clamp-2 text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                    {p.name}
                  </div>
                  <div className="flex items-end justify-between gap-1 mt-auto pt-1">
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        isOutOfStock ? "text-rose-600" : "text-slate-400"
                      )}
                    >
                      {p.stock_qty !== undefined ? `${p.stock_qty} ad` : ""}
                    </span>
                    <span className="text-xs font-black text-teal-600 dark:text-teal-400 tabular-nums">
                      {formatMoney(getProductPrice(p))}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. BOTTOM FIXED HOTKEY NAVIGATION BAR (F1 to F12)
          ========================================================================= */}
      <footer
        className={cn(
          "hidden md:flex shrink-0 h-8 items-center border-t text-xs font-semibold px-2 overflow-x-auto [scrollbar-width:none]",
          isDarkTheme ? "bg-slate-900 border-slate-800 text-slate-300" : "bg-teal-700 border-teal-600 text-white"
        )}
      >
        <div className="flex items-center gap-1.5 lg:gap-2.5 mx-auto">
          {[
            { key: "F1", label: "Nakit", action: () => handlePayment("cash") },
            { key: "F2", label: "Ürün Ara", action: () => setProductListModalOpen(true) },
            { key: "F3", label: "Miktar", action: () => quantityInputRef.current?.focus() },
            { key: "F4", label: "Barkod", action: () => barcodeInputRef.current?.focus() },
            { key: "F5", label: "Ödenen", action: () => receivedInputRef.current?.focus() },
            { key: "F6", label: "Veresiye", action: () => handlePayment("credit") },
            { key: "F7", label: "Tam Ekran", action: () => setIsFullscreen((v) => !v) },
            { key: "F8", label: "Müşteri", action: () => setCustomerModalOpen(true) },
            { key: "F9", label: "Kart", action: () => handlePayment("credit_card") },
            { key: "F10", label: "Karma", action: () => setMixedPayModalOpen(true) },
            { key: "F11", label: "İndirim ₺", action: () => { setDiscountType("amount"); setDiscountModalOpen(true); } },
            { key: "F12", label: "İskonto %", action: () => { setDiscountType("rate"); setDiscountModalOpen(true); } },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.action}
              className="px-1.5 py-0.5 rounded hover:bg-white/20 transition whitespace-nowrap"
            >
              <span className="opacity-75 font-mono">{item.key}</span> {item.label}
            </button>
          ))}
          <span className="opacity-60 text-[11px] ml-1">↑↓ Satır Seç</span>
        </div>
      </footer>

      {/* =========================================================================
          6. MODALS
          ========================================================================= */}

      {/* A. Müşteri Seç Modal (F8) */}
      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent title="Müşteri Seç (F8)" description="Hızlı satış için müşteri veya cari kart seçin" className="sm:max-w-xl">
          <div className="space-y-3">
            <input
              ref={customerSearchRef}
              type="text"
              placeholder="Müşteri ara (ad, telefon, vergi no, bakiye)..."
              autoFocus
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-teal-500"
            />
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              <button
                type="button"
                onClick={() => {
                  setContactId(null);
                  setCustomerModalOpen(false);
                  toast.success("Perakende müşteri seçildi");
                }}
                className="w-full p-2.5 text-left flex items-center justify-between hover:bg-teal-50 dark:hover:bg-slate-800 transition font-bold"
              >
                <span>Perakende Müşteri (Cari Yok)</span>
                <span className="text-xs text-slate-400">Standart</span>
              </button>
              {(contacts.data ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setContactId(c.id);
                    setCustomerModalOpen(false);
                    toast.success(`Müşteri seçildi: ${c.name}`);
                  }}
                  className="w-full p-2.5 text-left flex items-center justify-between hover:bg-teal-50 dark:hover:bg-slate-800 transition"
                >
                  <div>
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.phone || c.tax_number || "—"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold tabular-nums">{formatMoney((c as any).balance ?? 0)}</div>
                    <div className="text-[10px] text-slate-400">Bakiye</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* B. Karma Ödeme (Nakit + Kart - F10) Modal */}
      <Dialog open={mixedPayModalOpen} onOpenChange={setMixedPayModalOpen}>
        <DialogContent title="Nakit + Kredi Kartı (F10)" description="Nakit ve kart tutarlarını paylaştırın" className="sm:max-w-md">
          <p className="text-sm text-slate-500 mb-3">
            Toplam Tutar: <b className="text-slate-900 dark:text-white font-black">{formatMoney(calc.total)}</b>
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold block mb-1">Nakit Tutarı</label>
              <input
                type="number"
                step="any"
                placeholder="Nakit kısmını girin..."
                value={receivedInput}
                onChange={(e) => setReceivedInput(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border text-lg font-black tabular-nums bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Kalan Kart Tutarı</label>
              <div className="w-full h-10 px-3 rounded-lg border bg-slate-100 dark:bg-slate-900 flex items-center text-lg font-black tabular-nums text-sky-600">
                {formatMoney(Math.max(0, calc.total - (Number(receivedInput) || 0)))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const cash = Number(receivedInput) || 0;
                const card = Math.max(0, calc.total - cash);
                handlePayment("mixed", { cashAmount: cash, cardAmount: card });
                setMixedPayModalOpen(false);
              }}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition"
            >
              Ödemeyi Tamamla
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* C. Stoksuz Ürün Sat Modal */}
      <Dialog open={unlistedModalOpen} onOpenChange={setUnlistedModalOpen}>
        <DialogContent title="Stoksuz Ürün Sat" description="Listede olmayan hızlı ürün veya hizmet girişi" className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const name = (form.elements.namedItem("name") as HTMLInputElement).value;
              const price = parseFloat((form.elements.namedItem("price") as HTMLInputElement).value) || 0;
              const vat = parseInt((form.elements.namedItem("vat") as HTMLSelectElement).value, 10) || 20;
              const qty = parseFloat((form.elements.namedItem("qty") as HTMLInputElement).value) || 1;
              addUnlistedToCart(name, price, vat, qty);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-xs font-bold block mb-1">Ürün Adı / Açıklama</label>
              <input name="name" required placeholder="Örn: Poşet, Hizmet Bedeli..." className="w-full h-10 px-3 rounded-lg border text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">Satış Fiyatı (KDV Dahil)</label>
                <input name="price" type="number" step="any" required placeholder="0,00" className="w-full h-10 px-3 rounded-lg border text-sm font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">KDV Oranı</label>
                <select name="vat" defaultValue={20} className="w-full h-10 px-2 rounded-lg border text-sm font-bold">
                  <option value={0}>%0</option>
                  <option value={1}>%1</option>
                  <option value={10}>%10</option>
                  <option value={20}>%20</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Miktar</label>
              <input name="qty" type="number" step="any" defaultValue={1} className="w-full h-10 px-3 rounded-lg border text-sm font-bold" />
            </div>
            <button type="submit" className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition">
              Sepete Ekle
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* D. İskonto / İndirim Modal (F11/F12) */}
      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent
          title={discountType === "rate" ? "İskonto Oranı (% - F12)" : "İndirim Tutarı (₺ - F11)"}
          description="Satış toplamına uygulanacak indirim değerini girin"
          className="sm:max-w-xs"
        >
          <div className="space-y-3">
            <input
              type="number"
              step="any"
              autoFocus
              value={discountValue || ""}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              placeholder={discountType === "rate" ? "% Oran girin (örn: 10)" : "₺ Tutar girin (örn: 50)"}
              className="w-full h-11 px-3 text-center text-xl font-black rounded-lg border tabular-nums"
            />
            {discountType === "rate" ? (
              <div className="grid grid-cols-4 gap-1">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDiscountValue(pct);
                      setDiscountModalOpen(false);
                    }}
                    className="h-8 rounded bg-slate-100 hover:bg-teal-600 hover:text-white font-bold text-xs transition"
                  >
                    %{pct}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {[10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setDiscountValue(amt);
                      setDiscountModalOpen(false);
                    }}
                    className="h-8 rounded bg-slate-100 hover:bg-teal-600 hover:text-white font-bold text-xs transition"
                  >
                    ₺{amt}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDiscountValue(0);
                  setDiscountModalOpen(false);
                }}
                className="flex-1 h-9 rounded bg-slate-200 text-xs font-bold"
              >
                Sıfırla
              </button>
              <button
                type="button"
                onClick={() => setDiscountModalOpen(false)}
                className="flex-1 h-9 rounded bg-teal-600 text-white text-xs font-bold"
              >
                Uygula
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* E. Eski Fişler (Son POS Satışları) Modal */}
      <Dialog open={oldReceiptsModalOpen} onOpenChange={setOldReceiptsModalOpen}>
        <DialogContent title="Eski Fişler (Son POS Satışları)" description="Bugün yapılan hızlı satışlar" className="sm:max-w-xl">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(() => {
              const hist: PosSaleRecord[] = salesHistoryRaw ? JSON.parse(salesHistoryRaw) : [];
              if (!hist.length) return <p className="text-sm text-slate-400 text-center py-8">Henüz POS satışı yok</p>;
              return hist.map((rec) => (
                <div key={rec.id} className="p-3 rounded-lg border flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm">{rec.customerName}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(rec.date).toLocaleTimeString("tr-TR")} · {rec.lines.length} kalem · {rec.method}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm tabular-nums text-teal-600">{formatMoney(rec.total)}</div>
                    <button
                      type="button"
                      onClick={() => setReceiptDoneModal(rec)}
                      className="text-xs text-teal-700 hover:underline font-bold mt-0.5 inline-flex items-center gap-1"
                    >
                      <Printer size={12} /> Yazdır
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* F. Z Raporu — Gün Sonu Özeti Modal */}
      <Dialog open={zReportModalOpen} onOpenChange={setZReportModalOpen}>
        <DialogContent title="Z Raporu — Gün Sonu Özeti" description="Kasa ve ciro mutabakat dökümü" className="sm:max-w-lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border bg-teal-50 dark:bg-teal-950/30">
                <div className="text-[11px] font-bold uppercase text-teal-700">Bugünkü Satış Adedi</div>
                <div className="text-2xl font-black mt-1">
                  {(() => {
                    const hist: PosSaleRecord[] = salesHistoryRaw ? JSON.parse(salesHistoryRaw) : [];
                    return hist.length;
                  })()} ad
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/30">
                <div className="text-[11px] font-bold uppercase text-emerald-700">Toplam Ciro</div>
                <div className="text-2xl font-black mt-1 text-emerald-600">
                  {(() => {
                    const hist: PosSaleRecord[] = salesHistoryRaw ? JSON.parse(salesHistoryRaw) : [];
                    return formatMoney(hist.reduce((s, h) => s + (h.isReturn ? -h.total : h.total), 0));
                  })()}
                </div>
              </div>
            </div>

            <div className="rounded-lg border divide-y text-xs">
              <div className="p-2.5 flex justify-between font-bold">
                <span>Kasa Nakit Bakiyesi</span>
                <span className="tabular-nums font-mono">{formatMoney(totalCashBalance)}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span>Operatör</span>
                <span>{cashierName}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span>Tarih / Saat</span>
                <span>{new Date().toLocaleString("tr-TR")}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.print();
                toast.success("Z Raporu yazdırıldı");
              }}
              className="w-full h-11 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg flex items-center justify-center gap-2"
            >
              <Printer size={16} /> Z Raporu Yazdır
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* G. Fiş / Fatura Yazdır Modal */}
      {receiptDoneModal && (
        <Dialog open={!!receiptDoneModal} onOpenChange={() => setReceiptDoneModal(null)}>
          <DialogContent title="Fiş / Fatura Önizleme" className="sm:max-w-sm p-4 font-mono text-xs">
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <h3 className="font-bold text-base">{org?.name || "REN ENDÜSTRİYEL"}</h3>
              <p className="text-[11px] text-slate-500">Hızlı Satış Fişi</p>
              <p className="text-[10px] text-slate-400">{new Date(receiptDoneModal.date).toLocaleString("tr-TR")}</p>
            </div>
            <div className="py-2 space-y-1 divide-y divide-dashed divide-slate-200">
              {receiptDoneModal.lines.map((l, i) => (
                <div key={i} className="pt-1 flex justify-between">
                  <div>
                    <div>{l.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {l.qty} ad × {formatMoney(l.unitPrice)}
                    </div>
                  </div>
                  <div className="font-bold tabular-nums">{formatMoney(l.total)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
              <div className="flex justify-between font-black text-sm">
                <span>TOPLAM:</span>
                <span>{formatMoney(receiptDoneModal.total)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Ödeme:</span>
                <span>{receiptDoneModal.method}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Müşteri:</span>
                <span>{receiptDoneModal.customerName}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2 no-print">
              <button
                type="button"
                onClick={() => setReceiptDoneModal(null)}
                className="flex-1 py-2 rounded border bg-slate-100 font-bold"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded bg-teal-600 text-white font-bold flex items-center justify-center gap-1"
              >
                <Printer size={14} /> Yazdır
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* H. Fiyat Gör / Müşteri Ekranı Modal */}
      <Dialog open={priceCheckModalOpen} onOpenChange={setPriceCheckModalOpen}>
        <DialogContent title="Fiyat Gör / Kiosk Ekranı" description="Ürün barkodunu okutarak güncel fiyatını kontrol edin" className="sm:max-w-md text-center">
          <Monitor size={48} className="mx-auto text-teal-600 mb-2 opacity-80" />
          <input
            type="text"
            placeholder="Barkod okutun..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const code = e.currentTarget.value.trim();
                const matched = (products.data ?? []).find((p) => p.barcode === code || p.code === code);
                if (matched) {
                  toast.success(`${matched.name}: ${formatMoney(getProductPrice(matched))}`);
                } else {
                  toast.error("Ürün bulunamadı");
                }
                e.currentTarget.value = "";
              }
            }}
            className="w-full h-12 text-center text-lg font-bold rounded-xl border border-teal-300 mt-2"
          />
        </DialogContent>
      </Dialog>

      {/* I. Tüm Ürün Listesi (F2) Modal */}
      <Dialog open={productListModalOpen} onOpenChange={setProductListModalOpen}>
        <DialogContent title="Tüm Ürün Listesi (F2)" description="Ürün arayın ve tıklayarak sepete ekleyin" className="sm:max-w-2xl">
          <div className="p-4 space-y-3">
            <input
              type="text"
              placeholder="Ürün adı, barkod, kod veya kategori ile ara..."
              autoFocus
              onChange={(e) => setBarcodeQuery(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border text-sm outline-none focus:border-teal-500"
            />
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {(products.data ?? []).slice(0, 50).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    addToCart(p);
                    setProductListModalOpen(false);
                  }}
                  className="w-full p-2.5 text-left flex items-center justify-between hover:bg-teal-50 dark:hover:bg-slate-800 transition"
                >
                  <div>
                    <div className="font-bold text-sm">{p.name}</div>
                    <div className="text-xs text-slate-400">
                      Barkod: {p.barcode || "—"} · Stok: {p.stock_qty ?? 0} ad
                    </div>
                  </div>
                  <div className="text-sm font-black text-teal-600 dark:text-teal-400 tabular-nums">
                    {formatMoney(getProductPrice(p))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* J. Barkod Etiket Yazdırma Modal */}
      <BarcodeLabelModal open={barcodeModalOpen} onOpenChange={setBarcodeModalOpen} />
    </div>
  );
}
