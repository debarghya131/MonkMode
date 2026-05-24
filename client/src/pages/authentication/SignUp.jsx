import { useSignUp } from "@clerk/react";
import { motion as Motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthBackground from "./AuthBackground";
import AuthFloatingMonk from "./AuthFloatingMonk";
import useAuth from "../../hooks/useAuth";

const OAUTH_REDIRECT_URL = "/dashboard";
const OAUTH_CALLBACK_URL = "/sso-callback";

const GoogleIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
    <path
      d="M21.805 10.023H12.24v3.955h5.48a4.69 4.69 0 0 1-2.034 3.08v2.555h3.287c1.924-1.772 3.032-4.39 3.032-7.51 0-.699-.063-1.37-.2-2.08Z"
      fill="#4285F4"
    />
    <path
      d="M12.24 22c2.74 0 5.038-.9 6.718-2.434l-3.287-2.555c-.912.618-2.08.986-3.431.986-2.644 0-4.884-1.785-5.684-4.184H3.164v2.635A10.148 10.148 0 0 0 12.24 22Z"
      fill="#34A853"
    />
    <path
      d="M6.556 13.813a6.095 6.095 0 0 1-.317-1.813c0-.629.113-1.232.317-1.813V7.552H3.164A10.145 10.145 0 0 0 2.08 12c0 1.636.39 3.184 1.084 4.448l3.392-2.635Z"
      fill="#FBBC05"
    />
    <path
      d="M12.24 6.003c1.489 0 2.819.513 3.871 1.518l2.9-2.9C17.274 2.996 14.979 2 12.24 2A10.148 10.148 0 0 0 3.164 7.552l3.392 2.635c.8-2.4 3.04-4.184 5.684-4.184Z"
      fill="#EA4335"
    />
  </svg>
);

export default function SignUp() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { errors, fetchStatus, signUp } = useSignUp();
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const getClerkErrorMessage = (fallback) => (
    errors.global?.[0]?.longMessage ||
    errors.global?.[0]?.message ||
    fallback
  );

  const handleGoogleSignup = async () => {
    setError("");

    const { error: signUpError } = await signUp.sso({
      strategy: "oauth_google",
      redirectUrl: OAUTH_REDIRECT_URL,
      redirectCallbackUrl: OAUTH_CALLBACK_URL
    });

    if (signUpError) {
      setError(signUpError.longMessage || signUpError.message || getClerkErrorMessage("Unable to continue with Google right now."));
    }
  };

  const isSubmitting = fetchStatus === "fetching";

  return (
    <div className="auth-page relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-4 text-white sm:min-h-screen sm:px-6 sm:py-8">
      <AuthBackground />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center sm:-translate-y-6">
        <AuthFloatingMonk />

        <Motion.div
          className="-mt-4 w-full overflow-hidden rounded-[1.75rem] border border-amber-100/10 bg-white/6 shadow-2xl shadow-black/25 backdrop-blur sm:-mt-10 sm:rounded-[2rem]"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="p-4 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <Motion.p
                className="auth-overline text-[0.66rem] uppercase tracking-[0.28em] text-amber-200/70 sm:text-[0.72rem] sm:tracking-[0.35em]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                Signup
              </Motion.p>
              <Motion.h2
                className="mt-2.5 font-heading text-[1.8rem] font-bold text-amber-50 sm:mt-3 sm:text-3xl"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                Create your account
              </Motion.h2>
              <Motion.p
                className="mt-2.5 text-sm leading-6 text-stone-300 sm:mt-3 sm:leading-7"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                Start your MonkMode journey by connecting your Gmail account. No separate password is needed.
              </Motion.p>

              <div className="mt-6 space-y-3.5 sm:mt-8 sm:space-y-4">
                <Motion.button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-amber-100/10 bg-stone-950/55 px-4 py-3 text-sm font-semibold text-white transition hover:border-amber-300/40 hover:bg-stone-900/70 disabled:cursor-not-allowed disabled:opacity-70"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.27, duration: 0.3 }}
                >
                  <GoogleIcon />
                  <span>{isSubmitting ? "Redirecting to Google..." : "Continue with Gmail"}</span>
                </Motion.button>

                <Motion.p
                  className="rounded-2xl border border-amber-100/10 bg-black/20 px-4 py-3 text-xs leading-5 text-stone-300 sm:leading-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.34, duration: 0.3 }}
                >
                  Signup is Google-only. Clerk will use your Gmail identity and your MonkMode data will still map to the same email on the backend.
                </Motion.p>

                {error ? (
                  <Motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                  >
                    {error}
                  </Motion.div>
                ) : null}

                <div id="clerk-captcha" className="min-h-0" />
              </div>

              <Motion.div
                className="mt-6 text-center text-sm text-stone-300 sm:mt-8"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.41, duration: 0.3 }}
              >
                <Link to="/" className="font-semibold text-stone-300 transition hover:text-amber-100">
                  Back to home
                </Link>
              </Motion.div>

              <Motion.div
                className="mt-3 text-center text-sm text-stone-300 sm:mt-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.3 }}
              >
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-amber-200 transition hover:text-amber-100">
                  Sign in with Google
                </Link>
              </Motion.div>
            </div>
          </div>
        </Motion.div>
      </div>
    </div>
  );
}
