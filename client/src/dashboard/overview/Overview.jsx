import useAuth from "../../hooks/useAuth";
import DashboardLayout from "../DashboardLayout";

export default function Overview() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-[2fr_1fr]">
          {/* Main Content Area */}
          <div className="lg:col-span-2 xl:col-span-1">
            <section className="rounded-[2rem] border border-amber-100/10 bg-white/6 p-8 shadow-2xl shadow-black/25 backdrop-blur">
              {/* Section Label - Overline */}
              <p className="text-label-lg">Overview</p>
              
              {/* Main Heading - Using custom font */}
              <h2 className="text-heading-xl mt-2">Welcome, {user?.name}.</h2>
              
              {/* Body Text */}
              <p className="text-body-md max-w-2xl mt-4">
                Your dashboard is now ready for focused work. This area can grow into habits, goals, journal, and productivity sections while keeping the top navigation anchored and clean.
              </p>

              {/* Card Grid */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-100/10 bg-stone-950/45 p-5">
                  {/* Card Label */}
                  <p className="text-label-md">Signed In</p>
                  {/* Card Value */}
                  <p className="text-accent-md mt-3">{user?.email}</p>
                </div>
                <div className="rounded-2xl border border-amber-100/10 bg-stone-950/45 p-5">
                  {/* Card Label */}
                  <p className="text-label-md">Mode</p>
                  {/* Card Value */}
                  <p className="text-accent-md mt-3">Discipline Active</p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar Content Area */}
          <div className="lg:col-span-1">
            <div className="rounded-[2rem] border border-amber-100/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-8 shadow-2xl shadow-black/25 backdrop-blur h-fit sticky top-8">
              {/* Section Label */}
              <p className="text-label-lg">Quick Exit</p>
              
              {/* Heading */}
              <h3 className="text-heading-lg mt-2">Take a mindful pause when you need it.</h3>
              
              {/* Body Text */}
              <p className="text-body-md max-w-2xl mt-4">
                The navbar gives you a fast way to turn off MonkMode, and this side panel can later become quick actions, streak insights, or reminders.
              </p>

              <button
                type="button"
                className="mt-8 w-full rounded-full border border-amber-100/15 bg-white/8 px-6 py-3 text-sm font-semibold text-amber-50 transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/50 hover:bg-gradient-to-r hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 hover:text-stone-950 hover:shadow-[0_0_28px_rgba(251,191,36,0.45)]"
                onClick={() => window.location.href = "/"}
              >
                Return to Landing Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
