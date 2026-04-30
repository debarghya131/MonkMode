import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform
} from "framer-motion";
import monkIllustration from "../../assets/monk.png";

const createSeededRandom = (seedValue) => {
  let seed = seedValue;

  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

const random = createSeededRandom(1142026);

const sparkles = Array.from({ length: 50 }, (_, index) => ({
  id: index,
  left: `${Math.round(random() * 100)}vw`,
  top: `${Math.round(random() * 100)}vh`,
  duration: 2 + random() * 3,
  delay: random() * 2.2,
  size: 4 + random() * 4,
  opacity: 0.35 + random() * 0.55
}));

export default function Hero() {
  const navigate = useNavigate();
  const MotionDiv = motion.div;
  const MotionImg = motion.img;
  const MotionButton = motion.button;
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const monkX = useSpring(parallaxX, { stiffness: 80, damping: 18, mass: 0.8 });
  const monkY = useSpring(parallaxY, { stiffness: 80, damping: 18, mass: 0.8 });
  const shadowX = useTransform(monkX, (value) => value * 0.45);
  const shadowScale = useTransform(monkY, [-18, 0, 18], [0.86, 1, 0.92]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 20;
      const y = (event.clientY / window.innerHeight - 0.5) * 18;

      parallaxX.set(x);
      parallaxY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [parallaxX, parallaxY]);

  return (
    <main className="relative mx-auto flex min-h-[calc(100vh-90px)] w-full max-w-7xl flex-col items-center justify-center px-4 pb-12 pt-2 sm:min-h-[calc(100vh-110px)] sm:px-6 sm:pb-16 sm:pt-4 md:px-8">
      {sparkles.map((sparkle) => (
        <MotionDiv
          key={sparkle.id}
          className="pointer-events-none absolute rounded-full bg-[#ffd54f]"
          animate={{
            scale: [0.5, 1.5, 0.5],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            left: sparkle.left,
            top: sparkle.top,
            width: sparkle.size,
            height: sparkle.size,
            opacity: sparkle.opacity
          }}
        />
      ))}

      <div className="relative flex h-[42vh] min-h-[240px] w-full items-center justify-center sm:h-[47vh] sm:min-h-[300px]">
        <MotionDiv
          className="absolute left-1/2 top-[72%] h-6 w-36 -translate-x-1/2 rounded-full bg-black/40 blur-xl sm:w-44"
          animate={{
            opacity: [0.4, 0.2, 0.4]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            x: shadowX,
            scaleX: shadowScale,
            scaleY: shadowScale
          }}
        />

        <MotionDiv
          className="relative z-10 -translate-x-3 sm:translate-x-0"
          style={{
            x: monkX,
            y: monkY
          }}
        >
          <MotionDiv
            animate={{
              y: [0, -12, -20, -12, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <MotionImg
              src={monkIllustration}
              alt="Floating monk"
              className="w-[220px] sm:w-[270px] md:w-[510px]"
              animate={{
                scale: [1, 1.06, 1]
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </MotionDiv>
        </MotionDiv>
      </div>

      <MotionButton
        type="button"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
          y: -6,
          scale: 1.04,
          boxShadow:
            "0 0 0 1px rgba(255,236,178,0.34), 0 0 44px rgba(251,191,36,0.56), 0 26px 54px rgba(120,52,8,0.46)"
        }}
        whileTap={{ scale: 0.98, y: -2 }}
        transition={{ duration: 0.55, delay: 0.15 }}
        onClick={() => navigate("/signup")}
        className="group relative overflow-hidden rounded-full border border-amber-200/45 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] px-6 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-stone-950 shadow-[0_0_0_1px_rgba(255,236,178,0.24),0_0_30px_rgba(251,191,36,0.34),0_18px_42px_rgba(120,52,8,0.34)] transition duration-300 hover:border-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 sm:px-8 sm:py-3 sm:text-sm"
      >
        <span className="pointer-events-none absolute inset-y-0 left-[-35%] w-[32%] -skew-x-12 bg-white/35 opacity-0 blur-md transition duration-500 group-hover:left-[108%] group-hover:opacity-100" />
        <span className="relative z-10 transition duration-300 group-hover:tracking-[0.2em]">
          Turn On Monk Mode
        </span>
      </MotionButton>

      <MotionDiv
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-12 max-w-3xl text-center"
      >
        <h1 className="bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400 bg-clip-text text-4xl font-black tracking-tight text-transparent font-heading sm:text-5xl md:text-6xl lg:text-7xl">
          MonkMode
        </h1>
        <p className="mt-3 text-sm text-stone-200/85 sm:mt-4 sm:text-base md:text-lg">
          Focus. Discipline. Growth. Analysis.
        </p>
      </MotionDiv>
    </main>
  );
}
