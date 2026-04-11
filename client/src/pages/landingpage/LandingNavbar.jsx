import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import monkModeLogo from "../../assets/monkmode-logo.png";

const goldenHoverClass =
  "hover:-translate-y-0.5 hover:border-amber-200/50 hover:bg-gradient-to-r hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 hover:text-stone-950 hover:shadow-[0_0_28px_rgba(251,191,36,0.45)]";

const navButtonClass = (isHighlighted) =>
  `rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 ${
    isHighlighted
      ? `border border-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500 text-stone-950 shadow-lg shadow-orange-950/20 ${goldenHoverClass}`
      : `border border-transparent text-amber-50 ${goldenHoverClass}`
  }`;

export default function LandingNavbar() {
  const MotionHeader = motion.header;
  const navigate = useNavigate();
  const navItems = [
    {
      label: "Features",
      onClick: () => window.scrollTo({ top: window.innerHeight * 0.55, behavior: "smooth" })
    },
    {
      label: "Demo Login",
      onClick: () => navigate("/dashboard")
    },
    {
      label: "About",
      onClick: () => window.scrollTo({ top: window.innerHeight * 0.9, behavior: "smooth" })
    }
  ];
  const handleHomeNavigation = () => navigate("/");

  return (
    <MotionHeader
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="mx-auto w-full max-w-7xl px-6 py-6 md:px-8"
    >
      <div className="flex items-center justify-between gap-6 rounded-[1.75rem] border border-amber-200/10 bg-stone-950/45 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-6">
        <button
          type="button"
          onClick={handleHomeNavigation}
          className="h-[78px] w-[190px] overflow-hidden rounded-[1.7rem] border border-amber-300/15 bg-gradient-to-br from-[#2a120b] via-[#1d0d08] to-[#170907] shadow-[0_0_30px_rgba(251,191,36,0.12),inset_0_1px_0_rgba(255,240,200,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/25 hover:shadow-[0_0_42px_rgba(251,191,36,0.22),inset_0_1px_0_rgba(255,240,200,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 md:h-[88px] md:w-[220px]"
        >
          <img
            src={monkModeLogo}
            alt="MonkMode logo"
            className="pointer-events-none mt-[2px] h-[140px] w-[320px] max-w-none -translate-x-[58px] -translate-y-[36px] object-contain drop-shadow-[0_10px_24px_rgba(251,146,60,0.3)] md:h-[162px] md:w-[368px] md:-translate-x-[66px] md:-translate-y-[42px]"
          />
        </button>

        <nav className="hidden items-center gap-2 rounded-full border border-amber-200/20 bg-gradient-to-r from-amber-500/10 via-orange-400/10 to-yellow-300/10 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] lg:flex">
          {navItems.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className={navButtonClass(index === 1)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={`hidden rounded-full border border-transparent bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition sm:inline-flex ${goldenHoverClass}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={`rounded-full border border-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-stone-950 shadow-lg shadow-orange-950/20 transition ${goldenHoverClass}`}
          >
            Signup
          </button>
        </div>
      </div>
    </MotionHeader>
  );
}
