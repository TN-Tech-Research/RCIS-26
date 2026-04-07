import { useEffect, useRef, useState } from 'react';
import { useMobile } from '../hooks/useMobile';
import particleIconUrl from '../assets/particle-icon.svg';

// ── Tuning constants ──────────────────────────────────────────────────────────
const PARTICLE_COUNT = 70;
const REPULSION_RADIUS = 120;   // px — how far the cursor pushes particles
const REPULSION_STRENGTH = 4.0; // force multiplier on repulsion
const RETURN_RATE = 0.02;       // spring rate: how fast particles return to base drift

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  opacity: number;
  size: number;
}

function initParticles(w: number, h: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const speed = 0.25 + Math.random() * 0.30;
    const angle = Math.random() * 2 * Math.PI;
    const baseVx = Math.cos(angle) * speed;
    const baseVy = Math.sin(angle) * speed;
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: baseVx,
      vy: baseVy,
      baseVx,
      baseVy,
      opacity: 0.08 + Math.random() * 0.10,
      size: 24 + Math.random() * 8,
    });
  }
  return particles;
}

export function ParticleBackground() {
  const isMobile = useMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load the sprite image once
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = particleIconUrl;
    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, []);

  // Track mouse position via window events (canvas has pointer-events: none)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      mousePosRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // Animation loop — starts once image is loaded
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    let cssWidth = 0;
    let cssHeight = 0;

    const resize = () => {
      cssWidth = window.innerWidth;
      cssHeight = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particlesRef.current = initParticles(cssWidth, cssHeight);
    };
    resize();

    let rafId: number;

    const tick = () => {
      const w = cssWidth;
      const h = cssHeight;
      const mouse = mousePosRef.current;
      const img = imgRef.current!;
      const particles = particlesRef.current;

      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        // Mouse repulsion
        if (mouse !== null) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPULSION_RADIUS && dist > 0) {
            const force = (REPULSION_RADIUS - dist) / REPULSION_RADIUS;
            p.vx += (dx / dist) * force * REPULSION_STRENGTH;
            p.vy += (dy / dist) * force * REPULSION_STRENGTH;
          }
        }

        // Spring back toward base drift velocity
        p.vx += (p.baseVx - p.vx) * RETURN_RATE;
        p.vy += (p.baseVy - p.vy) * RETURN_RATE;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap at edges
        const m = p.size;
        if (p.x < -m) p.x = w + m;
        else if (p.x > w + m) p.x = -m;
        if (p.y < -m) p.y = h + m;
        else if (p.y > h + m) p.y = -m;

        // Draw
        ctx.globalAlpha = p.opacity;
        ctx.drawImage(img, p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [imgLoaded]);

  if (isMobile) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
