# Prometheus 0.2 mimarisi

## Çalışan bileşenler

```text
src/                      React / TypeScript web ve Electron renderer
  components/             Ortak UI, oturum, sağlayıcı, cihaz, senkronizasyon ve native araç panelleri
  pages/                  10 ayrı sayfa
  lib/                    Komut yönlendirme, ses, depolama, veri doğrulama ve tipler
server/
  app.mjs                 Aynı-kaynak API, girdi sınırları, HTTP sözleşmeleri
  auth.mjs                Tek sahip oturumu, cookie/bearer token, süre, iptal ve giriş hız sınırı
  config.mjs              Sahip yetkili yapılandırma; sır geri okunmaz
  storage.mjs             Atomik 0600 dosya kaydı ve AES-GCM kasa
  providers.mjs           Ollama / OpenAI uyumlu model ve SearXNG katmanı
  research.mjs            Plan → çoklu arama → sayfa okuma → yapısal sentez → alıntı eşleştirme
  safe-web.mjs            Özel IP / DNS / yönlendirme / boyut / süre sınırlı indirici
  jobs.mjs                Tek çalışanlı, kalıcı araştırma kuyruğu
  voice.mjs               Sınırlı, shell kullanmayan Whisper/Piper süreç bağdaştırıcısı
desktop/
  main.mjs                Electron pencere, loopback servis, OS kasası, native dialog ve güvenli IPC
  preload.cjs             Dar ve sabit capability/execute köprüsü
  tools.mjs               İzinli uygulama, dosya arama, ayar paneli ve audit çekirdeği
mobile/                   Ayrı React Native / Expo istemcisi, native kayıt/TTS ve SecureStore
scripts/                  Opsiyonel yerel STT ve masaüstü paketleme
```

Önceki taslakta Tauri değerlendirilmişti. Bu sürümde mevcut Node sağlayıcı/araştırma çekirdeğini ek bir Rust/Python sunucusuna bölmeden paylaşmak için **Electron** seçildi. Bunun karşılığı daha büyük runtime/paket boyutudur. React Native istemci ise web sayfasını sarmalamaz; mobil native ses, izin, Keychain/Keystore ve yaşam döngüsü API'lerini kullanır.

## Veri ve yetki sınırı

- Renderer genel Node erişimine sahip değildir. `contextIsolation`, sandbox ve `nodeIntegration:false` kullanılır.
- Yerel araçlar yalnız Electron IPC'sinde bulunur; web/mobil HTTP istemcisinin cihaz kontrol uç noktası yoktur.
- IPC, gönderen pencereyi ve frame origin'ini doğrular. Serbest shell/argv, silme, şifre okuma veya keyfi dosya yazma aracı bulunmaz.
- Uygulama/klasör izinleri native dosya seçicisinden gelir. Her uygulama açma/kapatma, dosya konumunu gösterme ve ayar paneli açma native onay ister. Dosya adı taraması daha önce seçilmiş köklerde salt okunurdur.
- Model yalnız metin/araştırma JSON'u üretir. Model çıktısı işletim sistemi komutu olarak yürütülmez.
- Sunucu tek sahipli bir çalışma alanıdır; bütün yetkili cihazlar aynı araştırmaları ve isteğe bağlı eşitleme kopyasını görür. Çok kullanıcılı izolasyon iddiası yoktur.

## Araştırma ve işler

Konu → modelin 2–4 sorgulu planı → gerçek SearXNG sorguları → en fazla 8 tekil kaynak → ilk 5 sayfayı güvenli okuma denemesi → yapısal bulgu/kaynak/alıntı/çelişki JSON'u → numara ve alıntı eşleştirme → rapor.

Kaynak başına `mode=full|summary`, erişim tarihi ve okuma hatası korunur. Okunamayan sayfa okunmuş gibi sunulmaz. Alıntının sayfa metninde bulunması ayrı kontroldür; iddianın semantik doğruluğu veya kaynağın güvenilirliği kontrolü değildir.

Yeni UI `/api/jobs` ile kalıcı iş oluşturur ve gerçek durumu sorgular. Eski istemciler için `/api/research` NDJSON akışı korunur; bu bağlantıya bağlı eski yol sayfa kapanınca iptal olur. Kalıcı iş sayfa kapanınca sürer. Servis yeniden başlatılınca aktif/sıradaki işler otomatik tekrar yürütülmez, `interrupted` kaydı olarak görünür. Kullanıcı tekrar başlatır; aynı ücretli model çağrısının sessiz tekrarı önlenir.

Kuyruk tek süreç/tek sunucu içindir; yatay ölçekleme, birden çok worker, dosya kilitli dağıtık koordinasyon veya yüksek erişilebilirlik sağlamaz. Kalıcı dosya yazımı atomiktir ancak veritabanı transaction garantisi değildir.

## Yerel çok adımlı görevler

Renderer, izinli uygulama açma ve dosya arama adımlarından en fazla 8 adımlı görünür plan oluşturur. Adımlar sırayla IPC'ye gider; native çekirdek her adımda izinleri yeniden denetler. İptal/hata sonraki adımları durdurur. Bu yan etkili planlar özellikle otomatik yeniden başlatılmaz ve kalıcı araştırma kuyruğuna konmaz. Doğal dilden keyfi uygulama içi otomasyon/planlama henüz yoktur.

## Ses

Tarayıcı Web Speech ve yerel kayıt modları ayrıdır. Yerel mod `getUserMedia` / MediaRecorder / seçili cihaz ile kayıt alıp sunucuya gönderir. Opsiyonel faster-whisper modeli yalnız yerel klasörden yüklenir; gizli model indirmesi yapılmaz. Python script'i Electron ASAR paketinde de çalışabilmesi için geçici dizine kopyalanır. Piper metni stdin üzerinden alır; metin komut argümanına çevrilmez. Geçici kayıtlar normal tamamlanma/hata/iptalde temizlenir.

Mobil native kayıt, arka plana geçişte durdurulup atılır. Native TTS cihaz motorunu kullanır. Türkçe kalite, cihaz ve model dağıtım lisansı ayrıca doğrulanmalıdır. Sürekli dinleme eklenmedi.

## Eşitleme

Tek sahipli sunucu, açık onayla tercih/geçmiş snapshot alır. Revision uyuşmazlığı 409 döndürür. UI göndermeden önce sürümü okur; indirirken yerel verinin değişeceğini açıklar. Otomatik birleştirme, uçtan uca şifreleme, CRDT veya arka plan eşitleme yoktur. Araştırmalar ayrı olarak sunucuda tutulur.

## Doğrulanması veya geliştirilmesi gerekenler

- İmzalı masaüstü paketleri, gerçek OS GUI davranışları ve macOS uygulama yaşam döngüsü.
- APK/IPA, native izin/recording/TTS, gerçek iPad/Android tablet ekran testleri.
- Canlı model JSON uyumluluğu, Türkçe kalite ve araştırma değerlendirme veri seti.
- Whisper/Piper fiziksel ses, performans, RAM ve lisans doğrulaması.
- Uçtan uca şifreli otomatik eşitleme ve uzaktan masaüstü eşleştirme (şu an yok).
- Çok kullanıcılı kimlik ve veri izolasyonu (şu an yok).
- Kapsamlı uygulama içi otomasyon ve OS ayar değerini değiştirme (şu an yok).

Güncel doğrulama: [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).
