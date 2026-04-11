import { useEffect, useRef } from "react";

const BIRD_COUNT = 42;
const MAX_SPEED = 2.2;
const NEIGHBOR_RADIUS = 120;
const SEPARATION_RADIUS = 34;
const COLOR_PALETTE = ["#ff8fb8", "#ffb36b", "#7ed8ff", "#ffd970"];

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const createBird = (width, height) => ({
  x: randomBetween(width * 0.12, width * 0.88),
  y: randomBetween(height * 0.14, height * 0.86),
  vx: randomBetween(-1.6, 1.6) || 0.8,
  vy: randomBetween(-1.1, 1.1) || 0.4,
  size: randomBetween(5, 9),
  wingPhase: randomBetween(0, Math.PI * 2),
  color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
  alpha: randomBetween(0.7, 0.98)
});

const clampSpeed = (bird) => {
  const speed = Math.hypot(bird.vx, bird.vy);

  if (speed > MAX_SPEED) {
    bird.vx = (bird.vx / speed) * MAX_SPEED;
    bird.vy = (bird.vy / speed) * MAX_SPEED;
  }

  if (speed < 0.45) {
    bird.vx += randomBetween(-0.12, 0.12);
    bird.vy += randomBetween(-0.12, 0.12);
  }
};

const drawBird = (context, bird, time) => {
  const angle = Math.atan2(bird.vy, bird.vx);
  const wingFlap = Math.sin(time * 0.007 + bird.wingPhase) * bird.size * 0.45;

  context.save();
  context.translate(bird.x, bird.y);
  context.rotate(angle);
  context.fillStyle = bird.color;
  context.globalAlpha = bird.alpha;
  context.beginPath();
  context.moveTo(bird.size * 1.7, 0);
  context.lineTo(-bird.size * 0.8, bird.size * 0.68 + wingFlap);
  context.lineTo(-bird.size * 0.2, 0);
  context.lineTo(-bird.size * 0.8, -bird.size * 0.68 - wingFlap);
  context.closePath();
  context.fill();
  context.restore();
};

export default function AuthBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return undefined;
    }

    let animationFrameId = 0;
    let birds = [];
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      birds = Array.from({ length: BIRD_COUNT }, () => createBird(width, height));
    };

    const animate = (time) => {
      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#07192f");
      gradient.addColorStop(0.52, "#111126");
      gradient.addColorStop(1, "#190b12");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      birds.forEach((bird, index) => {
        let alignX = 0;
        let alignY = 0;
        let cohesionX = 0;
        let cohesionY = 0;
        let separationX = 0;
        let separationY = 0;
        let neighborCount = 0;

        birds.forEach((otherBird, otherIndex) => {
          if (index === otherIndex) {
            return;
          }

          const dx = otherBird.x - bird.x;
          const dy = otherBird.y - bird.y;
          const distance = Math.hypot(dx, dy);

          if (distance < NEIGHBOR_RADIUS) {
            alignX += otherBird.vx;
            alignY += otherBird.vy;
            cohesionX += otherBird.x;
            cohesionY += otherBird.y;
            neighborCount += 1;
          }

          if (distance < SEPARATION_RADIUS) {
            separationX -= dx / Math.max(distance, 1);
            separationY -= dy / Math.max(distance, 1);
          }
        });

        if (neighborCount > 0) {
          alignX /= neighborCount;
          alignY /= neighborCount;
          cohesionX = cohesionX / neighborCount - bird.x;
          cohesionY = cohesionY / neighborCount - bird.y;

          bird.vx += alignX * 0.004 + cohesionX * 0.00018 + separationX * 0.018;
          bird.vy += alignY * 0.004 + cohesionY * 0.00018 + separationY * 0.018;
        }

        bird.vx += Math.sin(time * 0.0007 + index) * 0.003;
        bird.vy += Math.cos(time * 0.0006 + index) * 0.003;

        clampSpeed(bird);

        bird.x += bird.vx;
        bird.y += bird.vy;

        if (bird.x < -24) bird.x = width + 24;
        if (bird.x > width + 24) bird.x = -24;
        if (bird.y < -24) bird.y = height + 24;
        if (bird.y > height + 24) bird.y = -24;

        drawBird(context, bird, time);
      });

      animationFrameId = window.requestAnimationFrame(animate);
    };

    resize();
    animationFrameId = window.requestAnimationFrame(animate);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(5,10,22,0.12),rgba(10,8,18,0.2)_64%,rgba(7,5,14,0.34))]" />
    </>
  );
}
