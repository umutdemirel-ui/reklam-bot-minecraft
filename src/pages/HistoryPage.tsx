import {
  Search,
  History,
  ArrowRight,
  ChevronRight,
  Download,
  Trash2,
  LockKeyhole,
  MessageSquare,
} from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import { exportFile, dateLabel } from '../lib/client';

import type { Page, Entry } from '../lib/types';

type Props = {
  history: Entry[];
  visibleHistory: Entry[];
  historyFilter: string;
  setHistoryFilter: (filter: string) => void;
  onClear: () => void;
  onSelect: (item: Entry) => void;
  navigate: (page: Page) => void;
};
export default function HistoryPage({
  history,
  visibleHistory,
  historyFilter,
  setHistoryFilter,
  onClear,
  onSelect,
  navigate,
}: Props) {
  return (
    <>
      <div className="history-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Geçmişte ara"
            placeholder="Konuşmalarda ve komutlarda ara…"
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value)}
          />
        </label>
        <Button
          secondary
          disabled={!history.length}
          onClick={() =>
            exportFile(
              'prometheus-gecmis.json',
              JSON.stringify(history, null, 2),
              'application/json',
            )
          }
        >
          <Download size={15} />
          <span>Dışa aktar</span>
        </Button>
        <button
          className="icon-button bordered"
          disabled={!history.length}
          onClick={onClear}
          aria-label="Tüm geçmişi sil"
        >
          <Trash2 size={17} />
        </button>
      </div>
      <div className="notice">
        <LockKeyhole size={16} /> Geçmiş yalnızca bu tarayıcıda saklanır. Son 100 komut tutulur;
        tarayıcı verilerini silmek geçmişi kaldırır.
      </div>
      <section className="panel history-panel">
        {visibleHistory.length ? (
          visibleHistory.map((h) => (
            <button className="history-row" key={h.id} onClick={() => onSelect(h)}>
              <span className={`history-icon ${h.status === 'error' ? 'error-icon' : ''}`}>
                <MessageSquare size={18} />
              </span>
              <div>
                <strong>{h.text}</strong>
                <p>{h.response}</p>
              </div>
              <time>{dateLabel(h.date)}</time>
              <ChevronRight size={16} />
            </button>
          ))
        ) : (
          <EmptyState
            icon={History}
            title={historyFilter ? 'Eşleşen bir konuşma yok.' : 'Güzel bir konuşma burada başlar.'}
            description={
              historyFilter
                ? 'Başka bir kelimeyle aramayı deneyin.'
                : 'Yazılı ve sesli komutlarınız burada saklanacak.'
            }
          >
            {!historyFilter && (
              <Button onClick={() => navigate('home')}>
                İlk komutunu ver <ArrowRight size={15} />
              </Button>
            )}
          </EmptyState>
        )}
      </section>
    </>
  );
}
