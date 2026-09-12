const fs = require('node:fs');

const scriptPath = '.github/apply-program-song-overrides.cjs';
let source = fs.readFileSync(scriptPath, 'utf8');
const broken = "    if (!window.confirm(`Use the Library setup for “${master.title}” in this Program? The Program-specific arrangement, audio and timing for this item will be removed.`)) return;";
const fixed = "    if (!window.confirm('Use the Library setup for “' + master.title + '” in this Program? The Program-specific arrangement, audio and timing for this item will be removed.')) return;";
if (!source.includes(broken)) throw new Error('Expected nested template string was not found.');
source = source.replace(broken, fixed);
fs.writeFileSync(scriptPath, source, 'utf8');
require('./apply-program-song-overrides.cjs');

const operatorPath = 'src/components/OperatorApp.tsx';
let operator = fs.readFileSync(operatorPath, 'utf8');
const duplicate = "        : linkedSongBefore;\n\n    const linkedSong = linkedSongBefore;\n    const liveSlide";
if (!operator.includes(duplicate)) throw new Error('Expected duplicate linkedSong declaration was not found.');
operator = operator.replace(duplicate, "        : linkedSongBefore;\n\n    const liveSlide");
fs.writeFileSync(operatorPath, operator, 'utf8');
