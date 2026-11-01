import { app, BrowserWindow, ipcMain, dialog, shell, session, safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DesktopTools } from './tools.mjs';
import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
let server, window, origin;
const base = path.dirname(fileURLToPath(import.meta.url));
if (!app.requestSingleInstanceLock()) app.quit();
else
  app
    .whenReady()
    .then(async () => {
      dotenv.config({
        path: app.isPackaged ? path.join(app.getPath('userData'), '.env') : path.resolve('.env'),
        quiet: true,
      });
      process.env.PROMETHEUS_DATA_DIR = app.getPath('userData');
      process.env.PROMETHEUS_PASSWORD ||= crypto.randomBytes(32).toString('base64url');
      if (
        safeStorage.isEncryptionAvailable() &&
        safeStorage.getSelectedStorageBackend?.() !== 'basic_text'
      ) {
        const file = path.join(app.getPath('userData'), 'master.enc');
        if (!fs.existsSync(file))
          fs.writeFileSync(
            file,
            safeStorage.encryptString(crypto.randomBytes(32).toString('base64')),
            { mode: 0o600 },
          );
        process.env.PROMETHEUS_VAULT_KEY = safeStorage.decryptString(fs.readFileSync(file));
      } else {
        await dialog.showMessageBox({
          type: 'warning',
          message: 'İşletim sisteminin güvenli kasası kullanılamıyor.',
          detail:
            'API anahtarını kaydetmeyin. Anahtarsız yerel Ollama kullanabilirsiniz; bu oturumda sağlayıcı sırlarını kalıcı kaydetme kapatıldı.',
        });
        process.env.PROMETHEUS_DISABLE_SECRET_SAVE = '1';
      }
      const [{ default: api }, { issueSession }, { readData, writeData }] = await Promise.all([
        import('../server/app.mjs'),
        import('../server/auth.mjs'),
        import('../server/storage.mjs'),
      ]);
      server = api.listen(0, '127.0.0.1');
      await new Promise((resolve) => server.once('listening', resolve));
      origin = `http://127.0.0.1:${server.address().port}`;
      await session.defaultSession.cookies.set({
        url: origin,
        name: 'prometheus_session',
        value: issueSession(),
        httpOnly: true,
        sameSite: 'strict',
      });
      window = new BrowserWindow({
        width: 1380,
        height: 920,
        minWidth: 360,
        minHeight: 650,
        backgroundColor: '#0c0c10',
        title: 'Prometheus',
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(base, 'preload.cjs'),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webSecurity: true,
        },
      });
      const trusted = (event) => {
        if (
          !event.senderFrame ||
          new URL(event.senderFrame.url).origin !== origin ||
          event.sender !== window.webContents
        )
          throw new Error('Güvenilmeyen istemci.');
      };
      const tools = new DesktopTools({
        read: readData,
        write: writeData,
        chooseApp: async () =>
          (
            await dialog.showOpenDialog(window, {
              title: 'İzin vereceğiniz uygulamayı seçin',
              properties: [process.platform === 'darwin' ? 'openDirectory' : 'openFile'],
              ...(process.platform === 'win32'
                ? { filters: [{ name: 'Uygulama', extensions: ['exe'] }] }
                : {}),
            })
          ).filePaths[0],
        chooseDirectory: async () =>
          (
            await dialog.showOpenDialog(window, {
              title: 'Aramaya izin vereceğiniz klasörü seçin',
              properties: ['openDirectory'],
            })
          ).filePaths[0],
        confirm: async (message, detail) =>
          (
            await dialog.showMessageBox(window, {
              type: 'warning',
              message,
              detail,
              buttons: ['Vazgeç', 'Onayla'],
              defaultId: 0,
              cancelId: 0,
            })
          ).response === 1,
        reveal: (file) => shell.showItemInFolder(file),
        openSettings: async (section) => {
          if (process.platform === 'win32')
            return shell.openExternal(
              {
                sound: 'ms-settings:sound',
                network: 'ms-settings:network',
                display: 'ms-settings:display',
              }[section],
            );
          if (process.platform === 'darwin')
            return shell.openExternal(
              {
                sound: 'x-apple.systempreferences:com.apple.Sound-Settings.extension',
                network: 'x-apple.systempreferences:com.apple.Network-Settings.extension',
                display: 'x-apple.systempreferences:com.apple.Displays-Settings.extension',
              }[section],
            );
          if (!fs.existsSync('/usr/bin/gnome-control-center'))
            throw new Error('Bu Linux masaüstünde GNOME ayar paneli bulunamadı.');
          const child = spawn('/usr/bin/gnome-control-center', [section], {
            shell: false,
            stdio: 'ignore',
          });
          await new Promise((resolve, reject) => {
            child.once('spawn', resolve);
            child.once('error', () => reject(new Error('Ayar paneli açılamadı.')));
          });
        },
      });
      ipcMain.handle('prometheus:capabilities', (event) => {
        trusted(event);
        return tools.describe();
      });
      ipcMain.handle('prometheus:execute', async (event, action, input) => {
        trusted(event);
        if (
          typeof action !== 'string' ||
          !input ||
          typeof input !== 'object' ||
          JSON.stringify(input).length > 4096
        )
          throw new Error('Geçersiz araç isteği.');
        return tools.execute(action, input);
      });
      session.defaultSession.setPermissionRequestHandler(
        (contents, permission, callback, details) => {
          let safe = false;
          try {
            safe =
              contents === window.webContents &&
              permission === 'media' &&
              details.mediaTypes?.includes('audio') &&
              !details.mediaTypes.includes('video') &&
              new URL(details.requestingUrl).origin === origin;
          } catch {
            safe = false;
          }
          callback(Boolean(safe));
        },
      );
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:\/\//.test(url)) void shell.openExternal(url);
        return { action: 'deny' };
      });
      window.webContents.on('will-navigate', (event, url) => {
        if (new URL(url).origin !== origin) event.preventDefault();
      });
      window.webContents.on('will-redirect', (event, url) => {
        if (new URL(url).origin !== origin) event.preventDefault();
      });
      await window.loadURL(origin);
    })
    .catch(async () => {
      await dialog.showMessageBox({
        type: 'error',
        message: 'Prometheus başlatılamadı.',
        detail: 'Derlemeyi, yerel dosya izinlerini ve güvenli kasa erişimini kontrol edin.',
      });
      app.quit();
    });
app.on('second-instance', () => {
  window?.show();
  window?.focus();
});
app.on('window-all-closed', () => {
  server?.close();
  app.quit();
});
