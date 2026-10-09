import {
  Building2,
  Droplet,
  Droplets,
  Factory,
  GraduationCap,
  Hand,
  HeartPulse,
  Hotel,
  Landmark,
  ScrollText,
  Sparkles,
  SprayCan,
  Trash2,
  UtensilsCrossed,
  Utensils,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { CONTACT } from "@/components/landing/contact";

export { CONTACT };

export const SITE_URL = "https://renendustriyel.com.tr";

export const WA_LINK = (text = "Merhaba, ürünleriniz için teklif almak istiyorum.") => `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(text)}`;

export const NAV = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/kurumsal", label: "Kurumsal" },
  { href: "/urun-gruplari", label: "Ürünler" },
  { href: "/sektorler", label: "Sektörel Çözümler" },
  { href: "/markalar", label: "Markalar" },
  { href: "/blog", label: "Hijyen Rehberi" },
  { href: "/iletisim", label: "İletişim" },
];

export type ProductGroup = { slug: string; icon: LucideIcon; title: string; text: string; items: string[] };

export const PRODUCT_GROUPS: ProductGroup[] = [
  { slug: "camasir-suyu", icon: Droplets, title: "Çamaşır Suyu", text: "Kıvamlı ve kıvamsız çamaşır suları; ev tipi ve endüstriyel ambalaj seçenekleri.", items: ["Kıvamlı çamaşır suyu", "Kıvamsız çamaşır suyu", "Endüstriyel bidon ambalaj"] },
  { slug: "yuzey-temizleyici", icon: SprayCan, title: "Yüzey Temizleyiciler", text: "Zemin, banyo, mutfak ve genel yüzeyler için temizlik çözümleri.", items: ["Genel yüzey temizleyici", "Yağ çözücü ve ovma kremi", "Banyo ve mutfak temizleyici"] },
  { slug: "bulasik", icon: Utensils, title: "Bulaşık Grubu", text: "Elde ve makinede bulaşık için deterjan, parlatıcı ve tuz.", items: ["Elde bulaşık deterjanı", "Bulaşık makinesi deterjanı", "Parlatıcı ve tuz"] },
  { slug: "el-sabunu", icon: Hand, title: "Sıvı El Sabunu", text: "Lavabo ve dispenserler için sıvı ve köpük sabunlar, büyük boy bidonlar.", items: ["Sıvı el sabunu", "Köpük sabun", "Büyük boy bidon"] },
  { slug: "camasir-deterjani", icon: Sparkles, title: "Çamaşır Deterjanı", text: "Toz, jel ve sıvı çamaşır deterjanları ile yumuşatıcılar.", items: ["Toz ve sıvı deterjan", "Jel deterjan", "Yumuşatıcı"] },
  { slug: "arap-sabunu", icon: Droplet, title: "Arap Sabunu", text: "Zemin ve genel temizlik için katı ve sıvı arap sabunu.", items: ["Sıvı arap sabunu", "Katı arap sabunu", "Zemin temizliği"] },
  { slug: "cop-poseti", icon: Trash2, title: "Endüstriyel Çöp Poşetleri", text: "Mini boydan jumbo boya, farklı kalınlıklarda çöp poşetleri.", items: ["Jumbo ve battal boy", "Orta ve mini boy", "Kalın endüstriyel tip"] },
  { slug: "kagit", icon: ScrollText, title: "Kağıt Ürünleri", text: "Havlu, peçete ve tuvalet kağıdında dispenser uyumlu kurumsal ürünler.", items: ["İçten çekmeli havlu", "Z katlı ve sensörlü havlu", "Peçete ve tuvalet kağıdı"] },
];

export const BRANDS = ["Domestos", "Cif", "Omo", "Yumoş", "Tex", "Bingo", "Dolce", "Fifty", "Focus", "Selpak", "Familia", "Papia", "Sleepy", "Komili", "Asperox", "Mr. Oxy", "Maratem", "Aspirix", "Miss", "Tampa", "Dolphin", "Haspet", "İlbays"];

export type Sector = {
  slug: string;
  icon: LucideIcon;
  title: string;
  short: string;
  intro: string;
  areas: { title: string; text: string }[];
  products: string[];
  tips: string[];
};

export const SECTORS: Sector[] = [
  {
    slug: "otel",
    icon: Hotel,
    title: "Otel ve Konaklama",
    short: "Kat hizmetleri, çamaşırhane ve ortak alanlar için eksiksiz tedarik.",
    intro: "Misafir memnuniyeti temizlikle başlar. Odalar, banyolar, lobi ve çamaşırhane için ihtiyaç duyduğunuz temizlik ve kağıt ürünlerini tek tedarikçiden, planlı teslimatla sağlıyoruz.",
    areas: [
      { title: "Kat hizmetleri", text: "Oda ve banyo temizliği için yüzey temizleyici, çamaşır suyu ve tuvalet kağıdı." },
      { title: "Çamaşırhane", text: "Nevresim ve havlu yıkaması için çamaşır deterjanı ve yumuşatıcı." },
      { title: "Ortak alanlar", text: "Lobi ve tuvaletler için sıvı sabun, kağıt havlu ve çöp poşeti." },
    ],
    products: ["Çamaşır Suyu", "Yüzey Temizleyiciler", "Çamaşır Deterjanı", "Sıvı El Sabunu", "Kağıt Ürünleri", "Endüstriyel Çöp Poşetleri"],
    tips: ["Sezon öncesi stok planı yapın; yoğun dönemde ürün bitmesin.", "Oda başına günlük sarf miktarını belirleyip aylık siparişi buna göre verin."],
  },
  {
    slug: "restoran-kafe",
    icon: UtensilsCrossed,
    title: "Restoran ve Kafe",
    short: "Mutfak hijyeni, bulaşık ve servis için yoğun tempoya uygun ürünler.",
    intro: "Yoğun mutfak temposunda yağ çözücüden bulaşık deterjanına, peçeteden çöp poşetine kadar her ürünün elinizin altında olması gerekir. Kullanım miktarınıza göre düzenli teslimat planlıyoruz.",
    areas: [
      { title: "Mutfak", text: "Yağ çözücü, yüzey temizleyici ve çamaşır suyu ile tezgah ve zemin hijyeni." },
      { title: "Bulaşık", text: "Elde ve makinede yıkama için deterjan, parlatıcı ve tuz." },
      { title: "Salon ve servis", text: "Peçete, kağıt havlu, sıvı sabun ve uygun boyda çöp poşetleri." },
    ],
    products: ["Bulaşık Grubu", "Yüzey Temizleyiciler", "Çamaşır Suyu", "Kağıt Ürünleri", "Sıvı El Sabunu", "Endüstriyel Çöp Poşetleri"],
    tips: ["Bulaşık makinesi deterjanını makinenizin dozaj sistemine uygun seçin.", "Mutfak ve salon için ayrı renk temizlik bezi kullanmak çapraz bulaşmayı azaltır."],
  },
  {
    slug: "hastane-saglik",
    icon: HeartPulse,
    title: "Hastane ve Sağlık",
    short: "Klinik, poliklinik, eczane ve laboratuvarlar için düzenli sarf tedariki.",
    intro: "Sağlık kuruluşlarında temizlik malzemesinin aksamadan gelmesi kritik önem taşır. Klinik, poliklinik ve eczaneler için temizlik ve kağıt ürünlerini düzenli olarak tedarik ediyoruz.",
    areas: [
      { title: "Hasta alanları", text: "Zemin ve yüzey temizliği için çamaşır suyu ve yüzey temizleyiciler." },
      { title: "El hijyeni", text: "Dispenser uyumlu sıvı sabun ve kağıt havlu." },
      { title: "Atık yönetimi", text: "Farklı boy ve kalınlıkta çöp poşetleri." },
    ],
    products: ["Çamaşır Suyu", "Yüzey Temizleyiciler", "Sıvı El Sabunu", "Kağıt Ürünleri", "Endüstriyel Çöp Poşetleri"],
    tips: ["Kritik ürünler için asgari stok seviyesi belirleyin.", "Kimyasalları orijinal ambalajında ve etiketli saklayın."],
  },
  {
    slug: "okul",
    icon: GraduationCap,
    title: "Okul ve Eğitim Kurumları",
    short: "Sınıf, koridor, tuvalet ve kantin için hijyen ve kağıt ürünleri.",
    intro: "Kalabalık ortamlarda hijyen, çocukların sağlığı için ilk sıradadır. Okullar, kurslar ve yurtlar için dönem başı ve aylık tedarik planı hazırlıyoruz.",
    areas: [
      { title: "Tuvalet ve lavabolar", text: "Sıvı sabun, kağıt havlu ve tuvalet kağıdı." },
      { title: "Sınıf ve koridorlar", text: "Zemin ve yüzey temizleyiciler, çöp poşetleri." },
      { title: "Kantin ve yemekhane", text: "Bulaşık deterjanı, peçete ve mutfak temizlik ürünleri." },
    ],
    products: ["Sıvı El Sabunu", "Kağıt Ürünleri", "Yüzey Temizleyiciler", "Çamaşır Suyu", "Bulaşık Grubu", "Endüstriyel Çöp Poşetleri"],
    tips: ["Dönem başında toplu alımla bütçenizi önceden planlayın.", "Lavabolarda dispenser kullanımı sabun ve havlu tüketimini düşürür."],
  },
  {
    slug: "fabrika",
    icon: Factory,
    title: "Fabrika ve Üretim Tesisleri",
    short: "Üretim alanı, yemekhane ve sosyal alanlar için yüksek hacimli tedarik.",
    intro: "Çok vardiyalı tesislerde temizlik malzemesi tüketimi yüksektir. Palet ve koli bazında, düzenli aralıklarla, faturalı ve cari hesapla tedarik sağlıyoruz.",
    areas: [
      { title: "Üretim alanı", text: "Yağ çözücüler, zemin temizleyiciler ve kalın endüstriyel çöp poşetleri." },
      { title: "Yemekhane", text: "Bulaşık grubu, peçete ve mutfak temizlik ürünleri." },
      { title: "Soyunma odası ve tuvaletler", text: "Sıvı sabun, kağıt havlu ve tuvalet kağıdı." },
    ],
    products: ["Yüzey Temizleyiciler", "Endüstriyel Çöp Poşetleri", "Bulaşık Grubu", "Sıvı El Sabunu", "Kağıt Ürünleri", "Arap Sabunu"],
    tips: ["Aylık tüketiminizi çıkaralım, teslimatı vardiya düzeninize göre planlayalım.", "Büyük ambalaj (bidon, koli) birim maliyeti düşürür."],
  },
  {
    slug: "ofis-plaza",
    icon: Building2,
    title: "Ofis ve Plazalar",
    short: "Ortak alan, mutfak ve tuvaletler için aylık tedarik planı.",
    intro: "Çalışanlarınız için temiz ve düzenli bir ortam. Ofis mutfağı, toplantı odaları ve tuvaletler için gerekli ürünleri aylık olarak kapınıza getiriyoruz.",
    areas: [
      { title: "Ofis mutfağı", text: "Bulaşık deterjanı, peçete ve yüzey temizleyici." },
      { title: "Tuvaletler", text: "Sıvı sabun, içten çekmeli havlu ve tuvalet kağıdı." },
      { title: "Çalışma alanları", text: "Genel yüzey temizleyici ve çöp poşetleri." },
    ],
    products: ["Kağıt Ürünleri", "Sıvı El Sabunu", "Bulaşık Grubu", "Yüzey Temizleyiciler", "Endüstriyel Çöp Poşetleri"],
    tips: ["Sabit aylık sipariş listesi ile satın alma işini tek seferde çözün."],
  },
  {
    slug: "kamu",
    icon: Landmark,
    title: "Kamu Kurumları",
    short: "Belediye ve kamu kurumları için faturalı, düzenli teslimat.",
    intro: "Kamu kurumları ve belediyelere ihtiyaç listesine göre teklif hazırlıyor, faturalı ve planlı teslimat yapıyoruz.",
    areas: [
      { title: "Hizmet binaları", text: "Ortak alan, tuvalet ve ofis temizliği için tam ürün yelpazesi." },
      { title: "Sosyal tesisler", text: "Yemekhane ve misafirhaneler için mutfak ve kağıt grubu." },
      { title: "Açık alanlar", text: "Dayanıklı, büyük boy çöp poşetleri." },
    ],
    products: ["Çamaşır Suyu", "Yüzey Temizleyiciler", "Kağıt Ürünleri", "Sıvı El Sabunu", "Endüstriyel Çöp Poşetleri"],
    tips: ["İhtiyaç listenizi gönderin, kalem kalem teklif hazırlayalım."],
  },
  {
    slug: "site-yonetimi",
    icon: Warehouse,
    title: "Site ve Apartman Yönetimi",
    short: "Site yönetimleri için toplu ve ekonomik alım.",
    intro: "Site ve apartman yönetimlerinin ortak alan temizliği için ihtiyaç duyduğu ürünleri toplu ve ekonomik şekilde sağlıyoruz.",
    areas: [
      { title: "Ortak alanlar", text: "Merdiven, asansör ve giriş temizliği için arap sabunu ve yüzey temizleyiciler." },
      { title: "Çöp toplama", text: "Battal ve jumbo boy dayanıklı çöp poşetleri." },
      { title: "Sosyal tesis", text: "Havuz, spor salonu ve toplantı salonları için kağıt ve sabun." },
    ],
    products: ["Arap Sabunu", "Çamaşır Suyu", "Yüzey Temizleyiciler", "Endüstriyel Çöp Poşetleri", "Kağıt Ürünleri"],
    tips: ["Aylık sabit sipariş ile yönetim giderlerinizi öngörülebilir hale getirin."],
  },
];

export type BlogPost = { slug: string; title: string; summary: string; date: string; readMin: number; body: { h?: string; p?: string; list?: string[] }[] };

export const POSTS: BlogPost[] = [
  {
    slug: "camasir-suyu-guvenli-kullanim",
    title: "Çamaşır suyu nasıl güvenli kullanılır?",
    summary: "Çamaşır suyunu doğru seyreltmek, asla karıştırılmaması gereken ürünler ve saklama kuralları.",
    date: "2026-10-09",
    readMin: 4,
    body: [
      { p: "Çamaşır suyu (sodyum hipoklorit) etkili bir temizlik ve beyazlatma ürünüdür. Ancak yanlış kullanıldığında hem sağlığa hem yüzeylere zarar verebilir. Kurumlarda temizlik personelinin bilmesi gereken temel kuralları derledik." },
      { h: "Asla başka ürünlerle karıştırmayın" },
      { p: "Çamaşır suyunu tuz ruhu, kireç çözücü gibi asidik ürünlerle veya amonyak içeren temizleyicilerle karıştırmak zehirli gaz açığa çıkarır. Aynı yüzeye farklı ürün uygulayacaksanız önce bol suyla durulayın." },
      { h: "Etiketteki oranlara uyun" },
      { p: "Daha fazla çamaşır suyu daha iyi temizlik demek değildir. Ürün etiketindeki seyreltme oranına uyun; seyreltmeyi soğuk suyla yapın. Sıcak su etken maddenin daha hızlı bozulmasına yol açar." },
      { h: "Uygulama sırasında" },
      { list: ["Eldiven kullanın, gerekirse göz koruması takın.", "Ortamı havalandırın; kapalı alanlarda uzun süre çalışmayın.", "Metal yüzeylerde uzun süre bekletmeyin, durulayın.", "Renkli kumaşlarda leke yapabileceğini unutmayın."] },
      { h: "Saklama" },
      { p: "Çamaşır suyunu orijinal, etiketli ambalajında; güneş görmeyen, serin bir yerde ve çocukların ulaşamayacağı şekilde saklayın. Başka kaplara aktarmak karışıklık ve kaza riskini artırır." },
    ],
  },
  {
    slug: "icten-cekmeli-havlu-mu-rulo-havlu-mu",
    title: "İçten çekmeli havlu mu, Z katlı mı, rulo mu?",
    summary: "Kurumlarda doğru kağıt havlu seçimi tüketimi ve maliyeti nasıl etkiler?",
    date: "2026-10-09",
    readMin: 3,
    body: [
      { p: "Kağıt havlu, kurumların en çok tükettiği sarf malzemelerinden biridir. Doğru tip seçildiğinde hem tüketim düşer hem de lavabolar daha düzenli kalır." },
      { h: "İçten çekmeli (Maxi / Mini) havlu" },
      { p: "Dispenserden tek tek çekildiği için israfı azaltır. Ofis, okul ve sağlık kurumlarındaki yoğun kullanılan lavabolar için uygundur." },
      { h: "Z katlı havlu" },
      { p: "Yaprak yaprak çıkar, dispenser içinde az yer kaplar. Orta yoğunluktaki lavabolarda pratik bir çözümdür." },
      { h: "Sensörlü havlu" },
      { p: "Temassız kullanım sunar; her seferinde ayarlı uzunlukta havlu verir. Hijyenin ön planda olduğu alanlarda tercih edilir." },
      { h: "Hangisini seçmeliyim?" },
      { list: ["Önce mevcut dispenserinize uyan tipi belirleyin.", "Günlük kullanıcı sayısına göre aylık koli ihtiyacını hesaplayın.", "Tek katlı/çift katlı farkı tüketimi doğrudan etkiler."] },
      { p: "Hangi ürünün size uygun olduğundan emin değilseniz, dispenserinizin fotoğrafını WhatsApp'tan gönderin; uyumlu ürünü önerelim." },
    ],
  },
  {
    slug: "restoran-mutfagi-gunluk-temizlik-plani",
    title: "Restoran mutfağı için günlük temizlik planı",
    summary: "Açılıştan kapanışa kadar mutfakta hangi temizlik hangi ürünle yapılmalı?",
    date: "2026-10-09",
    readMin: 4,
    body: [
      { p: "Profesyonel mutfakta temizlik bir rutin olmalıdır. Aşağıdaki plan, küçük ve orta ölçekli işletmeler için başlangıç noktası olarak kullanılabilir." },
      { h: "Açılışta" },
      { list: ["Tezgahları yüzey temizleyiciyle silin.", "El yıkama istasyonlarında sıvı sabun ve kağıt havlu olduğundan emin olun.", "Çöp kovalarına uygun boyda poşet takın."] },
      { h: "Servis sırasında" },
      { list: ["Dökülmeleri hemen temizleyin.", "Bulaşık birikmesine izin vermeyin.", "Kesme tahtalarını kullanımdan sonra yıkayın."] },
      { h: "Kapanışta" },
      { list: ["Ocak ve davlumbaz çevresini yağ çözücüyle temizleyin.", "Zemini deterjanlı suyla yıkayın, gerekiyorsa etiketteki oranda seyreltilmiş çamaşır suyuyla dezenfekte edin.", "Çöpleri ağzı kapalı şekilde çıkarın."] },
      { h: "Haftalık" },
      { p: "Buzdolabı içi, depolar ve ulaşılması zor köşeler haftada en az bir kez detaylı temizlenmelidir." },
      { p: "Bu plana uygun ürünlerin aylık miktarını birlikte çıkarabiliriz; ihtiyaç listenizi bize gönderin." },
    ],
  },
  {
    slug: "cop-poseti-secimi",
    title: "Doğru çöp poşeti nasıl seçilir?",
    summary: "Boy, kalınlık ve kullanım alanına göre çöp poşeti seçerken dikkat edilecekler.",
    date: "2026-10-09",
    readMin: 3,
    body: [
      { p: "Yanlış seçilen çöp poşeti ya yırtılır ya da gereğinden fazla malzeme harcanmasına yol açar. Seçim yaparken üç şeye bakın: kova boyutu, atığın türü ve poşet kalınlığı." },
      { h: "Boyut" },
      { p: "Poşet, kovanın ağzını rahatça sarmalı ve dibe kadar oturmalıdır. Mini ve orta boy ofis ve banyo kovaları için; battal ve jumbo boy büyük konteyner ve kovalar için uygundur." },
      { h: "Kalınlık" },
      { p: "Mutfak, şantiye ve üretim atıkları gibi ağır ve keskin atıklar için kalın endüstriyel poşet tercih edin. Kağıt ve hafif atık için standart kalınlık yeterlidir." },
      { h: "Renk ile ayrıştırma" },
      { p: "Farklı renkte poşet kullanmak, geri dönüşüm ve atık ayrıştırmasını kolaylaştırır." },
      { p: "Kovalarınızın ölçülerini bize iletin, size uygun boy ve kalınlığı önerelim." },
    ],
  },
  {
    slug: "kurumlarda-hijyen-malzemesi-ihtiyaci-hesaplama",
    title: "Kurumunuzun aylık hijyen malzemesi ihtiyacını hesaplayın",
    summary: "Stoğun bitmemesi ve israf olmaması için aylık ihtiyaç nasıl planlanır?",
    date: "2026-10-09",
    readMin: 3,
    body: [
      { p: "Temizlik malzemesinin tam ihtiyaç anında bitmesi, birçok kurumun yaşadığı ortak bir sorundur. Basit bir planla bunun önüne geçebilirsiniz." },
      { h: "1. Geçmiş tüketimi çıkarın" },
      { p: "Son üç ayda hangi üründen kaç adet/koli aldığınızı listeleyin. Bu, en güvenilir başlangıç noktasıdır." },
      { h: "2. Kullanıcı sayısını dikkate alın" },
      { p: "Personel, öğrenci veya misafir sayısındaki değişiklikler sabun, havlu ve tuvalet kağıdı tüketimini doğrudan etkiler." },
      { h: "3. Asgari stok belirleyin" },
      { p: "Her kritik ürün için en az bir-iki haftalık yedek stok tutun. Bu seviyeye inildiğinde sipariş verin." },
      { h: "4. Sabit aylık sipariş" },
      { p: "Tüketim netleştiğinde sabit bir aylık sipariş listesi oluşturun. Ren Endüstriyel olarak bu listeye göre düzenli teslimat planlıyoruz." },
    ],
  },
];

export const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
