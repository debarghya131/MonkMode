import monkLogo from "../assets/monk.png";

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
    <div className="bg-gradient-to-r from-[#0B1220] via-[#0A0F1F] to-[#140A2E] px-6 py-3">
      
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">

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