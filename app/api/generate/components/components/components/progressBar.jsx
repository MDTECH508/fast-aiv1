"use client";

import { useEffect, useState } from "react";

export default function ProgressBar({ active = false }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf;
    let start = performance.now();
    if (active) {
      setPct(6);
      function step(now) {
        const elapsed = now - start;
        const next = Math.min(92, 6 + Math.log(1 + elapsed) * 12);
        setPct((p) => Math.max(p, next));
        raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    } else {
      setPct(100);
      const t = setTimeout(() => setPct(0), 600);
      return () => clearTimeout(t);
    }
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div className="progress-wrap">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
