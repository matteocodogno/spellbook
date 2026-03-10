import { useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
  shape: "rect" | "circle";
}

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  const launch = useCallback((color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const palette = [color, "#ffffff", "#FFD166", "#A8DAFF", "#FF9F43", color];
    const count = 160;

    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.6,
        y: -10,
        vx: (Math.random() - 0.5) * 12,
        vy: Math.random() * 6 + 3,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 8,
        w: Math.random() * 10 + 5,
        h: Math.random() * 5 + 3,
        color: palette[Math.floor(Math.random() * palette.length)],
        opacity: 1,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      particlesRef.current = particlesRef.current.filter(p => p.opacity > 0.05);
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18;
        p.vx *= 0.99;
        p.rot += p.rotV;
        p.opacity -= 0.012;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        if (p.shape === "rect") ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (particlesRef.current.length > 0) rafRef.current = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  return { canvasRef, launch };
}
