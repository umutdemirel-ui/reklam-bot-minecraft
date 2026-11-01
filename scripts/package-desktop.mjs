import { packager } from '@electron/packager';
const platform =
  process.argv.find((arg) => arg.startsWith('--platform='))?.split('=')[1] || process.platform;
if (!['darwin', 'win32', 'linux'].includes(platform)) throw new Error('Platform desteklenmiyor.');
await packager({
  dir: '.',
  out: 'release',
  name: 'Prometheus',
  executableName: 'prometheus',
  platform,
  arch: process.arch,
  overwrite: false,
  asar: true,
  prune: true,
  ignore: [
    /^\/(?:\.git|\.prometheus|\.github|\.env(?:\..*)?|tests|test-results|playwright-report|mobile|release|docs)(?:\/|$)/,
    /\.log$/,
    /\.tsbuildinfo$/,
  ],
});
console.log(
  'Paket release/ altında oluşturuldu. İmzalama, mağaza ve hedef cihaz doğrulaması ayrıca gereklidir.',
);
