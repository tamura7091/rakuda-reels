// Turns today's script (reels/<dir>/reel.json) into a Rakuda project the engine can edit, exactly as Rakuda's
// 「AIに全部おまかせ」 does (rakuda/web/lib/voice.ts speak + app/api/projects): the script read by ElevenLabs
// (eleven_v4, a Rakuda voice) as recording.mp3, the voice's own character timing as voice-timing.json, and
// project.json with the script, the voice, 台本のまま (asis) and 完成済みの音声 (polished), so the engine times the
// lines from the voice and never transcribes it.
//
//   node tools/project.mjs reels/<dir>     prints the project folder (rakuda/data/projects/<id>)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const VOICES = { // rakuda/web/lib/voices.ts, Japanese
  Konoha: 'T7yYq3WpB94yAuOXraRi', Harune: 'c2XJrw7TvNGtOc6r0ijG', Akari: 'EkK6wL8GaH8IgBZTTDGJ', Satomi: 'wcs09USXSN5Bl7FXohVZ',
  Hinata: 'j210dv0vWm7fCknyQpbA', Otani: '3JDquces8E8bkmvbh6Bc', Asahi: 'GKDaBI8TKSBJVhsCLD6n', Mitsuwo: 'zdWu2I1sJrZsmxJG5rie',
};
const CHANNEL = '6c5e10a070d9'; // the channel whose learnings the engine follows (rakuda/data/channels/<id>)

const reelDir = path.resolve(process.argv[2]);
const reel = JSON.parse(fs.readFileSync(path.join(reelDir, 'reel.json'), 'utf8'));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
const voice = VOICES[reel.voice ?? 'Konoha'];
if (!voice) throw new Error(`unknown voice ${reel.voice}; one of ${Object.keys(VOICES).join(', ')}`);
const script = reel.lines.map((l) => l.trim()).filter(Boolean).join('\n');

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
  method: 'POST',
  headers: { 'xi-api-key': key, 'content-type': 'application/json' },
  body: JSON.stringify({ text: script, model_id: 'eleven_v4', language_code: 'ja' }),
});
if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
const { audio_base64, alignment: al } = await res.json();
const round = (t) => Math.round(t * 1000) / 1000;
const timing = { text: script, chars: al.characters.map((c, k) => [c, round(al.character_start_times_seconds[k]), round(al.character_end_times_seconds[k])]) };

const id = crypto.randomUUID().slice(0, 12);
const dir = path.resolve('rakuda/data/projects', id);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'recording.mp3'), Buffer.from(audio_base64, 'base64'));
fs.writeFileSync(path.join(dir, 'voice-timing.json'), JSON.stringify(timing));
fs.writeFileSync(path.join(dir, 'project.json'), JSON.stringify({
  id, created: new Date().toISOString(), source: 'recording.mp3', lang: 'ja', channel: CHANNEL,
  script, asis: true, polished: true, voice, confirmed: true, instruction: reel.instruction ?? '',
}, null, 2));
const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, 'recording.mp3')]).toString());
fs.writeFileSync(path.join(reelDir, 'project'), id + '\n');
console.error(`voice ${seconds.toFixed(1)} s, ${reel.lines.length} lines → ${dir}`);
console.log(dir);
