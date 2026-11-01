import crypto from 'node:crypto';
import { readData, writeData } from './storage.mjs';
import { runResearch } from './research.mjs';
export class JobQueue {
  constructor({ read = readData, write = writeData, run = runResearch } = {}) {
    this.write = write;
    this.run = run;
    this.controllers = new Map();
    this.jobs = read('jobs', [])
      .slice(0, 50)
      .map((job) =>
        ['queued', 'running'].includes(job.status)
          ? {
              ...job,
              status: 'interrupted',
              error: 'Servis yeniden başlatıldı. Devam etmek için tekrar başlatın.',
            }
          : job,
      );
    this.persist();
    this.pumping = false;
  }
  persist() {
    this.write('jobs', this.jobs);
  }
  list() {
    return this.jobs.map(({ model, ...job }) => ({
      ...job,
      sources: job.sources.map(({ text, ...source }) => source),
    }));
  }
  add(topic, model) {
    if (this.jobs.filter((j) => ['running', 'queued'].includes(j.status)).length >= 5)
      throw new Error('En fazla 5 araştırma sıraya alınabilir.');
    const job = {
      id: crypto.randomUUID(),
      topic,
      model,
      status: 'queued',
      step: 0,
      sources: [],
      report: '',
      date: new Date().toISOString(),
    };
    this.jobs = [job, ...this.jobs].slice(0, 50);
    this.persist();
    void this.pump().catch(() => {
      for (const j of this.jobs)
        if (j.status === 'running') {
          j.status = 'error';
          j.error = 'Görev dosyası yazılamadı; disk alanını ve izinleri kontrol edin.';
        }
    });
    return job;
  }
  cancel(id) {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || !['running', 'queued'].includes(job.status)) return false;
    job.status = 'cancelled';
    job.error = 'Kullanıcı tarafından durduruldu.';
    this.controllers.get(id)?.abort();
    this.persist();
    return true;
  }
  remove(id) {
    const job = this.jobs.find((j) => j.id === id);
    if (!job || ['running', 'queued'].includes(job.status)) return false;
    this.jobs = this.jobs.filter((j) => j.id !== id);
    this.persist();
    return true;
  }
  async pump() {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (true) {
        const job = [...this.jobs].reverse().find((j) => j.status === 'queued');
        if (!job) break;
        const controller = new AbortController();
        this.controllers.set(job.id, controller);
        job.status = 'running';
        this.persist();
        try {
          await this.run(job.topic, job.model, controller.signal, (event) => {
            if (!controller.signal.aborted) {
              Object.assign(job, event);
              this.persist();
            }
          });
          if (!controller.signal.aborted) job.status = 'done';
        } catch (e) {
          job.status = controller.signal.aborted ? 'cancelled' : 'error';
          job.error = controller.signal.aborted ? 'Kullanıcı tarafından durduruldu.' : e.message;
        } finally {
          this.controllers.delete(job.id);
          this.persist();
        }
      }
    } finally {
      this.pumping = false;
    }
  }
}
let queue;
export const getQueue = () => (queue ||= new JobQueue());
