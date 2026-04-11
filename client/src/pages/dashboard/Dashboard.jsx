import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,#17110f_0%,#241714_45%,#120d0c_100%)] px-6 py-10 text-white">
      <div className="w-full max-w-xl rounded-[2rem] border border-amber-100/10 bg-white/6 p-8 shadow-2xl shadow-black/25 backdrop-blur">
        <p className="text-[0.72rem] uppercase tracking-[0.35em] text-amber-200/70">Dashboard</p>
        <h2 className="mt-3 text-3xl font-bold text-amber-50">Dashboard route is connected.</h2>
        <p className="mt-4 text-sm leading-7 text-stone-300">
          This placeholder keeps navigation working while you build out your MonkMode app screens.
        </p>
        <button
          type="button"
          className="mt-8 rounded-full border border-amber-100/15 bg-white/8 px-6 py-3 text-sm font-semibold text-amber-50 transition hover:-translate-y-0.5 hover:bg-white/12"
          onClick={() => navigate("/")}
        >
          Return to Landing Page
        </button>
      </div>
    </div>
  );
}
