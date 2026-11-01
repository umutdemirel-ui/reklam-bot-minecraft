# Prometheus AI

**Düşün. Söyle. Harekete geç.**

Prometheus, Türkçe öncelikli kişisel yapay zekâ asistanının çalışan ilk web sürümüdür. Siyah / ateş kırmızısı arayüz; masaüstü, tablet ve telefon ekranlarına uyarlanır. Ücretli API zorunlu değildir: Ollama ile kendi modelinizi çalıştırabilirsiniz.

> **Durum: v0.1.0 · Geliştirici önizlemesi.** İlk aşama (arayüz, navigasyon, kalıcı kişiselleştirme, duyarlı yerleşim) tamamlandı. Model / ses bağlantısı ve kaynaklı araştırma özeti altyapısı eklendi. Bu sürüm, tam yetkili bilgisayar kontrol uygulaması veya yerel mobil uygulama değildir.

## Hızlı başlangıç

Gereksinimler: **Node.js 22.12+**, npm ve güncel bir tarayıcı. Yalnızca arayüzü çalıştırmak için model indirmek veya API anahtarı almak gerekmez.

```bash
npm ci
cp .env.example .env
npm run dev
```

Windows PowerShell'de kopyalama: `Copy-Item .env.example .env`.

- Arayüz: `http://localhost:5173`
- API: `http://localhost:3001/api/health`
- Ayarlar → **Bağlantıyı test et** gerçek model bağlantısını sınar.
- Model kurulu değilse yazılı komut açıklayıcı bağlantı hatası verir; sahte AI yanıtı üretilmez.

Geliştirmede Vite `/api` isteklerini Node servisine iletir. Tarayıcı kodunda sabit `localhost` API adresi yoktur. Sunucular önizleme desteği için `0.0.0.0` dinler; **API'yi güvenlik duvarı / kimlik doğrulama olmadan internete açmayın.**

### Üretim derlemesini yerelde çalıştırma

```bash
npm run build
npm start
```

`http://localhost:3001` üzerinde Node servisi hem derlenmiş arayüzü hem API'yi sunar. `dist/` üretilir, Git'e eklenmez. Bu, herkese açık çok kullanıcılı üretim dağıtımı için güvenlik sertifikası değildir.

## Model bağlantısı

### Seçenek A — Ollama (varsayılan)

Ollama'yı kendi bilgisayarınıza kurduktan sonra:

```bash
ollama pull llama3.2:3b
ollama serve
```

Ollama zaten arka planda çalışıyorsa ikinci servis başlatmayın. `.env`:

```dotenv
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
AI_MODEL=llama3.2:3b
```

Ardından Prometheus sunucusunu yeniden başlatın. Ayarlar'da bağlantıyı sınayın; dönen modeller listesi model adı alanında önerilir. Alanı boş bırakmak sunucunun varsayılanını kullanır.

Yerel model için API aboneliği gerekmez; donanım, elektrik ve indirme maliyeti size aittir. Model lisansı Ollama yazılımının lisansından ayrıdır; indirdiğiniz modelin kullanım koşullarını kontrol edin. RAM/VRAM ihtiyacı model, niceleme ve bağlam boyutuna göre değişir. 3B nicelemeli bir model başlangıç seçeneğidir; Türkçe çıktı kalitesi ve hız garanti edilmez. Daha güçlü Türkçe destekli modeli model adını değiştirerek kullanabilirsiniz.

**Arena / uzak sunucu notu:** `127.0.0.1`, API servisinin çalıştığı makinedir; ziyaretçinin bilgisayarı değildir. Arena önizlemesi sizin bilgisayarınızdaki Ollama'ya kendiliğinden bağlanamaz. Yerel kullanım için projeyi kendi cihazınızda çalıştırın. Uzak sağlayıcı kullanacaksanız güvenli ağ, TLS ve kimlik doğrulama kurun; Ollama'yı açık portla internete yayınlamayın.

### Seçenek B — OpenAI uyumlu sağlayıcı

```dotenv
AI_PROVIDER=openai
AI_BASE_URL=https://saglayiciniz.example/v1
AI_API_KEY=gercek_anahtari_sadece_yerel_env_dosyasina_yazin
AI_MODEL=saglayicinin-model-adi
```

Bu örnekteki adres/anahtar çalışır bir hizmet değildir. Sağlayıcınızın gerçek bilgilerini yerel `.env` dosyanıza yazın. `/models` ve `/chat/completions` sözleşmeleri desteklenmelidir. Bazı sağlayıcılarda `/models` kapalı olabilir; bağlantı testi buna göre başarısız olur.

**Ücretsiz kota varsayımı yapılmaz.** Fiyat, veri saklama, lisans, erişim koşulları ve kota değişikliklerini sağlayıcıdan doğrulayın. API anahtarları UI'dan girilmez, tarayıcı depolamasına yazılmaz, sunucudan geri dönmez. Sağlayıcı değiştirmek için `.env` dosyasını düzenleyip servisi yeniden başlatın. `VITE_` önekli değişkenlere sır yazmayın.

## Neler çalışıyor?

| Yetenek | Bu sürüm |
| --- | --- |
| 10 sayfa ve adreslenebilir navigasyon | Ana Sayfa, Sesli Asistan, Derin Araştırma, Araçlar, Görevler, Geçmiş, Ayarlar, Kişiselleştirme, Gizlilik, Hakkında |
| Kişiselleştirme | Koyu / açık tema, 5 vurgu + özel renk, sade arka plan, kompakt görünüm, kart / ipucu görünürlüğü, yazı boyutu, ses ve hız |
| Kalıcılık | Tercihler, son 100 komut ve son 20 araştırma `localStorage` içinde; bozuk veriler için güvenli geri dönüş |
| Yazılı komut | Ollama / uyumlu API'ye gerçek istek; boş / uzun girdi kontrolü, iptal ve hata gösterimi |
| Türkçe ses girişi | Destekleyen tarayıcıda Web Speech API; kullanıcı başlatır, transkripti kontrol edip gönderir |
| Sesli yanıt | Cihazın `speechSynthesis` motoru, dil / hız seçimi ve manuel seslendirme |
| Web araması | `İnternette ara …` → kullanıcı tıklamasıyla yeni sekmede arama; sonuçlar okunmuş gibi gösterilmez |
| Kaynaklı araştırma özeti | SearXNG + model yapılandırıldığında gerçek arama, kaynak özetleri, ilerleme akışı, iptal, Markdown dışa aktarma |
| Geçmiş | Arama, detay, tekrar kullanma, tek kayıt / onaylı tümünü silme, JSON indirme |
| Uygulama açma / dosya arama / sistem kontrolü | **Yok.** UI yetenek sınırını açıkça belirtir; hiçbir cihaz işlemi yapılmaz |
| Yerel masaüstü / mobil paket, senkronizasyon | **Yok.** Mimari yol haritasında |

### Örnek komutlar

- `Bana bir çalışma planı hazırla` → yapılandırılan modele gönderilir.
- `İnternette ara Python kaynakları` → arama bağlantısı hazırlanır; kendiliğinden sekme açılmaz.
- `Derin araştırma yerel yapay zekâ modelleri` → konu doldurularak araştırma ekranına gidilir; araştırmayı kullanıcı başlatır.
- `Geçmişi göster` / `Ayarları aç` → ilgili sayfa açılır.
- `Chrome'u aç` / `Dosya bul` → web istemcisinin yerel erişimi olmadığı açıklanır ve geçmişe kaydedilir.

Her model isteği şu an bağımsızdır; eski konuşmalar otomatik olarak bağlam penceresine eklenmez. Bu sürümde komut yönlendirme sınırlı ve belirlenimlidir; model çıktısı bir işletim sistemi komutu olarak çalıştırılmaz.

## Ses ve gizlilik

Ses tanıma tarayıcıya bağlıdır; örneğin Chrome / Edge sürümlerinde destek bulunabilir. Tarayıcı, işletim sistemi, HTTPS ve site mikrofon izinleri sonucu etkiler. Firefox / Safari ve mobil sürümlerde eşdeğer destek garanti edilmez.

- **Sürekli / arka plan dinleme yoktur.** Mikrofon kendiliğinden açılmaz.
- Ses kaydı uygulamada saklanmaz. Gönderilen transkript komut geçmişine girer.
- Tarayıcı tanıma motoru sesi kendi bulut servisine gönderebilir; tamamen yerel / çevrimdışı çalışma iddiası yoktur.
- Web Speech API özel mikrofon cihaz seçimi sağlamaz. Varsayılan cihazı tarayıcı / sistem ayarından seçin.
- Ses sentezinde kullanılabilir sesler ve Türkçe telaffuz kalitesi cihaza bağlıdır.
- Geçmiş şifreli kasa değildir. Paylaşılan cihazda hassas komut girmeyin; verileri Geçmiş / Görevler sayfalarından silebilirsiniz.
- Senkronizasyon, kullanıcı hesabı, analitik veya reklam izleme eklenmedi. İnter yazı tipi paketten yerel sunulur; harici font CDN isteği yoktur.

Yerel Whisper / benzeri STT ve yerel TTS seçenekleri bu sürüme dahil edilmedi. Seçimden önce Türkçe kalite, model lisansı, dağıtım koşulları, paket boyutu, RAM ve platform izinleri ayrı doğrulanmalıdır.

## Gerçek web araştırması kurulumu

Model ile web erişimi ayrı bileşenlerdir. Kendi SearXNG örneğinizin JSON çıktısını açın:

```yaml
# SearXNG settings.yml bölüm örneği; tam sunucu kurulumu değildir.
search:
  formats:
    - html
    - json
```

Prometheus `.env` dosyasına:

```dotenv
SEARXNG_URL=http://127.0.0.1:8080
```

SearXNG servisini ve modelinizi çalıştırın; Prometheus'u yeniden başlatın. Açık kaynak yazılım, barındırma veya arama sağlayıcılarına erişimin masrafsız / sınırsız olduğu anlamına gelmez. Kendi örneğinizi yönetmeniz önerilir; herkese açık örnekler JSON isteklerini engelleyebilir.

**Bu sürümün sınırı:** Konuya özel otonom planlama, alt sorularla yinelenen arama, tam sayfa indirme ve bağımsız olgu doğrulaması henüz yoktur. Sabit akış: hazırlık → tek gerçek arama → ilk 8 kaynak özetinin model tarafından karşılaştırılması → numaralı kaynaklı rapor. Kaynak numaralarının mevcut kaynak aralığında olduğu kontrol edilir; bu, iddianın doğruluğunu veya kaynağın iddiayı desteklediğini kanıtlamaz. Rapor açıkça arama özetlerine dayandığını belirtmelidir. Eksik kaynak / model / bağlantı durumunda başarılı rapor gösterilmez.

Sunucu `application/x-ndjson` olaylarıyla gerçek aşamaları iletir. Durdurmak tarayıcı isteğini ve sunucunun arama / model çağrısına ait sinyali iptal eder; sağlayıcının hesaplamayı anında durdurması garanti edilemez. Sayfa değişimi görev sürerken mümkündür. Sayfa yenilenince devam eden görev kaybolur; dayanıklı arka plan iş kuyruğu yoktur.

## Mimari

```text
src/
  App.tsx                  # Navigasyon, durum ve iş akışı koordinasyonu
  components/ui.tsx        # Ortak logo, düğme, toggle, boş durum
  pages/                   # Her sayfa için ayrı React bileşeni
  lib/
    types.ts               # İstemci veri sözleşmeleri
    navigation.ts          # Sayfalar ve ortak aşamalar
    commands.mjs           # Belirlenimci komut yönlendirici (OS yürütmez)
    speech.ts              # Gerçek tarayıcı STT/TTS bağdaştırıcısı
    storage.ts             # Kalıcı tercih / geçmiş React katmanı
    persistence.mjs        # Depolanan veriyi doğrulama
    client.ts              # Aynı-kaynak API, tarih ve dosya dışa aktarma
  styles.css               # Tema değişkenleri, ortak tasarım ve kırılımlar
server/
  index.mjs                # Ortam yükleme ve servis başlangıcı
  app.mjs                  # HTTP doğrulama, API, araştırma akışı, statik servis
  providers.mjs            # Model / arama sağlayıcıları ve kaynak numarası kontrolü
tests/                     # Birim, gerçek HTTP API ve Playwright testleri
```

Teknoloji kararı: Boş depoda hızlı ve bakımı kolay bir ilk istemci için React + TypeScript + Vite; gizli anahtarları istemciden ayırmak için küçük Express servisi. Veritabanı, tam otomasyon çatısı veya ağır UI kütüphanesi bu aşamada eklenmedi. Modeller / araştırma / ses ve tasarım birbirinden ayrıldı.

Ayrıntılı sonraki aşamalar: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Güvenlik sınırları: [docs/SECURITY.md](docs/SECURITY.md).

## Doğrulama

```bash
npm test                 # 21 birim / HTTP API testi
npm run check            # TypeScript
npm run format:check     # Biçim tutarlılığı
npm run build            # Üretim derlemesi
npx playwright install chromium
npm run test:e2e         # 9 tarayıcı testi
```

Linux'ta tarayıcı sistem bağımlılıkları yoksa `npx playwright install --with-deps chromium` gerekebilir. Kurulu bir Chromium ile `CHROMIUM_PATH=/tam/yol/chromium npm run test:e2e` kullanılabilir. Windows'ta eşdeğer ortam değişkeni sözdizimini kullanın. Playwright gerekirse geliştirme sunucusunu başlatır.

Bu geliştirme ortamında doğrulananlar:

- 21 birim / gerçek HTTP API testi ve 9 Chromium tarayıcı testi geçti.
- 10 sayfalı navigasyon; 360px dar mobil sayfalar; 390 / 768 / 1440px ana ekran; yatay taşma kontrolü.
- Tema / vurgu kalıcılığı, bozuk yerel veri, geçmiş ve onaylı silme.
- Gerçek Vite proxy / Origin uyumu, hatalı gövde / boyut / model doğrulama.
- Model başarı / hata ve araştırma akışı **test sağlayıcı yanıtlarıyla** sınandı; fiziksel ses yerine tarayıcı olay sözleşmesi taklit edildi.
- Canlı Ollama çıkarımı, canlı SearXNG kaynak kalitesi, gerçek mikrofon / hoparlör ve farklı işletim sistemi / Safari / iOS testleri **yapılmadı**. Bu ortamda ilgili servisler / donanım yok.

GitHub Actions iş akışı test ve derlemeyi tekrarlar; yerelde geçmesi uzaktaki CI sonucunun geçtiği anlamına gelmez.

## Sorun giderme

- **Model bağlantısı kurulamadı:** Ollama çalışıyor mu, model indirilmiş mi, `.env` adresi doğru mu? Ayarlar'dan test edin. Uzak önizleme sizin cihazınızın localhost adresine ulaşamaz.
- **Mikrofon açılmıyor:** Güvenli bağlam (HTTPS / localhost), site izni, tarayıcı API desteği, iframe izin politikası ve varsayılan cihazı kontrol edin.
- **Web araştırması başlamıyor:** `SEARXNG_URL`, SearXNG JSON erişimi ve model bağlantısı birlikte gerekli.
- **Tercihler korunmuyor:** Gizli gezinme veya depolama kısıtları olabilir. UI depolama hatasını bildirir. Alan adı / port değişince ayrı tarayıcı depolaması kullanılır.
- **Proxy / başka origin hatası:** API istekleri aynı kaynaktan gelmeli. Reverse proxy `Host` bilgisini korumalı; CORS'u `*` yaparak korumayı kaldırmayın.

## Git güvenliği

`.env`, yerel ayarlar, bağımlılıklar, derleme, test ekran görüntüleri ve günlükler `.gitignore` kapsamındadır. Yalnızca sahte değerler içeren `.env.example` sürümlenir. Gerçek anahtarları issue, commit, ekran görüntüsü veya sohbete eklemeyin. Bir sır yanlışlıkla paylaşıldıysa silmekle yetinmeyin; sağlayıcıdan iptal edip yenileyin.
