# Prometheus AI · v0.2.0

**Düşün. Söyle. Harekete geç.** Türkçe öncelikli, kişiselleştirilebilir kişisel asistan.

Web arayüzüne ek olarak izinli **Electron masaüstü istemcisi**, ayrı **React Native / Expo mobil istemcisi**, kalıcı araştırma kuyruğu ve yerel ses motoru bağdaştırıcıları içerir. Ücretli API zorunlu değildir; yerel Ollama kullanılabilir.

> **Teslim durumu: platform doğrulama sürümü.** Web derlemesi, otomatik testler, mobil TypeScript ve Android/iOS JavaScript paketlemesi doğrulandı. İmzalı masaüstü yükleyicisi, APK/IPA, gerçek cihaz, fiziksel mikrofon ve canlı model/arama kalite testleri tamamlanmadı. Bu depoyu bütün platformlarda test edilmiş 1.0 final olarak değerlendirmeyin. Ayrıntılar: [doğrulama matrisi](docs/RELEASE-CHECKLIST.md).

## 1. Web / sunucu kurulumu

Node.js **22.12+** ve npm gerekir. Mobil için Expo'nun önerdiği güncel Node 22 sürümünü kullanın.

```bash
npm ci
cp .env.example .env
npm run dev
```

PowerShell kopyalama: `Copy-Item .env.example .env`.

- Arayüz: `http://localhost:5173`
- Aynı-kaynak `/api` istekleri Vite tarafından Node servisine iletilir. Tarayıcı kodunda ziyaretçinin localhost adresine API çağrısı yoktur.
- Yalnızca arayüzü denemek için model veya API anahtarı gerekmiyor. Model yoksa gerçek bağlantı hatası gösterilir; sahte yanıt üretilmez.
- Elektron indirmesinin engellendiği yalnız-web ortamında: `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci`. Daha sonra masaüstü için `node node_modules/electron/install.js` gerekir.

### Parolalı sahip oturumu

Uzak erişimden **önce** `.env` dosyasında `PROMETHEUS_PASSWORD` için uzun, benzersiz bir parola tanımlayın ve servisi yeniden başlatın. Gerçek parolayı Git'e eklemeyin.

- Web: HttpOnly, SameSite=Strict oturum çerezi; HTTPS girişinde Secure.
- Mobil: yalnız HTTPS bağlantısı; oturum token'ı native Keychain/Keystore'da.
- Oturum 12 saat geçerli. Sunucu yeniden başlarsa tekrar giriş gerekir.
- Ayarlar → **Bağlı oturumlar** bölümünden cihaz oturumu iptal edilebilir.
- Bu bir **tek sahipli** sunucudur; birden çok kullanıcının verilerini ayıran hesap sistemi yoktur.

Parola yokken geliştirme arayüzü açıktır; yapılandırma yazma ve eşitleme uç noktaları kapalıdır. Sunucuyu bu modda internete açmayın. Önizleme için `0.0.0.0` dinlenir; güvenlik duvarı, HTTPS ve güvenilir reverse proxy operatör sorumluluğundadır. Üretim dağıtımından önce bağımsız güvenlik değerlendirmesi gerekir.

### Üretim dosyalarını yerelde sunma

```bash
npm run build
npm start
```

Node servisi `http://localhost:3001` üzerinde derlenmiş arayüz ve API'yi birlikte sunar. `dist/` Git'e gönderilmez.

## 2. Model / sağlayıcı kurulumu

### Yerel Ollama

Ollama'yı bilgisayarınıza kurup bir modeli indirin:

```bash
ollama pull llama3.2:3b
ollama serve
```

Servis zaten çalışıyorsa ikinci kez başlatmayın. Varsayılan `.env`:

```dotenv
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
AI_MODEL=llama3.2:3b
```

Ayarlar → **Bağlantıyı test et** gerçek `/api/tags` veya uyumlu sağlayıcı `/models` isteği yapar. Dönen modeller model alanında önerilir. Boş model alanı sunucu varsayılanını kullanır.

**Uzak önizleme notu:** `127.0.0.1`, Prometheus sunucusunun makinesidir; ziyaretçinin bilgisayarı değildir. Arena önizlemesi bilgisayarınızdaki Ollama'ya kendiliğinden ulaşamaz. Yerel kullanım için projeyi bilgisayarınızda çalıştırın; Ollama'yı açık portla internete yayınlamayın.

### Uygulama içinden sağlayıcı ve anahtar yönetimi

Parolalı sahip oturumunda Ayarlar → **Sağlayıcıyı uygulamadan yönet**:

1. Ollama veya OpenAI uyumlu sağlayıcıyı seçin.
2. Gerçek servis adresini, model adını ve gerekirse API anahtarını girin.
3. Kaydedin ve bağlantıyı test edin.

Anahtar yazma amaçlı alınır; kaydedilmiş değer UI'ya geri dönmez. Alanı boş bırakmak aynı sağlayıcının anahtarını korur; sağlayıcı değiştirmek eski anahtarı diğer sağlayıcıya taşımaz. Açık silme seçeneği vardır. Dosyadaki ayarlar `.env` varsayılanlarının önüne geçer.

Alternatif ortam yapılandırması:

```dotenv
AI_PROVIDER=openai
AI_BASE_URL=https://saglayiciniz.example/v1
AI_API_KEY=gercek_degeri_yalnizca_yerel_dosyaya_yazin
AI_MODEL=model-adi
```

Örnek adres/anahtar çalışır bir hizmet değildir. Ücretsiz API kotası varsayılmaz. Fiyat, lisans, veri işleme, model kullanım koşulları ve donanım gereksinimini seçtiğiniz sağlayıcıdan doğrulayın. Ollama yazılımı ile model ağırlıklarının lisansları ayrıdır. Yerel model CPU'da çalışabilir; Türkçe kalite, hız ve RAM ihtiyacı modele/nicelemeye bağlıdır.

## 3. Gerçek çok adımlı araştırma

Kendi SearXNG sunucunuzda JSON aramasını açın:

```yaml
# settings.yml bölüm örneği; tam sunucu kurulumu değildir
search:
  formats: [html, json]
```

`.env` veya sahip ayarlarında `SEARXNG_URL=http://127.0.0.1:8080` tanımlayın.

Akış:

1. Modelden konuya özel hedef, alt sorular ve **2–4 sorgu** alınır.
2. Her sorgu SearXNG ile gerçekten aranır; URL'ler tekilleştirilir, en fazla **8 kaynak** tutulur.
3. İlk **5 kaynağın** tam HTML/metin sayfası okunmaya çalışılır. Özel ağ, metadata, loopback, izin verilmeyen port/protokol, DNS ve yönlendirme kontrolleri uygulanır. Sayfa 1 MB, yönlendirme 3, DNS 8 sn, HTTP 15 sn ile sınırlıdır.
4. Okunamayan sayfa açıkça **yalnız arama özeti** olarak kalır. PDF/JS gerektiren sayfalar desteklenmez.
5. Modelden iddia–kaynak numarası–alıntı eşleştirmesi, çelişkiler, belirsizlikler ve sonuç alınır.
6. Kaynak numaraları doğrulanır. Alıntının okunan tam sayfa metninde birebir bulunup bulunmadığı ayrı işaretlenir.
7. Plan, kaynaklar, erişim tarihi ve Markdown rapor sunulur.

**Alıntı eşleşmesi iddianın doğruluğunu veya kaynağın güvenilirliğini kanıtlamaz.** Bağımsız olgu doğrulaması ve kapsamlı kaynak kalite değerlendirmesi henüz yoktur. Bozuk model JSON'u veya geçersiz kaynak referansı başarılı rapor sayılmaz.

### Kalıcı görevler

`/api/jobs` sunucudaki kuyruktur; arayüz 2,5 sn aralıkla gerçek durumu alır. Bir iş yürütülür, en fazla 5 aktif/sıradaki iş ve 50 kayıt tutulur. Sayfayı kapatmak işi durdurmaz; açık **Durdur** eylemi gerekir. Sunucu kapanırsa devam eden işler `interrupted` olarak korunur; konu tekrar başlatılmalıdır. Sağlayıcının iptal sonrası hesaplamayı anında kesmesi garanti edilmez. Tamamlanmış kayıtlar onayla sunucudan silinebilir.

## 4. Yerel masaüstü istemcisi

```bash
npm run desktop
```

Electron ikilisi, grafik oturumu ve işletim sistemi kütüphaneleri gerekir. Arayüz üretim olarak derlenir; Electron içinde rastgele portta yalnız loopback dinleyen servis açılır. Renderer sandbox, context isolation ve `nodeIntegration:false` ile çalışır. Dar preload IPC köprüsü yalnız doğru pencere/kaynaktan çağrı kabul eder; HTTP API üzerinden cihaz aracı sunulmaz. Geliştirmede proje `.env` dosyası, paketli uygulamada Electron kullanıcı veri dizinindeki isteğe bağlı `.env` okunur. Electron gömülü servisi ayrı yerel veri alanıdır; şu an uzak bir merkezi sunucuya otomatik bağlanmaz. Web ve mobil eşitlemesi aynı yapılandırılmış Node sunucusunu kullanır; uzaktan masaüstü eşleştirme henüz yoktur.

Araçlar ekranında:

- Native dosya seçiciyle uygulamaya izin verin. **Her açma** için native onay gerekir; serbest komut satırı parametresi verilmez.
- Windows/Linux'ta yalnız Prometheus'un bu oturumda başlattığı, hâlâ çalışan süreç için **kapatma** sinyali gönderilir. Kaydedilmemiş veri kaybı uyarısı/native onayı gerekir. macOS'ta bu kapatma aracı yoktur.
- Native klasör seçiciyle arama kökü verin. Dosya adı araması symlink takip etmez; 100 sonuç / 10.000 giriş / yaklaşık 4 sn sınırı vardır. Kısmi sonuç açıkça belirtilir.
- Konumu dosya yöneticisinde gösterme ayrıca onay ister. Dosya çalıştırılmaz veya değiştirilmez.
- Ses/ağ/ekran ayar **paneli** açılabilir; uygulama sistem ayarı değerini değiştirmez. Linux'ta GNOME Control Center gerekir.
- En fazla 8 izinli uygulama/arama adımıyla yerel plan oluşturabilirsiniz. Adımlar sırayla yürür; iptal/hata sonraki adımları durdurur. Plan yeniden başlatmada otomatik tekrar yürütülmez.
- Yetki iptali ve içerik/yol/parola tutmayan son 500 işlem kaydı vardır.

Örnek native komutlar: `uygulama.exe aç`, `uygulama.exe kapat`, `dosya bul rapor`. İzinli ad eşleşmiyorsa Araçlar'a yönlendirilir. Keyfi shell, dosya silme, parola okuma veya sınırsız otomasyon sunulmaz.

### Paketleme

```bash
npm run desktop:package
# İsteğe bağlı hedef: npm run desktop:package -- --platform=win32
```

Paketleme argümanını doğrudan kullanmak için: `npm run build && node scripts/package-desktop.mjs --platform=win32` (veya `darwin`, `linux`). `release/` altında taşınabilir uygulama klasörü hedeflenir; imzalı yükleyici veya mağaza yayını değildir. macOS imzalama/notarizasyonu, Windows kod imzası ve hedef OS doğrulaması ayrıca gerekir. Bu ortamda Electron runtime indirmesi başarısız olduğundan paket üretimi/çalıştırması doğrulanmadı.

## 5. Gerçek mobil istemci

`mobile/` ayrı bir **React Native / Expo** projesidir; WebView kopyası değildir.

```bash
cd mobile
npm ci
npm start
# Android SDK / cihaz varsa:
npm run android
# macOS + Xcode / iOS cihaz varsa:
npm run ios
```

Mobil istemci: HTTPS sunucusuna sahip parolasıyla giriş, Keychain/Keystore token, native mikrofon izni ve kayıt, native TTS, yazılı sohbet/yerel geçmiş, araştırma başlatma/durdurma, kalıcı görev listesi, koyu/açık tema, vurgu rengi ve açık onaylı eşitleme.

Mikrofon kaydı en fazla 60 sn'dir; arka plana geçişte iptal edilir. Kayıt seçtiğiniz sunucunun Whisper motoruna gider; sunucu uzaktaysa cihaz içi işleme değildir. API anahtarları mobil istemciye gönderilmez. Mobil uygulama masaüstü programlarını kontrol etmez. Arayüz tablet genişliğinde 900 px içerik sınırı kullanır; gerçek iPad/Android tablet kullanılabilirlik testi ayrıca gerekir.

Android/iOS **JavaScript bundle** üretimi ve TypeScript geçti. Bu, APK/IPA, mağaza onayı, native derleme veya gerçek cihaz testi değildir. Native model, izin ve ses davranışları cihazda doğrulanmalıdır. Expo'nun debug bytecode kapatma uyarısı yalnız doğrulama export'una aittir; native release build'de normal Hermes yapılandırması kullanılmalı.

## 6. Yerel ses motorları

Varsayılan Web Speech tarayıcı modudur; tarayıcı sağlayıcısı bulut işleme kullanabilir. Tamamen yerel olduğu varsayılmaz. Sesli Asistan ekranında **Yerel Whisper** modunu seçerek gerçek `MediaRecorder` kaydı ve seçilebilir mikrofon kullanabilirsiniz.

```bash
python3 -m venv .venv
# Ortama uygun şekilde .venv'yi etkinleştirin
pip install -r scripts/requirements-voice.txt
```

Önceden indirdiğiniz yerel Whisper model klasörü ve Python yolu:

```dotenv
STT_PYTHON=/tam/yol/.venv/bin/python
WHISPER_MODEL_PATH=/tam/yol/yerel-whisper-modeli
PIPER_PATH=/tam/yol/piper
PIPER_MODEL_PATH=/tam/yol/turkce-ses.onnx
```

Model dosyaları otomatik indirilmez. Model/voice lisansını, Türkçe kaliteyi, binary güvenilirliğini ve donanım gereksinimini doğrulayın. Whisper CPU/int8 kullanır; Piper için motor ile ses modelinin dağıtım/lisans koşulları ayrı incelenmelidir.

Ses kaydı en fazla 10 MB, ses süreci 120 sn ile sınırlıdır. Sunucuda geçici dosya oluşturulur ve işlem sonunda silinir; süreç zorla/işletim sistemi tarafından kapanırsa OS geçici dizinini ayrıca kontrol edin. TTS WAV yanıtı en fazla 16 MB'dır. Piper/Whisper kurulmadıysa açık hata gösterilir; yalnız mikrofon animasyonu ile başarı taklidi yapılmaz.

## 7. Kişiselleştirme, sohbet ve eşitleme

- Kalıcı tema, özel vurgu, yazı boyutu, arka plan, kompakt görünüm, ses/dil/hız.
- Hızlı kartları yukarı/aşağı sıralama; menüleri tek tek gizleme. Ana Sayfa/Ayarlar/Kişiselleştirme erişilebilir kalır.
- İsteğe bağlı **son 6 sohbet çiftini bağlama ekleme**. Varsayılan kapalıdır; açınca o metinler sağlayıcıya gönderilir.
- Web geçmişi son 100 kayıtla tarayıcıda; native mobil geçmişi uygulama dosyalarında. Şifreli kasa değildir.
- Ayarlar → Cihazlar arası aktarım: sunucu sürümünü kontrol et, açık onayla gönder/al/sil. Revision çakışması sessiz üzerine yazmayı engeller.
- Bu **elle yapılan, tek sahipli** eşitlemedir; otomatik veya uçtan uca şifreli senkronizasyon değildir. Araştırmalar ayrıca sunucudaki görevlerde saklanır.

## 8. Veri ve gizli anahtarlar

`PROMETHEUS_DATA_DIR` varsayılanı `.prometheus/`; masaüstünde Electron kullanıcı veri dizinidir. Git'e gönderilmez.

- `vault.json`: AES-256-GCM şifreli sağlayıcı yapılandırması. Web sunucusunda `vault.key` aynı kullanıcı dizininde 0600 izniyle tutulur; bu, makineyi/aynı kullanıcıyı ele geçiren kişiye karşı koruma değildir. İkisini birlikte yedekleyin veya ikisini birlikte silip yapılandırın.
- Electron OS güvenli kasası varsa master key `safeStorage` ile korunur. Güvenli kasa yoksa yeni sır kaydetme kapatılır; anahtarsız Ollama kullanılabilir.
- `jobs.json`: konular, planlar, tam kaynak metinleri ve raporlar. `workspace.json`: açıkça eşitlenen tercih/geçmiş. Bunlar şifreli değildir.
- `desktop-permissions.json`: izinli uygulama/klasör yolları. `desktop-audit.json`: yalnız araç türü, durum, zaman ve kayıt kimliği.
- API loglarına istek gövdesi, API anahtarı, komut metni veya upstream hata gövdesi yazılmaz.

Daha fazlası: [SECURITY](docs/SECURITY.md), [ARCHITECTURE](docs/ARCHITECTURE.md).

## 9. Test ve doğrulama

```bash
npm test                      # 41 birim / gerçek HTTP / güvenlik / araç testi
npm run check
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e               # 13 tarayıcı testi
npm --prefix mobile run check
cd mobile && npx expo export --platform android --no-bytecode --output-dir .output
```

Linux tarayıcı bağımlılıkları için `npx playwright install --with-deps chromium` gerekebilir. Özel ikili: `CHROMIUM_PATH=/tam/yol/chromium npm run test:e2e`. GitHub CI web testlerini ve mobil Android JS export'unu tekrarlar; CI tanımı eklenmesi uzaktaki CI'nın geçtiği anlamına gelmez.

Bu ortamda **canlı Ollama/SearXNG, Whisper/Piper çıkarımı, gerçek mikrofon/hoparlör, Electron çalışma zamanı ve gerçek mobil cihaz** doğrulanmadı. Testlerde model/arama/native onay yanıtları kontrollü bağımlılıklarla sınandı; gerçek dosya araması ve gerçek HTTP izin kontrolleri ayrıca çalıştırıldı. Hiçbir ücretli/ücretsiz hizmet kotası doğrulanmadan ücretsiz ilan edilmedi.

## Sorun giderme

- Model yok: Ollama çalışıyor mu, model indirilmiş mi, adres sunucuya göre doğru mu? Ayarlar'dan test edin.
- Sahip ayarları/eşitleme 403: `.env` içinde güçlü `PROMETHEUS_PASSWORD` tanımlayıp servisi yeniden başlatın ve giriş yapın.
- Mikrofon: HTTPS/localhost, site/native izin, iframe izin politikası ve seçili cihazı kontrol edin. Tarayıcı STT özel cihaz seçimini desteklemez; yerel kayıt modu destekler.
- Araştırma: model JSON planı/sentezi ve gerçek SearXNG bağlantısı gerekir. Bot engeli/PDF/JS sayfası özet olarak işaretlenebilir.
- Native mobil: telefonun localhost adresi PC değildir. HTTPS sunucu adresi ve geçerli sertifika gerekir.
- Electron: indirme, sistem GUI kütüphaneleri, OS güvenli kasa ve işletim sistemi izinleri gerekir. Runtime yoksa paketleme kodunun bulunması uygulamanın çalıştığını kanıtlamaz.
- Origin hatası: reverse proxy Host bilgisini korumalıdır. Koruma CORS `*` yapılarak kaldırılmamalı.
