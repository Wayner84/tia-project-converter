import { cp, mkdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('styles.css', 'dist/styles.css');
await build({ entryPoints: ['app.js'], bundle: true, format: 'esm', outfile: 'dist/app.js', platform: 'browser', sourcemap: false });
console.log('Built dist with bundled relative assets.');
