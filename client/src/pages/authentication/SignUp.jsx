import { AnimatePresence, motion as Motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthBackground from "./AuthBackground";
import AuthFloatingMonk from "./AuthFloatingMonk";
import useAuth from "../../hooks/useAuth";

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: ""
};

export default function SignUp() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Please fill in all fields.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password
      });
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? "Unable to create account right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 text-white sm:px-6 sm:py-8">
      <AuthBackground />

      <div className="relative z-10 flex w-full max-w-xl -translate-y-4 flex-col items-center sm:-translate-y-6">
        <AuthFloatingMonk />

        <Motion.div
          className="-mt-8 w-full overflow-hidden rounded-[2rem] border border-amber-100/10 bg-white/6 shadow-2xl shadow-black/25 backdrop-blur sm:-mt-10"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="p-5 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <Motion.p
                className="auth-overline text-[0.72rem] uppercase tracking-[0.35em] text-amber-200/70"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                Signup
              </Motion.p>
              <Motion.h2
                className="mt-3 text-3xl font-bold text-amber-50 font-heading"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                Create your account
              </Motion.h2>
              <Motion.p
                className="mt-3 text-sm leading-7 text-stone-300"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                Start your MonkMode journey in under a minute.
              </Motion.p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <Motion.label
                  className="block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.27, duration: 0.3 }}
                >
                  <span className="mb-2 block text-sm font-medium text-stone-200">Full name</span>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="Debarghya Bandyopadhyay"
                  />
                </Motion.label>

                <Motion.label
                  className="block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.33, duration: 0.3 }}
                >
                  <span className="mb-2 block text-sm font-medium text-stone-200">Email</span>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="you@example.com"
                  />
                </Motion.label>

                <Motion.label
                  className="block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.39, duration: 0.3 }}
                >
                  <span className="mb-2 block text-sm font-medium text-stone-200">Password</span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="At least 6 characters"
                  />
                </Motion.label>

                <Motion.label
                  className="block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.3 }}
                >
                  <span className="mb-2 block text-sm font-medium text-stone-200">Confirm password</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-500 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="Repeat your password"
                  />
                </Motion.label>

                <AnimatePresence>
                  {error && (
                    <Motion.div
                      className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      {error}
                    </Motion.div>
                  )}
                </AnimatePresence>

                <Motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.51, duration: 0.3 }}
                >
                  <Motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-full border border-amber-100/45 bg-gradient-to-r from-[#ffd86b] via-[#f5b52f] to-[#ea8a17] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-stone-950 shadow-[0_0_0_1px_rgba(255,236,178,0.24),0_0_30px_rgba(251,191,36,0.28),0_18px_42px_rgba(120,52,8,0.3)] transition disabled:cursor-not-allowed disabled:opacity-70"
                    whileHover={{ scale: 1.02, boxShadow: "0 0 0 1px rgba(255,236,178,0.3), 0 0 44px rgba(251,191,36,0.55), 0 18px 42px rgba(120,52,8,0.35)" }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                  >
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Motion.button>
                </Motion.div>
              </form>

              <Motion.p
                className="mt-6 text-sm text-stone-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.58, duration: 0.3 }}
              >
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-amber-200 transition hover:text-amber-100">
                  Login here
                </Link>
              </Motion.p>

              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.63, duration: 0.3 }}
              >
                <Motion.button
                  type="button"
                  className="mt-8 rounded-full border border-amber-100/15 bg-white/8 px-6 py-3 text-sm font-semibold text-amber-50 transition duration-300 hover:border-amber-200/50 hover:bg-gradient-to-r hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 hover:text-stone-950"
                  onClick={() => navigate("/")}
                  whileHover={{ scale: 1.03, boxShadow: "0 0 28px rgba(251,191,36,0.45)", y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                >
                  Back Home
                </Motion.button>
              </Motion.div>
            </div>
          </div>
        </Motion.div>
      </div>
    </div>
  );
}
