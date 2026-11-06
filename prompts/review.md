# Review today's Rakuda reel before it is posted

The reel in `REEL_DIR` was just made by the Rakuda engine: `REEL_DIR/reel.mp4` (the export), `reel.json` and
`caption.txt` (the script and caption), and the engine's project in `PROJECT_DIR` (`structure.json`: the sections and
their visuals; `timeline.json`: when each caption and section plays). **Only super high quality reels are posted.**
You are the last check, as a demanding creative director. Nobody else will look before it goes public.

1. Look at it properly: extract frames with ffmpeg (0.5, 1.5 and 2.5 s, then one every 2 s to the end, plus any
   moment that looks off) and Read them. Also listen-check the timing by comparing `timeline.json` caption times with
   what each frame shows.
2. Judge it by Rakuda's own bars: the `QUALITY` text in `rakuda/engine/pipeline.py` (what good looks like) and the
   pre-post review in `rakuda/web/lib/viral.ts` `review` (the first 3 seconds decide whether viewers stay: what is
   said and what the picture shows then). Also fail anything broken: text cut off or overlapping, an empty or frozen
   stage, a visual that shows something other than its line, captions out of sync, a wrong fact, ugly composition,
   the Rakuda ending missing (the last lines and the caption must ask viewers to comment 「Rakuda」, spelled exactly so).
3. Write `REEL_DIR/review.json`:

```json
{
  "pass": false,
  "summary": "one or two sentences: the verdict and the one thing that matters most",
  "revise": [{"section": 3, "request": "concrete change, in Japanese, the way a creator asks Rakuda's chat"}]
}
```

- `pass: true` only if you would proudly put it on the brand's account today.
- `revise`: at most 3 sections (indexes in `structure.json` `sections`) whose visual should be redone, each with one
  concrete request (what to show, what to remove, how it should move). Leave it empty when the problem cannot be fixed
  by redoing a visual (then the reel is not posted today).
- You may also improve `caption.txt`.

Do not run the engine, commit or post.
