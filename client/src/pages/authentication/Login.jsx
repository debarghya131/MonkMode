import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthBackground from "./AuthBackground";
import AuthFloatingMonk from "./AuthFloatingMonk";
import useAuth from "../../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: form.email.trim(),
        password: form.password
      });
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Unable to login right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-8 text-white">
      <AuthBackground />

      <div className="relative z-10 flex w-full max-w-lg -translate-y-4 flex-col items-center sm:-translate-y-6">
        <AuthFloatingMonk />

        <div className="-mt-8 w-full overflow-hidden rounded-[2rem] border border-amber-100/10 bg-white/6 shadow-2xl shadow-black/25 backdrop-blur sm:-mt-10">
          <div className="p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <p className="auth-overline text-[0.72rem] uppercase tracking-[0.35em] text-amber-200/70">Login</p>
              <h2 className="mt-3 text-3xl font-bold text-amber-50 font-heading">Welcome back</h2>
              <p className="mt-3 text-sm leading-7 text-stone-300">
                Sign in to continue your habits, goals, workouts, and deep work streaks.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-200">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-stone-200">Password</span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="Your password"
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full border border-amber-100/45 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-stone-950 shadow-[0_0_0_1px_rgba(255,236,178,0.24),0_0_30px_rgba(251,191,36,0.28),0_18px_42px_rgba(120,52,8,0.3)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3 text-sm text-stone-300">
                <span>Need an account?</span>
                <Link to="/signup" className="font-semibold text-amber-200 transition hover:text-amber-100">
                  Create one
                </Link>
              </div>

              <button
                type="button"
                className="mt-8 rounded-full border border-amber-100/15 bg-white/8 px-6 py-3 text-sm font-semibold text-amber-50 transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/50 hover:bg-gradient-to-r hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 hover:text-stone-950 hover:shadow-[0_0_28px_rgba(251,191,36,0.45)]"
                onClick={() => navigate("/")}
              >
                Back Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
