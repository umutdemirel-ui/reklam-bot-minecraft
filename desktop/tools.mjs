import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
export function inside(root, target) {
  const relative = path.relative(root, target);
  return (
    relative === '' ||
    (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))
  );
}
export async function findFiles(
  roots,
  query,
  { limit = 100, maxEntries = 10000, maxMs = 4000 } = {},
) {
  if (typeof query !== 'string' || query.trim().length < 2 || query.length > 200)
    throw new Error('Arama 2–200 karakter olmalı.');
  const results = [];
  let visited = 0,
    truncated = false;
  const started = Date.now();
  for (const allowed of roots) {
    const root = await fs.realpath(allowed.path);
    const stack = [root];
    while (stack.length) {
      if (visited >= maxEntries || Date.now() - started >= maxMs || results.length >= limit) {
        truncated = true;
        break;
      }
      const dir = stack.pop();
      let entries;
      try {
        const actual = await fs.realpath(dir);
        if (!inside(root, actual)) continue;
        entries = await fs.readdir(actual, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        visited++;
        if (entry.isSymbolicLink()) continue;
        const file = path.join(dir, entry.name);
        if (entry.name.toLocaleLowerCase('tr').includes(query.trim().toLocaleLowerCase('tr')))
          results.push({
            name: entry.name,
            path: file,
            kind: entry.isDirectory() ? 'folder' : 'file',
          });
        if (entry.isDirectory() && !entry.name.startsWith('.')) stack.push(file);
        if (visited >= maxEntries || results.length >= limit) {
          truncated = true;
          break;
        }
      }
    }
  }
  return { results, truncated, visited };
}
export class DesktopTools {
  constructor({
    read,
    write,
    chooseApp,
    chooseDirectory,
    confirm,
    reveal,
    openSettings,
    launch = spawn,
  }) {
    Object.assign(this, {
      read,
      write,
      chooseApp,
      chooseDirectory,
      confirm,
      reveal,
      openSettings,
      launch,
    });
    this.processes = new Map();
  }
  config() {
    return this.read('desktop-permissions', { applications: [], roots: [] });
  }
  audit(tool, status) {
    const old = this.read('desktop-audit', []);
    this.write(
      'desktop-audit',
      [{ id: crypto.randomUUID(), date: new Date().toISOString(), tool, status }, ...old].slice(
        0,
        500,
      ),
    );
  }
  describe() {
    const c = this.config();
    return {
      platform: process.platform,
      applications: c.applications.map(({ path, ...a }) => a),
      roots: c.roots.map(({ path, ...r }) => r),
      running: [...this.processes.keys()],
      audit: this.read('desktop-audit', []),
    };
  }
  async execute(action, input = {}) {
    try {
      const c = this.config();
      let result;
      if (action === 'grantApplication' || action === 'grantDirectory') {
        const chosen = await (action === 'grantApplication'
          ? this.chooseApp()
          : this.chooseDirectory());
        if (!chosen) {
          this.audit(action, 'cancelled');
          return { cancelled: true };
        }
        const target = await fs.realpath(chosen);
        const stat = await fs.stat(target);
        if (action === 'grantDirectory' && !stat.isDirectory())
          throw new Error('Klasör seçmelisiniz.');
        if (
          action === 'grantApplication' &&
          !(stat.isFile() || (process.platform === 'darwin' && target.endsWith('.app')))
        )
          throw new Error('Geçerli bir uygulama seçmelisiniz.');
        const collection = action === 'grantApplication' ? c.applications : c.roots;
        if (!collection.some((x) => x.path === target))
          collection.push({ id: crypto.randomUUID(), name: path.basename(target), path: target });
        this.write('desktop-permissions', c);
        result = this.describe();
      } else if (action === 'revoke') {
        c.applications = c.applications.filter((a) => a.id !== input.id);
        c.roots = c.roots.filter((r) => r.id !== input.id);
        this.write('desktop-permissions', c);
        result = this.describe();
      } else if (action === 'openSettings') {
        const sections = { sound: 'ses', network: 'ağ', display: 'ekran' };
        if (!sections[input.section] || !this.openSettings)
          throw new Error('Bu ayar bölümü desteklenmiyor.');
        if (
          !(await this.confirm(
            'Sistem ayarları açılsın mı?',
            `${sections[input.section]} paneli açılacak. Prometheus ayar değerini değiştirmez.`,
          ))
        ) {
          this.audit(action, 'cancelled');
          return { cancelled: true };
        }
        await this.openSettings(input.section);
        result = {
          ok: true,
          message: 'Ayar paneli açma isteği iletildi. Hiçbir ayar değeri değiştirilmedi.',
        };
      } else if (action === 'find') {
        result = await findFiles(c.roots, input.query);
      } else if (action === 'openApplication') {
        const app = c.applications.find((a) => a.id === input.id);
        if (!app) throw new Error('Uygulama izin listesinde yok.');
        if (
          !(await this.confirm(
            `${app.name} uygulaması açılsın mı?`,
            'Yalnızca seçtiğiniz uygulama, ek komut satırı parametresi olmadan açılacak.',
          ))
        ) {
          this.audit(action, 'cancelled');
          return { cancelled: true };
        }
        if (this.processes.has(app.id)) throw new Error('Bu oturumda uygulama zaten başlatıldı.');
        const child =
          process.platform === 'darwin'
            ? this.launch('/usr/bin/open', ['-a', app.path], { shell: false })
            : this.launch(app.path, [], { shell: false, stdio: 'ignore', windowsHide: false });
        await new Promise((resolve, reject) => {
          child.once('spawn', resolve);
          child.once('error', () =>
            reject(new Error('Uygulama açılamadı. Dosya türünü ve yürütme iznini kontrol edin.')),
          );
        });
        if (process.platform !== 'darwin') {
          this.processes.set(app.id, child);
          child.once('exit', () => this.processes.delete(app.id));
        }
        result = { ok: true, message: 'Uygulama başlatma isteği işletim sistemine iletildi.' };
      } else if (action === 'closeApplication') {
        const child = this.processes.get(input.id);
        if (!child)
          throw new Error('Yalnızca bu oturumda başlatılan ve hâlâ çalışan süreç kapatılabilir.');
        if (
          !(await this.confirm(
            'Uygulama kapatılsın mı?',
            'Kaydedilmemiş değişiklikler kaybolabilir. Bu işlem yalnızca Prometheus tarafından başlatılan sürece yöneliktir.',
          ))
        ) {
          this.audit(action, 'cancelled');
          return { cancelled: true };
        }
        if (!child.kill('SIGTERM')) throw new Error('Kapatma sinyali iletilemedi.');
        result = {
          ok: true,
          message: 'Kapatma sinyali gönderildi; kaydetme pencereleri uygulamaya bağlıdır.',
        };
      } else if (action === 'reveal') {
        if (typeof input.path !== 'string') throw new Error('Dosya yolu geçerli değil.');
        const target = await fs.realpath(input.path);
        let allowed = false;
        for (const root of c.roots)
          if (inside(await fs.realpath(root.path), target)) allowed = true;
        if (!allowed) throw new Error('Bu yol izin verilen klasörlerin dışında.');
        if (
          !(await this.confirm(
            'Konum dosya yöneticisinde gösterilsin mi?',
            'Dosya çalıştırılmaz veya değiştirilmez.',
          ))
        ) {
          this.audit(action, 'cancelled');
          return { cancelled: true };
        }
        await this.reveal(target);
        result = { ok: true };
      } else throw new Error('Bu yerel araca izin verilmiyor.');
      this.audit(action, 'done');
      return result;
    } catch (e) {
      this.audit(
        [
          'grantApplication',
          'grantDirectory',
          'revoke',
          'find',
          'openApplication',
          'closeApplication',
          'reveal',
          'openSettings',
        ].includes(action)
          ? action
          : 'denied',
        'error',
      );
      throw e;
    }
  }
}
