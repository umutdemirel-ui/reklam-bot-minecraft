# Güvenlik ve veri sınırları

Bu sürüm güvenilir bir kullanıcının yerel / geliştirme ortamı içindir. Bağımsız güvenlik denetimi yapılmamıştır. Kullanıcı hesabı, güçlü API kimlik doğrulaması, cihaz eşleştirme ve çok kullanıcılı izolasyon henüz yoktur.

## Mevcut korumalar

- `.env` yalnızca Node servisinde okunur; hiçbir sır `VITE_` değişkeni veya tarayıcı bundle'ına eklenmez.
- `/api/health` anahtar, sağlayıcı adresi veya yerel dosya yolu döndürmez. “Yapılandırıldı” durumu canlı bağlantının çalıştığını kanıtlamaz.
- Sağlayıcı adresleri yalnızca sunucu operatörü tarafından belirlenir. İstemci keyfi model / arama URL'si gönderemez.
- JSON gövdesi 24 KB; komut 4000, araştırma konusu 1000, model adı 100 karakterle sınırlıdır.
- POST istekleri JSON gerektirir. Tarayıcı `Origin` göndermişse `Host` ile eşleşmelidir. Vite proxy Host bilgisini korur. CORS `*` yoktur.
- Eşzamanlı POST sayısı üçle sınırlıdır. Bu tam bir kullanıcı bazlı rate limiter değildir.
- Arama 20 saniye, model 120 saniye, bağlantı testi 8 saniye zaman aşımına sahiptir. İstemci kapanınca uzun model / arama isteğine iptal sinyali gider.
- Çıktılar React tarafından kaçışlanmış düz metin olarak işlenir. `dangerouslySetInnerHTML`, eval veya shell yürütme yoktur. Markdown indirmesi HTML çalıştırmaz.
- Kaynak bağlantıları yalnızca HTTP / HTTPS olur; yeni sekmeler `noreferrer` ile açılır.
- Mevcut olmayan / sıfır kaynak numarası içeren veya hiç numaralı kaynak vermeyen model raporu tamamlanmış sayılmaz. Bu yapısal kontrol, anlam doğrulaması değildir.
- API günlükleri yalnızca izinli rota adı, yöntem, HTTP durum ve süre içerir. İstek gövdesi, komut, API anahtarı veya sağlayıcının hata gövdesi loglanmaz.
- Silme / sıfırlama gibi yerel kayıt işlemleri onay diyaloğu ister. API hiçbir dosya / sistem silme yeteneği içermez.

## Origin kontrolünün sınırı

`Origin` kontrolü kimlik doğrulama değildir. Tarayıcı dışı istemciler bu başlığı atlayabilir veya taklit edebilir. Sunucular geliştirme önizlemesi için `0.0.0.0` üzerinde dinler. Paylaşılan ağda güvenlik duvarı kullanın. Herkese açık dağıtımdan önce TLS, gerçek kimlik doğrulama, hesap / kota bazlı hız sınırı, güvenilir proxy yapılandırması, CSP ve güvenlik incelemesi gerekir. Anahtarlı sağlayıcı bağlı bir örneği kimliksiz olarak internete açmayın.

## Hassas verilerin akışı

| Veri | Gidebileceği yer | Kalıcılık |
| --- | --- | --- |
| Ses | Tarayıcı STT motoru; sağlayıcı bulut hizmeti kullanabilir | Prometheus ses kaydı saklamaz; tarayıcı sağlayıcısının politikası ayrıdır |
| Gönderilen metin | Node API → yapılandırılan model sağlayıcısı | Son 100 komut ve yanıt bu tarayıcıda tutulur; sunucu kalıcı sohbet DB'si yok |
| Araştırma konusu | Node API → SearXNG, ardından model | Son 20 tamamlanan / hata / iptal kaydı bu tarayıcıda |
| Kaynak özetleri | SearXNG → Node → model ve tarayıcı | Araştırma kaydıyla tarayıcıda |
| API anahtarı | Node ortamı → ilgili model sağlayıcısı Authorization başlığı | Operatörün `.env` dosyası / ortamı; tarayıcıya dönmez |
| Tercihler | Bu tarayıcı | `localStorage`; site verilerini silmek kaldırır |

Tarayıcı geçmişi şifrelenmez; aynı cihaz / tarayıcı profilini kullanan veya eklenti yetkisi olan kişilerce erişilebilir. Dışa aktarılan JSON / Markdown dosyaları hassas metin içerebilir. Sorumlu biçimde saklayın. Uzak sağlayıcıların veri işleme / saklama koşullarını ayrıca inceleyin.

## Henüz uygulanmayan güvenlik katmanları

- Masaüstü araç izinleri, risk sınıflandırma ve kullanıcı onay token'ları.
- Güvenli cihaz eşleştirme, OS credential vault / Keychain / Keystore.
- Şifreli, denetlenmiş senkronizasyon.
- Çok kullanıcılı kimlik doğrulama, ayrılmış veri depoları ve kota yönetimi.
- Tam sayfa indirmeye yönelik SSRF / DNS / yönlendirme savunması (henüz tam sayfa indirici yok).
- Modelin kaynakla anlamsal uyuşmasını doğrulayan alıntı / pasaj denetimi.

Model prompt'u bir güvenlik sınırı değildir. Mevcut sürümde model hiçbir işletim sistemi aracına sahip olmadığı için zararlı yanıtları cihazda çalıştırılamaz. Yeni araç eklenirken güvenlik model dışında, belirlenimci izin kodunda uygulanmalıdır.

## Bir sır sızarsa

1. Anahtarı sağlayıcıdan hemen iptal edin ve yenisini oluşturun.
2. `.env`, commit, issue ve paylaşılan günlükleri inceleyin. Tek başına dosyayı silmek yeterli değildir.
3. Git geçmişi temizliği gibi geri alınması zor işlemleri kullanıcı izni olmadan yapmayın.
4. Geri bildirimlerde gerçek anahtar / parola veya kişisel komut metni paylaşmayın.
