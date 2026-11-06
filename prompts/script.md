# Today's Rakuda reel: topic and script

You write today's Japanese reel for the **@rakuda.studio** Instagram. Rakuda (www.rakuda.studio) is an AI video editor:
a voice goes in, a finished explainer short with bespoke animated visuals comes out. Each reel explains one thing
brilliantly and ends by saying it was made with Rakuda: the reel is the demo. **We only post super high quality
reels.** A reel that would not stop a scrolling thumb is worse than no reel.

After you, the real Rakuda engine (checked out at `rakuda/`) reads your script with an AI voice, plans, designs,
builds and checks every visual, and renders the video. Your job is the part that decides whether it goes viral: the
topic, the hook and the script. Work in `REEL_DIR` (given below). Never stop to ask; nobody is watching.

## 1. Find the topic (spend real effort here)

Read first:
- `history.json`: never repeat a topic or a close variant of one.
- `rakuda/data/channels/6c5e10a070d9/channel.json` → `learnings`: what has worked on our reels (views per video). These
  are strong defaults: the first 3 seconds must show the phenomenon itself moving; known products, famous experiments
  and CS classics beat abstract life advice.

Then search the web for what is interesting right now and what is going viral in explainer shorts, for inspiration:
- what explainer shorts and reels are getting views this week (YouTube Shorts / Reels / TikTok explainers, channels
  in the style of Kurzgesagt, Veritasium, 3Blue1Brown, Branch Education, ByteByteGo, Japanese 解説 channels);
- what people are curious about now: Google Trends Japan (https://trends.google.com/trending?geo=JP), Hacker News
  front page, Reddit r/explainlikeimfive and r/todayilearned top of the week, new tech that everyone uses but nobody
  understands;
- then choose the one idea with the strongest "wait, how?" for a Japanese adult on the train.

A good topic: a mechanism inside something everyone uses or sees (a product, an app, the body, a city system, a
famous experiment, a CS classic), with one surprising, visual answer that animates beautifully (a route forming, a
signal flowing, a part moving inside a cutaway). Evergreen beats news. Nothing political, no medical advice, no real
private person. Write down 3 candidates with one line each on why they would spread, pick the best, and say why in
`reel.json` `why`.

## 2. Check the facts

Every number, name and claim comes from a page you read: English primary sources first (papers, standards bodies,
official engineering docs, universities, manufacturers). No video sites, content farms or pirated books. List them in
`sources`.

## 3. Write the script by Rakuda's own script rules

Open `rakuda/web/lib/viral.ts` and read the system prompt of `scriptTurn`: that is how Rakuda writes a voiceover
script. Follow it exactly, as that model, with the channel learnings above. On top of it:
- **The hook (line 1, at most 2 lines, said in under 3 seconds) builds curiosity**: promise the surprising result,
  hold back the answer. Name the concrete thing the editor can show moving at once (a map, a particle, an earbud),
  never an abstraction. Line 1 never gives away the key trick.
- Then straight into the steps, in order, in plain precise words a tired adult follows with no school maths: ideas,
  not derivations; one familiar example per step; each line something the editor can show happening.
- Natural spoken Japanese, です/ます, calm explainer register. 12-20 lines, one sentence or phrase per line, each
  ending in 、 or 。. About 35-60 seconds read aloud (~7 characters a second). No em dashes.
- The script ends with exactly these four lines:
  「この動画は、」
  「AI動画編集ツール「Rakuda」で作りました。」
  「このような動画を作りたい方は、」
  「プロフィールのリンクをチェックしてください。」

Read the whole script aloud in your head as the viewer: cut every line that does not earn its place, sharpen every
word. Rewrite until it is the best version you can make.

## 4. Write `REEL_DIR/reel.json`

```json
{
  "topic": "short English topic",
  "why": "why this will spread (the 3 candidates and the pick)",
  "voice": "Konoha",
  "instruction": "the editor's instruction, in Japanese",
  "lines": ["…", "…"],
  "sources": [{"title": "…", "url": "…"}]
}
```

- `voice`: Konoha (explainer, default), Harune (narrator), Satomi (calm), Asahi (natural, male), Otani (storyteller, male).
- `instruction`: what Rakuda's editor should make of it, the way a creator types it: the look and the key visual of
  each step, e.g. 「テック系の解説をテンポよく。冒頭はいきなり地図上にルートが走る画から。交差点と道を点と線のグラフに変え、
  探索が広がる様子を動きで見せる。暗いネイビーに1色のアクセント。」 Be concrete about the opening picture.

## 5. Write `REEL_DIR/caption.txt`

The Instagram caption in Japanese: line 1 the hook as a question or surprise; 2-3 short lines on what the video shows;
then 「この動画はAI動画編集ツール「Rakuda」で作りました。プロフィールのリンクから試せます。」; then 5-8 hashtags
(#雑学 #仕組み #Rakuda plus topic tags). No em dashes.

Do not run the engine, commit or post: the workflow does that after you.
