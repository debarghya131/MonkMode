import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      label: "Features",
      onClick: () => {
        setMobileOpen(false);
        window.scrollTo({ top: window.innerHeight * 0.55, behavior: "smooth" });
      },
    },
    {
      label: "Try Demo",
      onClick: () => {
        setMobileOpen(false);
        navigate("/demo-login");
      },
    },
    {
      label: "About",
      onClick: () => {
        setMobileOpen(false);
        window.scrollTo({ top: window.innerHeight * 0.9, behavior: "smooth" });
      },
    },
  ];

  const handleHomeNavigation = () => navigate("/");

  return (
    <MotionHeader
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 md:px-8"
    >
      <div className="flex items-center justify-between gap-3 rounded-[1.75rem] border border-amber-200/10 bg-stone-950/45 px-3 py-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-4 sm:py-3 md:px-6">

        {/* Logo */}
        <button
          type="button"
          onClick={handleHomeNavigation}
          className="h-[60px] w-[150px] overflow-hidden rounded-[1.4rem] border border-amber-300/15 bg-gradient-to-br from-[#2a120b] via-[#1d0d08] to-[#170907] shadow-[0_0_30px_rgba(251,191,36,0.12),inset_0_1px_0_rgba(255,240,200,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/25 hover:shadow-[0_0_42px_rgba(251,191,36,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 sm:h-[72px] sm:w-[180px] md:h-[88px] md:w-[220px]"
        >
          <img
            src={monkModeLogo}
            alt="MonkMode logo"
            className="pointer-events-none mt-[2px] h-[108px] w-[246px] max-w-none -translate-x-[44px] -translate-y-[28px] object-contain drop-shadow-[0_10px_24px_rgba(251,146,60,0.3)] sm:h-[126px] sm:w-[288px] sm:-translate-x-[52px] sm:-translate-y-[32px] md:h-[162px] md:w-[368px] md:-translate-x-[66px] md:-translate-y-[42px]"
          />
        </button>

        {/* Desktop nav links */}
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

        {/* Right side: auth buttons + hamburger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={`hidden rounded-full border border-transparent bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition sm:inline-flex sm:px-5 sm:py-2.5 ${goldenHoverClass}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className={`rounded-full border border-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500 px-4 py-2 text-sm font-bold text-stone-950 shadow-lg shadow-orange-950/20 transition sm:px-5 sm:py-2.5 ${goldenHoverClass}`}
          >
            Signup
          </button>

          {/* Hamburger — visible only below lg */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/20 bg-white/5 text-amber-200 transition hover:border-amber-300/40 hover:bg-white/10 lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileOpen ? (
                <motion.svg
                  key="x"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </motion.svg>
              ) : (
                <motion.svg
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </motion.svg>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10, scaleY: 0.92 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -10, scaleY: 0.92 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ transformOrigin: "top" }}
            className="mt-2 overflow-hidden rounded-[1.4rem] border border-amber-200/10 bg-stone-950/80 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:hidden"
          >
            {navItems.map((item, index) => (
              <motion.button
                key={item.label}
                type="button"
                onClick={item.onClick}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06, duration: 0.2 }}
                className={`w-full rounded-xl px-5 py-3 text-left text-sm font-semibold transition duration-200 ${
                  index === 1
                    ? "bg-gradient-to-r from-amber-300/20 to-orange-400/15 text-amber-200 hover:from-amber-300/30"
                    : "text-amber-50/80 hover:bg-white/6 hover:text-amber-100"
                }`}
              >
                {item.label}
              </motion.button>
            ))}

            <div className="mx-2 my-2 border-t border-amber-100/8" />

            <motion.button
              type="button"
              onClick={() => { setMobileOpen(false); navigate("/login"); }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18, duration: 0.2 }}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500/20 to-blue-500/15 px-5 py-3 text-left text-sm font-semibold text-sky-200 transition hover:from-sky-500/30"
            >
              Login
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionHeader>
  );
}
