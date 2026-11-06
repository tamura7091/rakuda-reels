// Reads a reel's script aloud with ElevenLabs (the same model and voices as Rakuda's AI voice) and times every
// caption character from the voice's own alignment, so captions light up exactly as each sound is said.
//
//   node tools/voice.mjs reels/<slug>
//     reads  reel.json   {title, voice?, lines: ["…。", …]}
//     writes voice.mp3, timeline.json {title, theme?, fps, lead, duration, lines:[{text, start, end, chars:[{c,start,end}]}]}
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const VOICES = { // lib/voices.ts in Rakuda: Japanese narration voices
  Konoha: 'T7yYq3WpB94yAuOXraRi', Harune: 'c2XJrw7TvNGtOc6r0ijG', Akari: 'EkK6wL8GaH8IgBZTTDGJ', Satomi: 'wcs09USXSN5Bl7FXohVZ',
  Hinata: 'j210dv0vWm7fCknyQpbA', Otani: '3JDquces8E8bkmvbh6Bc', Asahi: 'GKDaBI8TKSBJVhsCLD6n', Mitsuwo: 'zdWu2I1sJrZsmxJG5rie',
};
const LEAD = 0.4, TAIL = 1.2, FPS = 30;

const dir = process.argv[2];
const reel = JSON.parse(fs.readFileSync(path.join(dir, 'reel.json'), 'utf8'));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
const voice = VOICES[reel.voice ?? 'Konoha'];
if (!voice) throw new Error(`unknown voice ${reel.voice}; one of ${Object.keys(VOICES).join(', ')}`);

const text = reel.lines.join('');
const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
  method: 'POST',
  headers: { 'xi-api-key': key, 'content-type': 'application/json' },
  body: JSON.stringify({ text, model_id: 'eleven_v4', language_code: 'ja' }),
});
if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 400)}`);
const { audio_base64, alignment } = await res.json();
fs.writeFileSync(path.join(dir, 'voice.mp3'), Buffer.from(audio_base64, 'base64'));

const said = alignment.characters;
if (said.join('') !== text) throw new Error(`alignment does not match the script (${said.length} vs ${[...text].length} characters)`);
const starts = alignment.character_start_times_seconds, ends = alignment.character_end_times_seconds;
let k = 0;
const lines = reel.lines.map((line) => {
  const chars = [...line].map((c) => {
    // alignment characters are UTF-16 units joined back to the text; walk them by the same units
    let s = '', start = starts[k];
    while (s.length < c.length) { s += said[k]; k++; }
    return { c, start: +(start + LEAD).toFixed(3), end: +(ends[k - 1] + LEAD).toFixed(3) };
  });
  return { text: line, start: chars[0].start, end: chars.at(-1).end, chars };
});
const audio = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(dir, 'voice.mp3')]).toString());
const timeline = { title: reel.title, theme: reel.theme, fps: FPS, lead: LEAD, duration: +(LEAD + audio + TAIL).toFixed(3), lines };
fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify(timeline, null, 1));
console.log(`voice ${audio.toFixed(1)}s, video ${timeline.duration}s, ${lines.length} lines`);
