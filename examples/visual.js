// Example visual for examples/reel.json (Googleマップの仕組み): a road graph, then the route search, in step with the
// voice. Everything is drawn from t alone. Copy the approach, not the topic.
REEL.visual = (stage, tl) => {
  const at = (i, d = 0) => K.at(tl, i, d);
  const svg = K.svg(stage);
  const C = { ink: '#EAF2FA', dim: '#4A6A8A', acc: '#34D399', bad: '#F87171' };

  // the map: intersections (points) and roads (lines with minutes)
  const N = [[170, 800], [170, 520], [400, 640], [400, 380], [620, 820], [640, 520], [660, 240], [880, 640], [900, 300]];
  const E = [[0, 1, 4], [0, 2, 3], [0, 4, 6], [1, 3, 5], [2, 3, 3], [2, 5, 2], [4, 5, 4], [4, 7, 7], [3, 6, 4], [5, 6, 5], [5, 7, 3], [6, 8, 2], [7, 8, 4]];
  const START = 0, GOAL = 8;

  // the search, worked out once: the order points are settled in and the best way into each
  const dist = N.map(() => Infinity), prev = N.map(() => -1), order = [];
  dist[START] = 0;
  const open = new Set(N.map((_, i) => i));
  while (open.size) {
    const u = [...open].reduce((a, b) => (dist[a] <= dist[b] ? a : b));
    open.delete(u); order.push(u);
    if (u === GOAL) break;
    for (const [a, b, w] of E) for (const [x, y] of [[a, b], [b, a]]) if (x === u && dist[u] + w < dist[y]) { dist[y] = dist[u] + w; prev[y] = u; }
  }
  const route = []; for (let v = GOAL; v >= 0; v = prev[v]) route.unshift(v);
  const onRoute = (a, b) => route.some((v, i) => i && ((route[i - 1] === a && v === b) || (route[i - 1] === b && v === a)));

  const roads = svg.append('g'), tags = svg.append('g'), best = svg.append('g'), dots = svg.append('g'), labels = svg.append('g');
  const road = E.map(([a, b]) => roads.append('line').attr('x1', N[a][0]).attr('y1', N[a][1]).attr('x2', N[b][0]).attr('y2', N[b][1])
    .attr('stroke', C.dim).attr('stroke-width', 6).attr('stroke-linecap', 'round'));
  const tag = E.map(([a, b, w]) => {
    const g = tags.append('g').attr('transform', `translate(${(N[a][0] + N[b][0]) / 2},${(N[a][1] + N[b][1]) / 2})`);
    g.append('rect').attr('x', -44).attr('y', -26).attr('width', 88).attr('height', 52).attr('rx', 12).attr('fill', '#0E2236').attr('stroke', C.dim).attr('stroke-width', 2);
    g.append('text').attr('text-anchor', 'middle').attr('dy', 12).attr('font-size', 32).attr('font-weight', 700).attr('fill', C.ink).text(`${w}分`);
    return g;
  });
  const path = best.append('path').attr('d', d3.line()(route.map((v) => N[v]))).attr('fill', 'none')
    .attr('stroke', C.acc).attr('stroke-width', 14).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
    .style('filter', 'drop-shadow(0 0 14px rgba(52,211,153,.7))');
  const dot = N.map(([x, y]) => dots.append('circle').attr('cx', x).attr('cy', y).attr('r', 22).attr('fill', '#0E2236').attr('stroke', C.ink).attr('stroke-width', 5));
  const label = (x, y, text, anchor = 'middle') => labels.append('text').attr('x', x).attr('y', y).attr('text-anchor', anchor)
    .attr('font-size', 38).attr('font-weight', 800).attr('fill', C.ink).text(text);
  const startL = label(N[START][0], N[START][1] + 76, '出発'), goalL = label(N[GOAL][0], N[GOAL][1] - 50, '到着');
  const pointL = label(540, 90, '交差点 = 点　道 = 線');

  return (t) => {
    // line 0: the answer appears at once (the hook), then steps back while the map is built
    const flash = K.p(t, at(0, 0.3), at(0, 1.4)) * (1 - K.p(t, at(1, 0), at(1, 0.6)));
    // lines 2-3: points pop in one by one, roads draw on
    N.forEach((_, i) => {
      const end = i === START || i === GOAL;
      const s = end ? K.pop(K.p(t, at(0, 0), at(0, 0.5))) : K.pop(K.p(t, at(2, 0.1 * i), at(2, 0.1 * i + 0.5)));
      const k = order.indexOf(i), settled = k >= 0 && t >= K.at(tl, 5, 0) + k * ((at(7) - at(5)) / order.length);
      dot[i].attr('transform', `translate(${N[i][0] * (1 - s)},${N[i][1] * (1 - s)}) scale(${s})`)
        .attr('fill', settled ? C.acc : '#0E2236').attr('stroke', settled ? C.acc : C.ink);
    });
    E.forEach(([a, b], j) => {
      const node = road[j].node();
      K.drawOn(node, K.out(K.p(t, at(2, 0.4 + 0.08 * j), at(2, 1.0 + 0.08 * j))));
      // line 7: roads off the best way are cut (red, then dim)
      const cut = !onRoute(a, b) ? K.p(t, at(7, 0.05 * j), at(7, 0.4 + 0.05 * j)) : 0;
      road[j].attr('stroke', cut > 0 && t < at(8) ? C.bad : C.dim).attr('opacity', 1 - 0.65 * cut);
      // line 4: minutes on every road
      const w = K.pop(K.p(t, at(4, 0.07 * j), at(4, 0.07 * j + 0.45)));
      const [x, y] = [(N[a][0] + N[b][0]) / 2, (N[a][1] + N[b][1]) / 2];
      tag[j].attr('transform', `translate(${x},${y}) scale(${w})`).attr('opacity', w ? 1 - 0.6 * cut : 0);
    });
    startL.attr('opacity', K.p(t, at(0, 0.2), at(0, 0.6)));
    goalL.attr('opacity', K.p(t, at(0, 0.2), at(0, 0.6)));
    pointL.attr('opacity', K.p(t, at(3), at(3, 0.4)) * (1 - K.p(t, at(4, 0.5), at(4, 1))));
    // lines 8-9: the shortest route draws on and glows; line 0's flash is the same route
    const final = K.inOut(K.p(t, at(8, 0.2), at(9, 0.6)));
    K.drawOn(path.node(), Math.max(final, flash));
    path.attr('opacity', Math.max(final, flash));
  };
};
