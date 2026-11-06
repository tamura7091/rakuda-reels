# Make today's Rakuda reel

You are making one Japanese Instagram reel for **@rakuda.studio**, in this repo, with no human in the loop. Rakuda
(www.rakuda.studio) is an AI video editor: you drop a voice recording and it edits a captioned vertical explainer video
with animated visuals. Each reel is a short explainer on an interesting topic, and the reel itself is the demo: it ends by
saying it was made with Rakuda. A good reel makes a tired adult on the train stop scrolling, understand one mechanism
in under a minute, and think "I want videos like this."

Work in `reels/<today's date YYYY-MM-DD>-<slug>/` (slug: short English, kebab-case). The tools are already installed.
Do every step yourself; never stop to ask. If a step fails, fix the cause and run it again.

## 1. Pick the topic

- Read `history.json`: never repeat a topic or a close variant of one already posted (its first rows are reels made before this pipeline).
- One mechanism people use or see every day but never understood, or one surprising science fact with a clear "how":
  e.g. how noise cancelling works, how Google Maps finds a route, why ice floats, how a QR code survives a scratch,
  how image AI makes a picture from noise. Tech, everyday physics, the body, money systems, transport, the internet.
- Evergreen, not news. Nothing political, medical advice, or about a real private person.
- It must be explainable with **diagrams** you draw yourself (no photos, no logos, no screenshots).

## 2. Check the facts

Use WebSearch and WebFetch on **English primary sources** (papers, official docs, standards bodies, university pages,
manufacturer engineering pages). No video sites, no content farms, no pirated books. Every number and claim in the
script must come from a source you read. List them in `reel.json` `sources`.

## 3. Write the script → `reel.json`

```json
{
  "topic": "noise cancelling",
  "title": "ノイズキャンセリングの仕組み",
  "voice": "Konoha",
  "lines": ["…。", "…、", "…"],
  "sources": [{"url": "…", "claim": "…"}],
  "theme": {"accent": "#34D399"}
}
```

- `title`: plain and direct, 「〇〇の仕組み」 style. No metaphor, no clickbait. It sits on screen the whole video.
- **Line 1 builds curiosity**: promise the result, hold back the answer ("イヤホンは、音を消すために、わざと音を足しています。"
  style surprise, or a question the video answers). Never give away the key trick in line 1.
- Then straight into the steps: what happens, in order. Plain, precise words a tired adult follows with no school maths;
  ideas, not derivations. One familiar example per step. Never refer back to "earlier" in a way that needs rewatching.
- Natural spoken Japanese, です/ます, the way a calm explainer talks. Numbers as they are read naturally.
- Each line is one caption: **at most 28 characters**, ending in 、 or 。 so the voice pauses naturally. 12-18 lines.
  Total spoken length about 35-55 seconds (≈ 7 characters a second).
- The script ends with exactly these words, as four caption lines:
  「この動画は、」「AI動画編集ツール「Rakuda」で作りました。」「このような動画を作りたい方は、」「プロフィールのリンクをチェックしてください。」
  From 「この動画は、」 on, the template hands the stage over to the Rakuda end card by itself: your visual can stop there.
- No em dashes (—) anywhere.
- `voice`: one of Konoha (explainer, default), Harune (narrator), Satomi (calm), Asahi (natural, male), Otani (low storyteller, male).

Then run `node tools/voice.mjs reels/<dir>`. It writes `voice.mp3` and `timeline.json` (every line's start/end and every
character's time). Read `timeline.json` to know when each line is said.

## 4. Draw the visuals → `visual.js`

One file that animates a diagram in the stage (1080 × 1000 px, the middle of the frame) in step with the voice. Look at
`examples/visual.js` for the contract and the style. The bar is the Rakuda reels: a dark navy background (already drawn
by the template), clean node-and-edge or schematic diagrams drawn straight on the background, thin slate lines, off-white
text, **one accent colour only for what matters** (the winning route, the key number), red only for failure.

- Contract: `REEL.visual = (stage, tl) => render` where `render(t)` draws the frame at time `t` seconds. Draw **from `t`
  alone**: no CSS animations or transitions, no timers, no requestAnimationFrame, no randomness without a fixed seed. The
  renderer jumps to any `t` in any order.
- Use `tl.lines[i].start / end` to time each step to the line that says it. Every line gets something that moves or
  changes on screen while it is said; a still diagram for 5 seconds loses the viewer.
- SVG (via d3, which is loaded) or canvas. Ease things in (pop with slight overshoot, lines that draw on, numbers that
  count up), dim old things rather than delete them, keep the camera calm.
- No cards, boxes, panels, frames, side stripes or drop shadows around the diagram. Labels ≥ 30 px. Keep everything
  inside x 60-1020 of the stage, centred on x = 540. The title pill above and the caption below are drawn for you.
- Japanese text in the diagram: short labels only (the caption carries the sentences).

## 5. Check it, fix it

Run `node tools/render.mjs reels/<dir> --preview`, then **look at `preview.jpg`** (and the full-size stills in `preview/`
for anything unclear). Fix overlaps, text running off the stage, empty stages, labels too small, anything that does not
show what its line says, anything ugly. Repeat until a viewer would understand each line from the picture alone. At
least two rounds. Then render the video: `node tools/render.mjs reels/<dir>`.

## 6. Caption → `caption.txt`

The Instagram caption, in Japanese: line 1 restates the hook as a question or surprise; 2-3 short lines of what the
video shows; one line 「この動画はAI動画編集ツール「Rakuda」で作りました。プロフィールのリンクから試せます。」; then 5-8
relevant hashtags (#雑学 #仕組み #Rakuda plus topic tags). No em dashes.

## 7. Done

Write `reels/<dir>/READY` containing the directory name. Do not post, commit or push: the workflow does that after you.
If you could not make a reel you are proud of, do not write READY; say why in your last message.
