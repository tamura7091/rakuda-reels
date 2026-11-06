// Where a run's time went, from the Rakuda project's own records: the export stages (events.jsonl) and every model
// call (trace/calls.jsonl: the step that asked, how long it took, errors). Printed to the log and the run's summary.
//
//   node tools/timing.mjs <project dir> [label]
import fs from 'node:fs';
import path from 'node:path';

const [proj, label = ''] = process.argv.slice(2);
const read = (f) => (fs.existsSync(path.join(proj, f)) ? fs.readFileSync(path.join(proj, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const min = (s) => `${(s / 60).toFixed(1)} min`;
const out = [`### Timing ${label}`];

const calls = read('trace/calls.jsonl');
if (calls.length) {
  const by = {};
  for (const c of calls) {
    const s = (by[c.step] ??= { n: 0, ms: 0, max: 0, err: 0, first: Infinity, last: 0 });
    s.n++; s.ms += c.ms; s.max = Math.max(s.max, c.ms); s.err += c.error ? 1 : 0;
    s.first = Math.min(s.first, c.t); s.last = Math.max(s.last, c.t + c.ms / 1000);
  }
  const wall = Math.max(...calls.map((c) => c.t + c.ms / 1000)) - Math.min(...calls.map((c) => c.t));
  out.push(`model calls: ${calls.length}, ${min(calls.reduce((a, c) => a + c.ms, 0) / 1000)} summed, over ${min(wall)} of wall time, ${calls.filter((c) => c.error).length} errors`);
  out.push('| step | calls | summed | wall | slowest | errors |', '|---|---|---|---|---|---|');
  for (const [k, s] of Object.entries(by).sort((a, b) => b[1].ms - a[1].ms).slice(0, 15))
    out.push(`| ${k} | ${s.n} | ${min(s.ms / 1000)} | ${min(s.last - s.first)} | ${(s.max / 1000).toFixed(0)} s | ${s.err} |`);
  const errs = calls.filter((c) => c.error).slice(-3).map((c) => `- ${c.step}: ${c.error.slice(0, 160)}`);
  if (errs.length) out.push('last errors:', ...errs);
}

const ev = read('events.jsonl');
const ex = ev.filter((e) => e.step === 'export');
for (let i = 0; i < ex.length; i++) {
  if (ex[i].status !== 'start') continue;
  const end = ex.slice(i).find((e) => e.status === 'done' || e.status === 'failed');
  const enc = ex.slice(i).find((e) => e.stage === 'encode');
  if (end) out.push(`export: ${min(end.t - ex[i].t)}${enc ? ` (frames ${min(enc.t - ex[i].t)}, encode ${min(end.t - enc.t)})` : ''}`);
}

const text = out.join('\n');
console.log(text);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n\n');
