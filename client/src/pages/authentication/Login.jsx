import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_34%),linear-gradient(180deg,#17110f_0%,#241714_45%,#120d0c_100%)] px-6 py-10 text-white">
      <div className="w-full max-w-xl rounded-[2rem] border border-amber-100/10 bg-white/6 p-8 shadow-2xl shadow-black/25 backdrop-blur">
        <p className="text-[0.72rem] uppercase tracking-[0.35em] text-amber-200/70">Login</p>
        <h2 className="mt-3 text-3xl font-bold text-amber-50">Login page is ready for form wiring.</h2>
        <p className="mt-4 text-sm leading-7 text-stone-300">
          The landing page button now routes correctly. You can build the auth form here next.
        </p>
        <button
          type="button"
          className="mt-8 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-stone-950 shadow-xl shadow-orange-950/25 transition hover:-translate-y-0.5"
          onClick={() => navigate("/")}
        >
          Back Home
        </button>
      </div>
    </div>
  );
}
