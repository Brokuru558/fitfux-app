// Kopiert die FitFux-Webapp (app/index.html) nach www/ und hängt die native Brücke ein.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('www', { recursive: true });
let html = readFileSync('app/index.html', 'utf8');
html = html.replace('<head>', '<head>\n<script src="bridge.js"></script>');
writeFileSync('www/index.html', html);
console.log('www/index.html', (html.length / 1024 / 1024).toFixed(2), 'MB');
