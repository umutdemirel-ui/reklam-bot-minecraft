import HistoryPage from './pages/HistoryPage';
import TasksPage from './pages/TasksPage';
import ResearchPage from './pages/ResearchPage';
import VoicePage from './pages/VoicePage';
import HomePage from './pages/HomePage';
import { navigation } from './lib/navigation';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import PersonalizePage from './pages/PersonalizePage';
import SettingsPage from './pages/SettingsPage';
import ToolsPage from './pages/ToolsPage';
import { Flame, Icon, Button } from './components/ui';
import { api, exportFile, dateLabel } from './lib/client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Home,
  Search,
  Palette,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  ChevronDown,
  X,
  Menu,
  AudioLines,
  Sparkles,
  Volume2,
  CircleHelp,
  Trash2,
  LoaderCircle,
  ExternalLink,
  Square,
  LockKeyhole,
  CheckCircle2,
  MessageSquare,
  CircleAlert,
  Copy,
} from 'lucide-react';

import { defaults, useStored } from './lib/storage';
import { routeCommand } from './lib/commands.mjs';
import { useSpeech, speak } from './lib/speech';
import type { Page, Preferences, Entry, Research, Health } from './lib/types';

export default function App() {
  const initialPage = location.hash.slice(1) as Page;
  const [page, setPage] = useState<Page>(
    navigation.some((n) => n.id === initialPage) ? initialPage : 'home',
  );
  const [savedPrefs, setPrefs, prefsFailed] = useStored<Preferences>(
    'prometheus.preferences.v1',
    defaults,
  );
  const prefs = { ...defaults, ...savedPrefs };
  const [history, setHistory, historyFailed] = useStored<Entry[]>('prometheus.history.v1', []);
  const [researches, setResearches, researchFailed] = useStored<Research[]>(
    'prometheus.research.v1',
    [],
  );
  const [sidebar, setSidebar] = useState(false);
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Entry | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [connection, setConnection] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [models, setModels] = useState<string[]>([]);
  const [popover, setPopover] = useState<'help' | 'profile' | null>(null);
  const [confirm, setConfirm] = useState<'history' | 'research' | 'preferences' | null>(null);
  const [historyFilter, setHistoryFilter] = useState('');
  const [topic, setTopic] = useState('');
  const [research, setResearch] = useState<Research | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  function notify(text: string, error = false) {
    setToast({ text, error });
  }
  function navigate(next: Page) {
    setPage(next);
    location.hash = next;
    setSidebar(false);
    setPopover(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function preference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs({ ...prefs, [key]: value });
  }
  useEffect(() => {
    function hashChange() {
      const id = location.hash.slice(1) as Page;
      if (navigation.some((n) => n.id === id)) setPage(id);
    }
    window.addEventListener('hashchange', hashChange);
    return () => window.removeEventListener('hashchange', hashChange);
  }, []);
  useEffect(() => {
    api('/api/health')
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.style.setProperty('--accent', prefs.accent);
    document.documentElement.style.fontSize = `${prefs.fontSize}px`;
  }, [prefs.theme, prefs.accent, prefs.fontSize]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('home');
        setTimeout(() => inputRef.current?.focus(), 60);
      }
      if (e.key === 'Escape') {
        setSidebar(false);
        setPopover(null);
        setConfirm(null);
        setSelectedEntry(null);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(
    () => () => {
      abortRef.current?.abort();
      chatAbortRef.current?.abort();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  useEffect(() => {
    if (!confirm && !selectedEntry) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role=dialog]');
    const close = dialog?.querySelector<HTMLButtonElement>('button');
    close?.focus();
    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, textarea, select, [tabindex="0"]',
        ),
      );
      const first = items[0],
        last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, [confirm, selectedEntry]);
  const speech = useSpeech(
    (text) => {
      setCommand(text);
      notify('Konuşmanız metne dönüştürüldü. Göndermeden önce kontrol edebilirsiniz.');
    },
    (text) => notify(text, true),
    prefs.language,
  );
  function appendEntry(entry: Entry) {
    setHistory((old) => [entry, ...old].slice(0, 100));
    setResult(entry);
    if (prefs.speak && !speak(entry.response, prefs.language, prefs.speechRate))
      notify('Bu tarayıcı sesli yanıtı desteklemiyor.', true);
  }
  async function submitCommand(text = command) {
    if (busyRef.current || !text.trim()) return;
    const route = routeCommand(text);
    if (route.type === 'invalid') {
      notify('Komut en fazla 4000 karakter olabilir.', true);
      return;
    }
    if ((route.type === 'search' || route.type === 'research') && !route.text.trim()) {
      notify('Lütfen araştırmak istediğiniz konuyu da yazın.', true);
      return;
    }
    setCommand('');
    setResult(null);
    speech.stop();
    if (route.type === 'history') {
      navigate('history');
      return;
    }
    if (route.type === 'settings') {
      navigate('settings');
      return;
    }
    if (route.type === 'research') {
      setTopic(route.text);
      navigate('research');
      return;
    }
    const entry: Entry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      response: '',
      date: new Date().toISOString(),
      type: route.type,
      status: 'done',
    };
    if (route.type === 'search') {
      entry.response =
        'Web aramanız hazır. Aşağıdaki bağlantıdan sonuçları yeni sekmede açabilirsiniz. Bu sonuçlar Prometheus tarafından henüz okunmadı veya doğrulanmadı.';
      appendEntry(entry);
      return;
    }
    if (route.type === 'device') {
      entry.status = 'unsupported';
      entry.response =
        'Bu web istemcisi bilgisayarınızdaki uygulamaları veya dosyaları kontrol edemez. Bu işlem için izin tabanlı yerel masaüstü bağdaştırıcısı gerekir; henüz uygulanmadı. Cihazınızda hiçbir işlem yapılmadı.';
      appendEntry(entry);
      return;
    }
    setBusy(true);
    busyRef.current = true;
    const controller = new AbortController();
    chatAbortRef.current = controller;
    try {
      const data = await api(
        '/api/chat',
        { text: text.trim(), model: prefs.model },
        controller.signal,
      );
      entry.response = data.text;
    } catch (e) {
      entry.status = 'error';
      entry.response = controller.signal.aborted
        ? 'İşlem sizin tarafınızdan durduruldu.'
        : e instanceof Error
          ? e.message
          : 'Yanıt alınamadı. Model bağlantısını kontrol edin.';
    } finally {
      setBusy(false);
      busyRef.current = false;
      chatAbortRef.current = null;
    }
    appendEntry(entry);
  }
  async function testConnection() {
    setConnection('checking');
    try {
      const d = await api('/api/test', {});
      setConnection('ok');
      setModels(d.models);
      notify('Model sağlayıcısına bağlantı kuruldu.');
    } catch (e) {
      setConnection('error');
      notify((e as Error).message, true);
    }
  }
  async function startResearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (research?.status === 'running' || abortRef.current) return;
    const subject = topic.trim();
    if (subject.length < 3 || subject.length > 1000) {
      notify('Araştırma konusu 3–1000 karakter olmalı.', true);
      return;
    }
    if (!health?.research) {
      notify(
        'Gerçek web araştırması için sunucuda SEARXNG_URL tanımlayın. Ayarlar bölümünde kurulum bilgileri var.',
        true,
      );
      return;
    }
    const current: Research = {
      id: crypto.randomUUID(),
      topic: subject,
      status: 'running',
      step: 0,
      sources: [],
      report: '',
      date: new Date().toISOString(),
    };
    setResearch({ ...current });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: subject, model: prefs.model }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Araştırma başlatılamadı.');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Akış bağlantısı kurulamadı.');
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let index;
        while ((index = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, index);
          buffer = buffer.slice(index + 1);
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.error) throw new Error(event.error);
          if (typeof event.step === 'number') current.step = event.step;
          if (event.sources) current.sources = event.sources;
          if (event.report) {
            current.report = event.report;
            current.status = 'done';
          }
          setResearch({ ...current });
        }
      }
      if (current.status !== 'done') throw new Error('Bağlantı rapor tamamlanmadan kapandı.');
    } catch (e) {
      current.status = controller.signal.aborted ? 'cancelled' : 'error';
      current.error = controller.signal.aborted
        ? 'Araştırma sizin tarafınızdan durduruldu.'
        : (e as Error).message;
      setResearch({ ...current });
    } finally {
      abortRef.current = null;
      setResearches((old) => [{ ...current }, ...old].slice(0, 20));
    }
  }
  function researchExport(item: Research) {
    exportFile(
      `prometheus-arastirma-${item.id.slice(0, 8)}.md`,
      `# ${item.topic}\n\n${item.report}\n\n## Kaynaklar\n${item.sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join('\n')}\n\nNot: Rapor arama özetlerine dayanır; tam kaynak sayfaları incelenmemiştir.\n${item.date}`,
    );
  }
  function prepareCommand(text: string) {
    navigate('home');
    setCommand(text);
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  const currentNav = navigation.find((n) => n.id === page)!;
  const visibleHistory = history.filter((h) =>
    `${h.text} ${h.response}`
      .toLocaleLowerCase('tr')
      .includes(historyFilter.toLocaleLowerCase('tr')),
  );
  const css = { '--accent': prefs.accent } as CSSProperties;

  const commandBox = (
    <div className="command-area">
      <form
        className={`command-box ${busy ? 'is-busy' : ''}`}
        onSubmit={(e) => {
          e.preventDefault();
          void submitCommand();
        }}
      >
        <span className="command-icon">
          <AudioLines size={20} />
        </span>
        <textarea
          aria-label="Komutunuzu yazın"
          ref={inputRef}
          value={command}
          maxLength={4000}
          rows={1}
          placeholder="Bir şey sorun veya bir görev verin…"
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submitCommand();
            }
          }}
        />
        {busy ? (
          <button
            type="button"
            className="send-button"
            onClick={() => chatAbortRef.current?.abort()}
            aria-label="Yanıtı durdur"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            className="send-button"
            type="submit"
            disabled={!command.trim()}
            aria-label="Komutu gönder"
          >
            <ArrowUp size={21} />
          </button>
        )}
      </form>
      <div className="command-footnote">
        <span>
          <LockKeyhole size={11} /> Kontrol her zaman sizde.
        </span>
        <span>
          <kbd>↵</kbd> gönder <span className="dot-sep">·</span> <kbd>shift + ↵</kbd> yeni satır
        </span>
      </div>
    </div>
  );
  const resultBox = (busy || result) && (
    <div className="response-panel" aria-live="polite">
      <div className="response-heading">
        <span className="response-avatar">
          <Flame />
        </span>
        <strong>Prometheus</strong>
        <span className="small-tag">
          {busy
            ? 'Düşünüyor'
            : result?.status === 'error'
              ? 'Bağlantı hatası'
              : result?.status === 'unsupported'
                ? 'Desteklenmiyor'
                : 'Yanıt'}
        </span>
        {!busy && (
          <button className="icon-button" onClick={() => setResult(null)} aria-label="Yanıtı kapat">
            <X size={16} />
          </button>
        )}
      </div>
      {busy ? (
        <p className="thinking">
          <LoaderCircle size={16} className="spin" /> Model yanıtı bekleniyor…
        </p>
      ) : (
        result && (
          <>
            <p className={result.status === 'error' ? 'error-text response-text' : 'response-text'}>
              {result.response}
            </p>
            {result.type === 'search' && (
              <a
                className="inline-link"
                href={`https://www.google.com/search?q=${encodeURIComponent(routeCommand(result.text).text)}`}
                target="_blank"
                rel="noreferrer"
              >
                Web sonuçlarını aç <ExternalLink size={14} />
              </a>
            )}
            {result.status === 'error' && (
              <button className="text-button" onClick={() => navigate('settings')}>
                Model bağlantısını yapılandır <ArrowRight size={14} />
              </button>
            )}
            <div className="response-actions">
              <button
                className="text-button"
                onClick={() => {
                  if (!speak(result.response, prefs.language, prefs.speechRate))
                    notify('Ses sentezi desteklenmiyor.', true);
                }}
              >
                <Volume2 size={14} /> Sesli oku
              </button>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result.response);
                    notify('Yanıt kopyalandı.');
                  } catch {
                    notify('Panoya erişilemedi.', true);
                  }
                }}
              >
                <Copy size={13} /> Kopyala
              </button>
            </div>
          </>
        )
      )}
    </div>
  );

  return (
    <div
      className={`app-shell ${prefs.compact ? 'compact' : ''} ${prefs.background === 'plain' ? 'plain-background' : ''}`}
      style={css}
    >
      {sidebar && (
        <button
          className="sidebar-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
        <button
          className="brand"
          onClick={() => navigate('home')}
          aria-label="Prometheus ana sayfa"
        >
          <Flame />
          <span>
            prometheus<span className="brand-period">.</span>
          </span>
        </button>
        <div className="workspace-select">
          <span className="workspace-icon">
            <Sparkles size={16} />
          </span>
          <span>
            Kişisel çalışma alanı<small>Size özel, sizin kontrolünüzde</small>
          </span>
          <LockKeyhole size={12} />
        </div>
        <nav aria-label="Ana gezinme">
          <p className="nav-label">ÇALIŞMA ALANI</p>
          {navigation.slice(0, 6).map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => navigate(n.id)}
              aria-current={page === n.id ? 'page' : undefined}
            >
              <Icon icon={n.icon} />
              <span>{n.label}</span>
              {n.badge && <small className="beta-tag">{n.badge}</small>}
              {n.id === 'tasks' && research?.status === 'running' && (
                <span className="nav-count">1</span>
              )}
            </button>
          ))}
          <p className="nav-label preferences-label">TERCİHLER</p>
          {navigation.slice(6).map((n) => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => navigate(n.id)}
              aria-current={page === n.id ? 'page' : undefined}
            >
              <Icon icon={n.icon} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-card">
            <span className="privacy-card-icon">
              <ShieldCheck size={19} />
            </span>
            <strong>
              Gücünüze güç katın.
              <br />
              Gizliliğinizden ödün vermeyin.
            </strong>
            <button onClick={() => navigate('privacy')}>
              Gizlilik yaklaşımımız <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="local-status">
            <span className="status-dot" />
            <span>
              Web istemcisi<small>v0.1.0 · Önizleme</small>
            </span>
            <button
              className="icon-button"
              aria-label="Uygulama bilgileri"
              onClick={() => navigate('about')}
            >
              <Chevrons />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebar(true)}
              aria-label="Menüyü aç"
            >
              <Menu size={21} />
            </button>
            <Home size={15} />
            <ChevronRight size={12} />
            <span>{currentNav.label}</span>
          </div>
          <div className="topbar-actions">
            <button
              className="command-shortcut"
              onClick={() => {
                navigate('home');
                setTimeout(() => inputRef.current?.focus(), 60);
              }}
            >
              <Search size={14} />
              <span>Hızlı komut</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className={`provider-pill ${connection === 'ok' ? 'connected' : ''}`}>
              <span className="status-dot" />
              {connection === 'ok'
                ? 'Model bağlı'
                : health?.provider === 'openai'
                  ? 'Bulut sağlayıcı'
                  : 'Yerel öncelikli'}
            </span>
            <div className="popover-parent">
              <button
                className="icon-button help-button"
                aria-label="Yardım ve kısayollar"
                onClick={() => setPopover(popover === 'help' ? null : 'help')}
              >
                <CircleHelp size={18} />
              </button>
              {popover === 'help' && (
                <div className="popover">
                  <strong>Küçük bir başlangıç rehberi</strong>
                  <p>
                    Bir komut yazın veya mikrofonu açın. Mikrofon kendiliğinden dinlemeye başlamaz.
                  </p>
                  <p>
                    <kbd>Ctrl / ⌘ + K</kbd> Komuta odaklan
                  </p>
                  <button className="text-button" onClick={() => navigate('about')}>
                    Prometheus hakkında <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="popover-parent">
              <button
                className="profile-button"
                onClick={() => setPopover(popover === 'profile' ? null : 'profile')}
                aria-label="Kişisel profil menüsü"
              >
                P
              </button>
              {popover === 'profile' && (
                <div className="popover">
                  <strong>Kişisel çalışma alanı</strong>
                  <p>
                    Hesap gerekmez. Tercihleriniz bu tarayıcıda saklanır. Cihazlar arası
                    senkronizasyon henüz yok.
                  </p>
                  <button className="text-button" onClick={() => navigate('personalize')}>
                    <Palette size={15} /> Alanınızı kişiselleştirin
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={`page-content page-${page}`}>
          {(prefsFailed || historyFailed || researchFailed) && (
            <div className="notice warning">
              <CircleAlert size={18} /> Tarayıcı depolaması kullanılamıyor. Değişiklikler yeniden
              başlatmada kaybolabilir.
            </div>
          )}
          {page === 'home' && (
            <HomePage
              prefs={prefs}
              speech={speech}
              busy={busy}
              commandBox={commandBox}
              resultBox={resultBox}
              navigate={navigate}
              preference={preference}
              onSuggestion={(text) => {
                setCommand(text);
                inputRef.current?.focus();
              }}
              prepareCommand={prepareCommand}
              notify={notify}
            />
          )}
          {page !== 'home' && (
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="tiny-line" /> PROMETHEUS ÇALIŞMA ALANI
                </div>
                <h1>{currentNav.label}</h1>
                <p>
                  {
                    (
                      {
                        voice: 'Düşüncelerinizi seslendirin. Gerisini birlikte ele alalım.',
                        research: 'Soruların derinine inin. Her adımda kaynakları görün.',
                        tools: 'Doğru iş için doğru araç. Yetenekler ve sınırlar, açıkça.',
                        tasks: 'Devam eden işlerinizi ve tamamlanan araştırmalarınızı takip edin.',
                        history: 'Her fikir bir iz bırakır. Kaldığınız yerden devam edin.',
                        settings: 'Asistanınızın bağlantılarını ve çalışma şeklini yönetin.',
                        personalize: 'Burası sizin alanınız. Kendinize göre şekillendirin.',
                        privacy: 'Ne paylaştığınızı bilin. Neye izin verdiğinizi seçin.',
                        about: 'Fikirleri harekete geçiren kişisel yapay zekâ asistanınız.',
                      } as Record<string, string>
                    )[page]
                  }
                </p>
              </div>
              <span className="page-icon">
                <currentNav.icon size={27} strokeWidth={1.3} />
              </span>
            </div>
          )}
          {page === 'voice' && (
            <VoicePage
              prefs={prefs}
              speech={speech}
              preference={preference}
              commandBox={commandBox}
              resultBox={resultBox}
              notify={notify}
            />
          )}
          {page === 'research' && (
            <ResearchPage
              topic={topic}
              setTopic={setTopic}
              health={health}
              research={research}
              startResearch={startResearch}
              navigate={navigate}
              onStop={() => abortRef.current?.abort()}
              researchExport={researchExport}
            />
          )}
          {page === 'tools' && (
            <ToolsPage
              health={health}
              speechSupported={speech.supported}
              navigate={navigate}
              prepareCommand={prepareCommand}
            />
          )}
          {page === 'tasks' && (
            <TasksPage
              research={research}
              researches={researches}
              navigate={navigate}
              onSelect={(item) => {
                if (research?.status === 'running') {
                  notify('Önce devam eden araştırmayı durdurun.', true);
                  return;
                }
                setResearch(item);
                setTopic(item.topic);
                navigate('research');
              }}
              onClear={() => setConfirm('research')}
            />
          )}
          {page === 'history' && (
            <HistoryPage
              history={history}
              visibleHistory={visibleHistory}
              historyFilter={historyFilter}
              setHistoryFilter={setHistoryFilter}
              onClear={() => setConfirm('history')}
              onSelect={setSelectedEntry}
              navigate={navigate}
            />
          )}
          {page === 'settings' && (
            <SettingsPage
              health={health}
              prefs={prefs}
              preference={preference}
              connection={connection}
              models={models}
              testConnection={testConnection}
            />
          )}
          {page === 'personalize' && (
            <PersonalizePage
              prefs={prefs}
              preference={preference}
              onReset={() => setConfirm('preferences')}
            />
          )}
          {page === 'privacy' && <PrivacyPage listening={speech.listening} navigate={navigate} />}
          {page === 'about' && <AboutPage />}
        </main>
      </div>
      {toast && (
        <div
          className={`toast ${toast.error ? 'toast-error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <CircleAlert size={19} /> : <CheckCircle2 size={19} />}
          <span>{toast.text}</span>
          <button
            className="icon-button"
            onClick={() => setToast(null)}
            aria-label="Bildirimi kapat"
          >
            <X size={15} />
          </button>
        </div>
      )}
      {(confirm || selectedEntry) && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setConfirm(null);
              setSelectedEntry(null);
            }
          }}
        >
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              autoFocus
              className="icon-button modal-close"
              onClick={() => {
                setConfirm(null);
                setSelectedEntry(null);
              }}
              aria-label="Pencereyi kapat"
            >
              <X size={20} />
            </button>
            {selectedEntry ? (
              <>
                <span className="accent-label">
                  <MessageSquare size={16} /> KONUŞMA DETAYI
                </span>
                <h2 id="modal-title">{selectedEntry.text}</h2>
                <span className="muted small">{dateLabel(selectedEntry.date)}</span>
                <p className="response-text">{selectedEntry.response}</p>
                <div className="modal-actions">
                  <Button
                    secondary
                    onClick={() => {
                      setHistory((old) => old.filter((h) => h.id !== selectedEntry.id));
                      if (result?.id === selectedEntry.id) setResult(null);
                      setSelectedEntry(null);
                      notify('Konuşma silindi.');
                    }}
                  >
                    <Trash2 size={15} /> Sil
                  </Button>
                  <Button
                    onClick={() => {
                      prepareCommand(selectedEntry.text);
                      setSelectedEntry(null);
                    }}
                  >
                    Tekrar kullan <ArrowUpRight size={15} />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="empty-icon">
                  <CircleAlert size={26} />
                </span>
                <h2 id="modal-title">
                  {confirm === 'preferences'
                    ? 'Tercihler sıfırlansın mı?'
                    : 'Geçmişi silmek istediğinize emin misiniz?'}
                </h2>
                <p>
                  {confirm === 'preferences'
                    ? 'Tema ve ses ayarları varsayılana dönecek. Konuşmalarınız korunur.'
                    : 'Bu işlem yalnızca bu tarayıcıdaki kayıtları kalıcı olarak siler. Geri alınamaz.'}
                </p>
                <div className="modal-actions">
                  <Button secondary onClick={() => setConfirm(null)}>
                    Vazgeç
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm === 'history') {
                        setHistory([]);
                        setResult(null);
                      } else if (confirm === 'research') {
                        setResearches([]);
                        if (research?.status !== 'running') setResearch(null);
                      } else setPrefs(defaults);
                      setConfirm(null);
                      notify('İşlem tamamlandı.');
                    }}
                  >
                    {confirm === 'preferences' ? 'Sıfırla' : 'Evet, geçmişi sil'}
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Chevrons() {
  return (
    <span className="double-chevron">
      <ChevronDown size={13} />
    </span>
  );
}
