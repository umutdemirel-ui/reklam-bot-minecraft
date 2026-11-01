# Prometheus 0.2 güvenlik sınırları

Bu proje bağımsız güvenlik denetiminden geçmemiştir. Tek sahipli kişisel/geliştirici kullanımı hedefler. Bütün cihazlar aynı veri alanına erişir; çok kullanıcılı servis olarak yayınlanmamalıdır.

## Oturum ve ağ

- `PROMETHEUS_PASSWORD` etkinse API, 12 saatlik rastgele token gerektirir. Sunucuda token'ın yalnız SHA-256 özeti bellekte tutulur. En fazla 20 oturum; yeniden başlatma hepsini kapatır.
- Web cookie: HttpOnly, SameSite=Strict; HTTPS origin girişinde Secure. Mobil istemci yalnız HTTPS kabul eder ve token'ı native Keychain/Keystore'da tutar.
- Sahip, cihaz oturumlarını görebilir ve iptal edebilir. Parola birden çok kişinin paylaşacağı hesap modeli değildir.
- Giriş kaynağı başına dakikada 5 deneme sınırı vardır. Reverse proxy arkasında istemciler aynı soket kaynağını paylaşabilir; bu dağıtık kimlik/rate-limit sistemi değildir.
- Yazma isteklerinde Origin varsa Host ile eşleşmelidir. Origin kontrolü tek başına kimlik doğrulama değildir. CORS `*` eklenmez.
- Parola kapalıyken geliştirme API'si açıktır; sahip yapılandırması ve eşitleme kapalıdır. Bu modu internete açmayın. Anahtarlı model bağlı bir API'nin erişim maliyeti olabilir.
- Web sunucusu önizleme için `0.0.0.0`, Electron'un gömülü servisi yalnız `127.0.0.1` dinler. Uzak kullanımda TLS, güvenlik duvarı ve güvenilir proxy zorunludur. Bu sürüm kendi TLS sertifika dağıtımını yapmaz.

## Sırlar ve dosyalar

Sağlayıcı ayarları AES-256-GCM ile `vault.json` içinde şifrelenir. Geri okuma API'si anahtarı dönmez. Sağlayıcı değişiminde eski anahtar başka sağlayıcıya taşınmaz. Ollama çağrılarına bulut Authorization başlığı eklenmez.

Web sunucusunda `vault.key` aynı kullanıcı veri dizininde 0600 izinle tutulur. Şifreli JSON'un tek başına ele geçmesine karşı koruma sağlar; key ile birlikte dosya erişimi olan kişiye veya aynı kullanıcıya karşı güçlü kasa değildir. Electron güvenli OS depolaması uygunsa master key `safeStorage` ile korunur; Linux `basic_text` güvenli sayılmaz. Güvenli kasa yoksa yeni sır kaydı kapatılır. Mobil API sağlayıcı anahtarı almaz.

`jobs.json` konular, planlar, kaynak tam metinleri ve raporları; `workspace.json` açıkça eşitlenen geçmişi saklar. **Bunlar şifreli değildir.** Dosya izinleri ve cihaz erişimi operatör sorumluluğundadır. Masaüstü izin dosyası seçilen yolları içerir. Tarayıcı/native geçmiş şifreli kişisel veri kasası değildir. Yedekleri de hassas sayın.

Dosya yazımı 0600 geçici dosya + atomik rename kullanır. Çok süreçli/dağıtık dosya yazma garantisi yoktur. Veri dizinini güvenilmeyen kullanıcıların yazabildiği bir konuma taşımayın. `.env`, veri dizini, model/ses dosyaları, bağımlılıklar ve derleme çıktıları Git'e girmez.

## Yerel cihaz araçları

- Web/mobil HTTP API'sinde OS yürütücüsü yoktur.
- Electron: sandbox, context isolation, kapalı Node integration ve aynı güvenilir pencere/frame origin'inden sabit IPC kanalları.
- İzin listesi native dosya seçicisinden oluşur. Uygulama açma ek argv/shell almaz. Kapatma yalnız bu oturumun sahip olduğu sürece yöneliktir; macOS kapatma aracı yoktur.
- Açma/kapatma/konum gösterme/ayar paneli işlemleri native onay ister. Kapatmanın kaydedilmemiş veri kaybı riski açıkça gösterilir.
- Dosya araması izinli gerçek köklerde, symlink takip etmeden, süre/giriş/sonuç sınırıyla salt okunur yapılır. Konum gösterme gerçek yolun hâlâ izinli kökte olduğunu yeniden denetler.
- Ayar aracı yalnız sabit ses/ağ/ekran paneli açar; değer değiştirmez. Modelden serbest komut çalıştırılmaz.
- Masaüstü audit kaydı araç türü/durum/tarih/kimlik içerir; komut metni, seçilen dosya yolu veya parola içermez. Kullanıcının izin verdiği uygulamanın kendi davranışını sandbox içine almaz.
- Native runtime, imzalama ve gerçek hedef işletim sistemi davranışı henüz doğrulanmadı; bu kaynak kodu, OS sandbox güvenlik denetimi değildir.

## Araştırma indiricisi ve model

- URL yalnız HTTP/HTTPS, kullanıcı bilgisi yok, port yalnız 80/443. Uzunluk sınırı vardır.
- IP literal ve bütün DNS yanıtları genel unicast olmalı; loopback, özel ağ, link-local, metadata, multicast ve IPv4-mapped IPv6 engellenir.
- Undici bağlantı lookup'u doğrulanmış IP'ye sabitlenir. Her yönlendirme tekrar çözülüp kontrol edilir; en fazla üç yönlendirme.
- DNS 8 sn, sayfa HTTP 15 sn, içerik 1 MB; yalnız HTML/metin. Script/style/form/nav parçaları çıkarılır; script çalıştırılmaz.
- Başarısız/engelli sayfa tam okunmuş sayılmaz; yalnız arama özeti olarak kalır.
- Model çıktısı düz metin/yapısal JSON'dur; HTML veya kod yürütülmez. Kaynak talimatları güvenilmeyen veri kabul edilir.
- Kaynak numarası ve tam metinde alıntı eşleşmesi denetlenir. Bu, kaynağın güvenilirliğini veya model iddiasının olgusal doğruluğunu doğrulamaz. Prompt, tek başına güvenlik sınırı değildir.
- SearXNG/model adreslerini yalnız sahip yapılandırır. Bunlar amaç gereği yerel ağda olabilir; okuyucu URL'leri için aynı ayrıcalık verilmez.

## Ses ve kaynak sınırları

Whisper/Piper yalnız operatörün yapılandırdığı binary/model yollarıyla, shell olmadan başlatılır. Kullanıcı metni stdin; kayıt yolu geçici dosyadır. Kayıt 10 MB, işlem 120 sn, TTS dosyası 16 MB ile sınırlıdır. Normal hata/iptalde geçici dosya temizlenir; zorla process/OS kapanmasında geçici dosya artığı kalabilir.

Tarayıcı STT bulut hizmeti kullanabilir. Yerel STT seçimi kayıtları Prometheus sunucusunda işler; uzaktaki sunucu cihaz içi işleme değildir. Mikrofon yalnız kullanıcı başlatınca açılır; sürekli dinleme yoktur. Mobil arka plan kaydı iptal edilir.

Genel JSON 64 KB, eşitleme JSON 1 MB; konu 1000, komut 4000, model adı 100 karakter sınırında. Üç eşzamanlı POST; tek araştırma worker'ı, en fazla beş bekleyen/aktif iş ve 50 kayıt vardır. Bunlar herkese açık kötüye kullanım/DoS savunmasının tam karşılığı değildir.

## Günlükler ve ihlal

API logları yalnız güvenli rota kategorisi, yöntem, durum ve süre tutar. Gövde, anahtar, upstream hata gövdesi veya komut loglanmaz. Kullanıcıya gösterilen geçmiş ve araştırma dosyaları buna rağmen hassas veri içerir.

Sır sızarsa sağlayıcıdan iptal edin, yenisini oluşturun, cihaz oturumlarını kapatın ve yerel/yedek dosyaları inceleyin. Git geçmişi gibi geri alınması zor işlemler kullanıcı onayı olmadan yapılmamalıdır. Issue/sohbette gerçek anahtar, parola, özel kaynak veya kişisel komut paylaşmayın.

## Henüz olmayanlar

Çok kullanıcılı izolasyon, E2E şifreli otomatik eşitleme, denetlenmiş uzaktan masaüstü eşleştirme, genel uygulama otomasyonu, doğrudan sistem ayarı değişikliği, bağımsız olgu doğrulaması, signed binary zinciri ve kapsamlı güvenlik/erişilebilirlik/performance denetimi yoktur.
