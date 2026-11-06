// Small helpers for a reel's visual.js, all pure functions of time (the renderer jumps to any t).
//   K.p(t, a, b)        progress 0→1 between times a and b (clamped)
//   K.out(x) K.inOut(x) easings;  K.pop(x) 0→1 with a slight overshoot (for things appearing)
//   K.lerp(a, b, x)     mix two numbers
//   K.drawOn(path, x)   an SVG path/line drawn on from its start (x 0→1)
//   K.count(a, b, x)    a number counting up, rounded
//   K.at(tl, i, d = 0)  the start time of line i, plus d seconds
//   K.svg(stage)        a full-stage <svg> (1080×1000) to draw into with d3
window.K = {
  p: (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : Math.min(1, Math.max(0, (t - a) / (b - a)))),
  out: (x) => 1 - Math.pow(1 - x, 3),
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  pop: (x) => { if (x <= 0) return 0; if (x >= 1) return 1; const c = 1.70158 * 1.2; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  lerp: (a, b, x) => a + (b - a) * x,
  drawOn(el, x) { const n = el.getTotalLength(); el.style.strokeDasharray = `${n} ${n}`; el.style.strokeDashoffset = String(n * (1 - x)); },
  count: (a, b, x) => Math.round(a + (b - a) * x),
  at: (tl, i, d = 0) => tl.lines[Math.max(0, Math.min(tl.lines.length - 1, i))].start + d,
  svg: (stage) => d3.select(stage).append('svg').attr('width', 1080).attr('height', 1000).attr('viewBox', '0 0 1080 1000'),
};
