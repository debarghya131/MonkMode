import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform
} from "framer-motion";
import monkIllustration from "../../assets/monk.webp";

const createSeededRandom = (seedValue) => {
  let seed = seedValue;

  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

const random = createSeededRandom(1142026);

const sparkles = Array.from({ length: 28 }, (_, index) => ({
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
  const shouldReduceMotion = useReducedMotion();
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
    if (shouldReduceMotion || !window.matchMedia("(pointer: fine)").matches) return undefined;
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
  }, [parallaxX, parallaxY, shouldReduceMotion]);

  return (
    <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16">
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

      <div className="relative flex h-[clamp(12rem,32dvh,25rem)] w-full items-center justify-center sm:h-[clamp(16rem,40dvh,28rem)]">
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
              className="w-[210px] sm:w-[300px] md:w-[420px] lg:w-[500px]"
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

      <MotionDiv
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.15 }}
        className="flex w-full flex-col items-center gap-5 min-[480px]:w-auto min-[480px]:flex-row sm:gap-6"
      >
        <MotionDiv
          className="relative w-40 max-w-full rounded-full min-[480px]:w-auto"
          animate={shouldReduceMotion ? { y: 0, scale: 1 } : { y: [0, -18, 0, -7, 0], scale: [1, 1.04, 1, 1.015, 1] }}
          transition={{ duration: 1.2, repeat: shouldReduceMotion ? 0 : Infinity, repeatDelay: 0.25, times: [0, 0.35, 0.65, 0.82, 1], ease: "easeInOut" }}
        >
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-full bg-amber-300/45 opacity-30 blur-xl"
            animate={shouldReduceMotion ? undefined : { opacity: [0.3, 0.7, 0.3], scale: [0.98, 1.08, 0.98] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <MotionButton
            type="button"
            whileHover={{
              y: -6,
              scale: 1.04,
              boxShadow:
                "0 0 0 1px rgba(255,236,178,0.34), 0 0 44px rgba(251,191,36,0.56), 0 26px 54px rgba(120,52,8,0.46)"
            }}
            whileTap={{ scale: 0.98, y: -2 }}
            onClick={() => navigate("/demo-login")}
            className="group relative z-10 min-h-11 w-full overflow-hidden rounded-full border border-amber-200/45 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] px-6 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-stone-950 shadow-[0_0_0_1px_rgba(255,236,178,0.24),0_0_30px_rgba(251,191,36,0.34),0_18px_42px_rgba(120,52,8,0.34)] transition duration-300 hover:border-amber-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 min-[480px]:w-auto sm:px-8 sm:py-3 sm:text-sm"
          >
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-[-35%] w-[32%] -skew-x-12 bg-white/35 opacity-0 blur-md"
              animate={shouldReduceMotion ? undefined : { x: ["0%", "455%"], opacity: [0, 0.7, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
            />
            <span className="relative z-10 transition duration-300 group-hover:tracking-[0.2em]">Try Demo</span>
          </MotionButton>
        </MotionDiv>

        <MotionDiv
          className="w-56 max-w-full min-[480px]:w-auto"
          animate={shouldReduceMotion ? { y: 0 } : { y: [0, -12, 0, -4, 0] }}
          transition={{ duration: 1.4, delay: 0.3, repeat: shouldReduceMotion ? 0 : Infinity, repeatDelay: 0.25, times: [0, 0.35, 0.65, 0.82, 1], ease: "easeInOut" }}
        >
          <MotionButton
            type="button"
            whileHover={{
              y: -4,
              scale: 1.03,
              boxShadow:
                "0 0 0 1px rgba(251,191,36,0.18), 0 0 30px rgba(251,191,36,0.22), 0 18px 38px rgba(35,12,6,0.45)"
            }}
            whileTap={{ scale: 0.98, y: -1 }}
            onClick={() => navigate("/signup")}
            className="group min-h-11 w-full rounded-full border border-amber-200/20 bg-white/6 px-6 py-2.5 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-amber-100/90 shadow-[0_10px_26px_rgba(0,0,0,0.24)] backdrop-blur transition duration-300 hover:border-amber-200/45 hover:bg-white/10 hover:text-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 min-[480px]:w-auto sm:px-7 sm:py-3 sm:text-xs sm:tracking-[0.24em]"
          >
            <span className="relative z-10">
              Turn On Monk Mode
            </span>
          </MotionButton>
        </MotionDiv>
      </MotionDiv>

      <MotionDiv
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-7 max-w-3xl text-center sm:mt-10"
      >
        <h1 className="bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400 bg-clip-text font-heading text-[clamp(2.3rem,11vw,4.5rem)] font-black tracking-tight text-transparent">
          MonkMode
        </h1>
        <p className="mt-3 text-sm text-stone-200/85 sm:mt-4 sm:text-base md:text-lg">
          Focus. Discipline. Growth. Analysis.
        </p>
      </MotionDiv>
    </main>
  );
}
