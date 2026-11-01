import { ListTodo, Plus, ChevronRight, Trash2, LoaderCircle, FileText } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import { dateLabel } from '../lib/client';

import { researchSteps } from '../lib/navigation';

import type { Page, Research } from '../lib/types';

type Props = {
  research: Research | null;
  researches: Research[];
  navigate: (page: Page) => void;
  onSelect: (item: Research) => void;
  onClear: () => void;
};
export default function TasksPage({ research, researches, navigate, onSelect, onClear }: Props) {
  return (
    <>
      <div className="stats-strip">
        <div>
          <span>Devam eden</span>
          <strong>{['running', 'queued'].includes(research?.status || '') ? 1 : 0}</strong>
        </div>
        <div>
          <span>Tamamlanan araştırma</span>
          <strong>{researches.filter((r) => r.status === 'done').length}</strong>
        </div>
        <div>
          <span>Yerel sistem görevi</span>
          <strong>{window.prometheusDesktop ? 'İzinli araçlar' : 'Masaüstü gerekli'}</strong>
        </div>
      </div>
      {research && ['running', 'queued'].includes(research.status) && (
        <button className="task-row panel" onClick={() => navigate('research')}>
          <span className="tool-icon">
            <LoaderCircle className="spin" size={20} />
          </span>
          <div>
            <strong>{research.topic}</strong>
            <small>{researchSteps[research.step]}</small>
          </div>
          <span className="small-tag">Devam ediyor</span>
          <ChevronRight size={17} />
        </button>
      )}
      {researches.length ? (
        <section className="panel">
          <div className="section-heading">
            <h2>Araştırma geçmişi</h2>
            <button className="text-button" onClick={onClear}>
              <Trash2 size={14} /> Temizle
            </button>
          </div>
          {researches.map((r) => (
            <button key={r.id} className="task-row" onClick={() => onSelect(r)}>
              <span className="tool-icon">
                <FileText size={20} />
              </span>
              <div>
                <strong>{r.topic}</strong>
                <small>{dateLabel(r.date)}</small>
              </div>
              <span className={`small-tag ${r.status === 'done' ? 'success' : ''}`}>
                {r.status === 'queued'
                  ? 'Sırada'
                  : r.status === 'running'
                    ? 'Devam ediyor'
                    : r.status === 'interrupted'
                      ? 'Kesildi'
                      : r.status === 'done'
                        ? 'Tamamlandı'
                        : r.status === 'cancelled'
                          ? 'Durduruldu'
                          : 'Hata'}
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
        </section>
      ) : (
        !['running', 'queued'].includes(research?.status || '') && (
          <section className="panel">
            <EmptyState
              icon={ListTodo}
              title="İlk adım sizden."
              description="Başlattığınız araştırmalar ve ilerlemeleri burada görünür. Kalıcı işler sunucuda saklanır; uygulama yenilenince listelenir."
            >
              <Button onClick={() => navigate('research')}>
                Araştırma başlat <Plus size={15} />
              </Button>
            </EmptyState>
          </section>
        )
      )}
    </>
  );
}
