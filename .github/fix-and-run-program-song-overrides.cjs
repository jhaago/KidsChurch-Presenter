const fs = require('node:fs');

const path = '.github/apply-program-song-overrides.cjs';
let source = fs.readFileSync(path, 'utf8');
const broken = "    if (!window.confirm(`Use the Library setup for “${master.title}” in this Program? The Program-specific arrangement, audio and timing for this item will be removed.`)) return;";
const fixed = "    if (!window.confirm('Use the Library setup for “' + master.title + '” in this Program? The Program-specific arrangement, audio and timing for this item will be removed.')) return;";
if (!source.includes(broken)) throw new Error('Expected nested template string was not found.');
source = source.replace(broken, fixed);
fs.writeFileSync(path, source, 'utf8');
require('./apply-program-song-overrides.cjs');
