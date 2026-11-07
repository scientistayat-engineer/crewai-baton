/* Animated particle network used as the page background (index and login). */
(() => {
  const c = document.getElementById("bg");
  if (!c) return;
  const x = c.getContext("2d");
  let w, h, P = [], m = { x: -999, y: -999 };
  const resize = () => {
    w = c.width = innerWidth; h = c.height = innerHeight;
    P = Array.from({ length: Math.min(90, (w * h) / 16000 | 0) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 }));
  };
  addEventListener("resize", resize);
  addEventListener("mousemove", e => { m.x = e.clientX; m.y = e.clientY; });
  resize();
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  (function frame() {
    x.clearRect(0, 0, w, h);
    P.forEach((p, i) => {
      p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + h) % h;
      x.fillStyle = "#00e5ffaa"; x.fillRect(p.x, p.y, 2, 2);
      for (let j = i + 1; j < P.length; j++) {
        const q = P[j], d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 120) { x.strokeStyle = `rgba(0,229,255,${.2 * (1 - d / 120)})`; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); x.stroke(); }
      }
      const dm = Math.hypot(p.x - m.x, p.y - m.y);
      if (dm < 160) { x.strokeStyle = `rgba(255,255,255,${.4 * (1 - dm / 160)})`; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(m.x, m.y); x.stroke(); }
    });
    requestAnimationFrame(frame);
  })();
})();
