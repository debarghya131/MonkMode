import { motion as Motion } from "framer-motion";
import monkIllustration from "../../assets/monk.png";

const sparkles = [
  { id: 1, left: "18%", top: "26%", size: 5, duration: 2.8, delay: 0.2, opacity: 0.55 },
  { id: 2, left: "74%", top: "18%", size: 7, duration: 3.4, delay: 0.6, opacity: 0.72 },
  { id: 3, left: "84%", top: "48%", size: 4, duration: 2.6, delay: 1.2, opacity: 0.5 },
  { id: 4, left: "10%", top: "58%", size: 6, duration: 3.1, delay: 0.9, opacity: 0.64 },
  { id: 5, left: "68%", top: "72%", size: 8, duration: 3.8, delay: 1.5, opacity: 0.7 },
  { id: 6, left: "32%", top: "12%", size: 5, duration: 2.9, delay: 0.4, opacity: 0.58 }
];

export default function AuthFloatingMonk() {
  return (
    <div className="pointer-events-none relative z-20 flex h-[150px] w-full items-end justify-center sm:h-[210px]">
      {sparkles.map((sparkle) => (
        <Motion.span
          key={sparkle.id}
          className="absolute rounded-full bg-[#ffd54f]"
          animate={{
            scale: [0.6, 1.3, 0.6],
            opacity: [sparkle.opacity * 0.45, sparkle.opacity, sparkle.opacity * 0.45]
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
            height: sparkle.size
          }}
        />
      ))}

      <Motion.div
        className="absolute bottom-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(255,227,138,0.66),rgba(255,191,73,0.22),transparent_72%)] blur-2xl sm:bottom-10 sm:h-56 sm:w-56"
        animate={{
          scale: [0.94, 1.06, 0.94],
          opacity: [0.7, 0.95, 0.7]
        }}
        transition={{
          duration: 4.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <Motion.div
        className="absolute bottom-1 h-6 w-28 rounded-full bg-black/35 blur-xl sm:h-7 sm:w-44"
        animate={{
          opacity: [0.34, 0.16, 0.34],
          scaleX: [1, 0.9, 1],
          scaleY: [1, 0.82, 1]
        }}
        transition={{
          duration: 5.6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <Motion.div
        className="relative z-10"
        animate={{
          y: [0, -12, -18, -10, 0]
        }}
        transition={{
          duration: 5.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Motion.img
          src={monkIllustration}
          alt="Floating monk"
          className="w-[150px] drop-shadow-[0_22px_42px_rgba(0,0,0,0.42)] sm:w-[240px]"
          animate={{
            scale: [1, 1.04, 1]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </Motion.div>
    </div>
  );
}
