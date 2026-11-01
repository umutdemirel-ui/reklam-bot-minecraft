# Mimari kararlar ve aşamalı yol haritası

## Uygulanan sınırlar

1. **Görünüm:** React sayfaları ve ortak bileşenler. CSS tema değişkenleri ortak tasarım dili sağlar. URL hash'i gezinme geçmişini korur.
2. **Komut akışı:** metin → belirlenimci yönlendirici → yerel gezinme / arama bağlantısı / model HTTP isteği / yetenek reddi. Yönlendirici bir güvenlik sandbox'ı değildir; asıl güvenlik, sunucuda hiçbir OS yürütücüsü bulunmamasıdır.
3. **Ses:** Web Speech olayları metin alanına bağlanır. Gönderme kullanıcıya bırakılır. Sesli yanıt ayrı cihaz bağdaştırıcısıdır. Arka plan dinleme yapılmaz.
4. **Model:** sunucu, `.env` yapılandırmasını Ollama veya OpenAI uyumlu isteğe dönüştürür. Sağlayıcı yanıtı düz metin gösterilir; HTML / kod çalıştırılmaz.
5. **Araştırma:** SearXNG gerçek kaynak özetleri sağlar; model yalnızca bunları sentezler. Akış HTTP üzerinden NDJSON aşamalarını taşır. Modelin internet erişimine sahip olduğu varsayılmaz.
6. **Kalıcılık:** yalnızca tarayıcı yerel depolaması. Şema doğrulaması, boyut / kayıt sınırı ve depolama hatası bildirimi var. Cihazlar arasında aktarım yok.
7. **Sunucu:** aynı-kaynak POST kontrolü, JSON / girdi boyutu doğrulaması, üç eşzamanlı POST sınırı, süre aşımı ve iptal sinyalleri. Kimlik doğrulama henüz yok; güvenilir yerel kullanım içindir.

## Sürüm 0.1 kapsamı

- **Aşama 1:** çalışan tasarım sistemi, 10 sayfa, navigasyon, koyu / açık tema, renk ve görünüm tercihleri; masaüstü / tablet / telefon yerleşimi.
- **Aşama 2 başlangıcı:** gerçek model isteği, Türkçe tarayıcı ses arayüzü, sesli yanıt ve yerel geçmiş. Tam konuşma bağlamı / çevrimdışı STT henüz yok.
- **Aşama 3 başlangıcı:** gerçek arama + kaynaklı başlangıç özeti. Dinamik alt soru planlama, tam sayfa okuma, yerel cihaz kontrolü ve dayanıklı görev kuyruğu yok.
- **Aşama 4:** uygulanmadı. Aşağıdaki mimari hedef, çalışan kod iddiası değildir.
- **Aşama 5:** test, biçim kontrolü, üretim derlemesi, güvenlik / kurulum belgeleri ve CI tanımı eklendi. Gerçek cihaz testleri devam etmelidir.

## Sonraki masaüstü istemci kararı

**Öneri: Tauri 2 + Rust yerel yetenek servisi.** Mevcut React arayüzü yeniden kullanılabilir; Rust, dosya / süreç / işletim sistemi bağdaştırıcılarını sağlar. Bu depoya boş, çalışmayan masaüstü iskeleti eklenmedi. Geliştirmeden önce hedef işletim sistemlerinin derleyici / imzalama / izin gereksinimleri doğrulanmalı.

Yürütme sözleşmesi açık olmalı:

```text
ToolDescriptor: id, platform, inputSchema, requiredPermissions, riskLevel
ToolRequest: id, toolId, validatedInput, consentToken
ToolResult: requestId, status, userMessage, redactedAuditRecord
```

- Windows, macOS ve Linux için ayrı uygulama / dosya arama modülleri.
- Uygulamalar önceden tanımlı yürütülebilir yolların izin listesinden seçilmeli. Model çıktısı shell dizgesi olarak çalıştırılmamalı.
- Dosya arama yalnızca kullanıcı tarafından seçilen köklerde; yol normalizasyonu, symlink ve dizin dışına çıkma kontrolleriyle.
- Silme / yazma / uygulama kapatma / sistem ayarı değişikliği: işleme özgü açıklama ve onay; kalıcı değişikliklerde mümkünse geri alma.
- Onay bir genel “her şeye izin” anahtarı olmamalı. İstek, parametreler ve süreyle sınırlı token olmalı.
- Modelden araç çağrısı gelmesi yetki vermez. Şema, yetki, platform ve risk doğrulaması model dışı kodda uygulanmalı.
- macOS Accessibility / Automation / Full Disk Access izinleri gibi özel yetkiler gerektiğinde ve gerekçesiyle istenmeli; varsayılan tam disk erişimi verilmemeli.
- Kurulum paketleri hedef OS üzerinde imzalama / notarizasyon / paketleme testlerinden geçirilmeli.

## Mobil istemci kararı

**Öneri: React Native tabanlı gerçek mobil istemci.** UI mantığından ziyade API sözleşmeleri, komut tipleri ve doğrulayıcılar paylaşılır. Native mikrofon izinleri, STT/TTS, Keychain / Keystore ve yaşam döngüsü ayrı mobil bağdaştırıcılarda uygulanır. Web görünümüne “yerel uygulama” etiketi koymak hedef değildir.

- iOS / Android sistem sandbox'ı keyfi masaüstü program açma veya dosya taraması yetkisi vermez.
- Mobil cihazdaki destekli işlemler native izinler ve platform API'leriyle sınırlandırılır.
- Bilgisayar kontrolü ancak kullanıcının eşleştirdiği masaüstü ajanına açık yetkiyle gönderilir.
- Arka planda mikrofon / uzun iş yürütme için işletim sistemi kısıtları ve mağaza kuralları ayrı değerlendirilir.
- Tablet yerleşimi gerçek iPadOS / Android tablet testleriyle doğrulanır; yalnızca CSS genişliği testi yeterli sayılmaz.

## Eşleştirme ve senkronizasyon (henüz yok)

- Tek kullanımlık yerel eşleştirme, kullanıcıya görünen cihaz listesi ve cihaz başına iptal.
- TLS üzerinden kimliği doğrulanmış kanal; hiçbir açık, kimliksiz LAN yürütme API'si yok.
- OS gizli bilgi kasasıyla cihaz anahtarları; tarayıcı `localStorage` API anahtarı kasası değildir.
- İsteğe bağlı, uçtan uca şifreleme tasarımı ayrıca incelenmiş geçmiş senkronizasyonu.
- En az veri ilkesi: geçmiş, ses ve cihaz günlükleri kendiliğinden buluta taşınmaz.

## Araştırma motorunun bir sonraki adımı

1. Soruyu modelle inceleyip kullanıcının görebildiği alt sorular ve bütçe oluşturma.
2. Aşama / kaynak bütçeli, iptal edilebilir iş kuyruğu.
3. Birden fazla gerçek arama, URL tekilleştirme, tarih / alan adı metadatası.
4. Tam sayfa okuma için SSRF korumalı indirici: izinli protokoller, özel ağ / metadata IP engeli, DNS yeniden bağlama kontrolü, boyut ve süre sınırı, yönlendirme kontrolü.
5. Kaynak metnini talimat değil veri kabul eden bağlam ve içerik enjeksiyonu savunması.
6. İddia–kaynak pasaj eşleştirmesi, alıntı doğrulaması, çelişki / belirsizlik listesi.
7. Rapor, kaynaklar, erişim tarihleri ve sınırlamaların dışa aktarımı.
8. Rapor kalitesi ve doğruluğu için insan incelemeli değerlendirme seti.

Mevcut sürüm tam sayfa indirmediği için özel ağdan içerik çekme aracı sunmaz. SearXNG / model adresleri yalnızca sunucu operatörü tarafından ortam dosyasında belirlenir; istemciden keyfi URL kabul edilmez.

## Yerel ses seçenekleri için değerlendirme kapısı

Whisper / türevleri veya cihazın yerel konuşma çatıları değerlendirilebilir; henüz entegre edilmedi. Seçimde Türkçe test seti, ses cihazı seçimi, gerçek zamanlı gecikme, model boyutu, RAM / GPU, pil tüketimi ve lisans uyumu birlikte ölçülmeli. Yerel TTS için de Türkçe ses modelinin lisansı yazılım motorundan ayrı incelenmeli. “Ücretsiz” veya “yerel” etiketi sadece gerçek dağıtım ve veri akışı doğrulandıktan sonra kullanılmalı.

## Sürdürülebilir geliştirme kuralları

- Yeni yetenek önce platform / izin / test tablosuna eklenir; boş düğme olarak yayınlanmaz.
- Sağlayıcı ve model erişimi testlerde taklit edilebilir olmalı; canlı kalite testleri ayrı raporlanmalı.
- Girdi, kaynak metni ve model çıktıları güvenilmeyen veri kabul edilmeli.
- Günlüklerde yalnızca olay türü, güvenli hata kodu, HTTP durum ve süre tutulmalı; komut metni / sır / upstream cevap gövdesi loglanmamalı.
- Paket güncellemesi sonrası `npm ci`, testler, TypeScript, derleme ve tarayıcı kontrolleri tekrarlanmalı.
