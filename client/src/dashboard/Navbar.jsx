import monkLogo from "../assets/monk.png";
import NavbarBirdBackground from "./NavbarBirdBackground";

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function Navbar({ user }) {
  const firstName = user?.name || "Friend";
  const maxStreak = user?.maxStreak || 0;
  const currentDate = formatDate(new Date());

  return (
    <div className="relative overflow-hidden px-6 py-3">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(120deg, #07192f 0%, #1a2e58 32%, #1b1741 55%, #190b12 100%)",
          backgroundSize: "280% 280%",
          animation: "navbarGradientShift 6s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[-12%] w-[42%]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(125,211,252,0.2) 40%, rgba(251,191,36,0.22) 65%, transparent 100%)",
          filter: "blur(10px)",
          animation: "navbarLightSweep 5s linear infinite",
        }}
      />
      <NavbarBirdBackground />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_18%),linear-gradient(180deg,rgba(5,10,22,0.12),rgba(10,8,18,0.2)_64%,rgba(7,5,14,0.34))]"
      />

      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">

        {/* LEFT: Logo */}
        <div className="flex flex-col items-center w-fit">
          <img src={monkLogo} alt="MonkMode" className="h-20 w-auto object-contain" />
          <span className="text-sm font-semibold tracking-wide text-amber-400 -mt-1">MonkMode</span>
        </div>

        {/* CENTER: Greeting */}
        <div className="text-center">
          <p className="text-label-sm text-amber-300/70">
            Welcome back
          </p>
          <h1 className="text-heading-md md:text-heading-lg text-amber-50 mt-1">
            {firstName}
          </h1>
        </div>

        {/* RIGHT: Info */}
        <div className="flex items-center gap-8 justify-end">

          <div className="flex flex-col gap-0.5">
            <p className="text-body-xs text-stone-400">Today</p>
            <p className="text-body-sm text-amber-50 font-medium">{currentDate}</p>
          </div>

          <div className="flex flex-col gap-0.5 pl-6 border-l border-amber-100/15">
            <p className="text-body-xs text-amber-300/70">Monk Streak</p>
            <p className="text-body-sm font-semibold text-amber-300">
              {maxStreak} days 🔥
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
