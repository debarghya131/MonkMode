import { useEffect, useRef } from "react";

const BIRD_COUNT = 16;
const MAX_SPEED = 1.6;
const NEIGHBOR_RADIUS = 90;
const SEPARATION_RADIUS = 28;
const COLORS = ["#ffb36b", "#ffd970", "#7ed8ff", "#ff8fb8"];

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const createBird = (width, height) => ({
  x: randomBetween(0, width),
  y: randomBetween(0, height),
  vx: randomBetween(-1.2, 1.2) || 0.6,
  vy: randomBetween(-0.8, 0.8) || 0.4,
  size: randomBetween(3.2, 5.2),
  phase: randomBetween(0, Math.PI * 2),
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
  alpha: randomBetween(0.65, 0.95),
});

const clampSpeed = (bird) => {
  const speed = Math.hypot(bird.vx, bird.vy);
  if (speed > MAX_SPEED) {
    bird.vx = (bird.vx / speed) * MAX_SPEED;
    bird.vy = (bird.vy / speed) * MAX_SPEED;
  }
};

const drawBird = (ctx, bird, time) => {
  const angle = Math.atan2(bird.vy, bird.vx);
  const flap = Math.sin(time * 0.01 + bird.phase) * bird.size * 0.35;

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(angle);
  ctx.fillStyle = bird.color;
  ctx.globalAlpha = bird.alpha;
  ctx.beginPath();
  ctx.moveTo(bird.size * 1.5, 0);
  ctx.lineTo(-bird.size * 0.7, bird.size * 0.6 + flap);
  ctx.lineTo(-bird.size * 0.2, 0);
  ctx.lineTo(-bird.size * 0.7, -bird.size * 0.6 - flap);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export default function NavbarBirdBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const parent = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    if (!parent || !ctx) return undefined;

    let width = 0;
    let height = 0;
    let animationFrameId = 0;
    let birds = [];

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      birds = Array.from({ length: BIRD_COUNT }, () => createBird(width, height));
    };

    const animate = (time) => {
      ctx.clearRect(0, 0, width, height);

      birds.forEach((bird, index) => {
        let alignX = 0;
        let alignY = 0;
        let cohesionX = 0;
        let cohesionY = 0;
        let separationX = 0;
        let separationY = 0;
        let neighbors = 0;

        birds.forEach((other, otherIndex) => {
          if (index === otherIndex) return;
          const dx = other.x - bird.x;
          const dy = other.y - bird.y;
          const dist = Math.hypot(dx, dy);

          if (dist < NEIGHBOR_RADIUS) {
            alignX += other.vx;
            alignY += other.vy;
            cohesionX += other.x;
            cohesionY += other.y;
            neighbors += 1;
          }

          if (dist < SEPARATION_RADIUS) {
            separationX -= dx / Math.max(dist, 1);
            separationY -= dy / Math.max(dist, 1);
          }
        });

        if (neighbors > 0) {
          alignX /= neighbors;
          alignY /= neighbors;
          cohesionX = cohesionX / neighbors - bird.x;
          cohesionY = cohesionY / neighbors - bird.y;
          bird.vx += alignX * 0.005 + cohesionX * 0.0004 + separationX * 0.016;
          bird.vy += alignY * 0.005 + cohesionY * 0.0004 + separationY * 0.016;
        }

        bird.vx += Math.sin(time * 0.0007 + index) * 0.0025;
        bird.vy += Math.cos(time * 0.0008 + index) * 0.0025;

        clampSpeed(bird);
        bird.x += bird.vx;
        bird.y += bird.vy;

        if (bird.x < -14) bird.x = width + 14;
        if (bird.x > width + 14) bird.x = -14;
        if (bird.y < -14) bird.y = height + 14;
        if (bird.y > height + 14) bird.y = -14;

        drawBird(ctx, bird, time);
      });

      animationFrameId = window.requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();
    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />;
}

