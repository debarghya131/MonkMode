import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import AuthBackground from "./AuthBackground";
import AuthFloatingMonk from "./AuthFloatingMonk";

export default function SsoCallback() {
  return (
    <div className="auth-page relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 text-white sm:px-6 sm:py-8">
      <AuthBackground />

      <div className="relative z-10 flex w-full max-w-lg -translate-y-4 flex-col items-center sm:-translate-y-6">
        <AuthFloatingMonk />

        <Motion.div
          className="-mt-8 w-full overflow-hidden rounded-[2rem] border border-amber-100/10 bg-white/6 shadow-2xl shadow-black/25 backdrop-blur sm:-mt-10"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="p-5 sm:p-8 md:p-10">
            <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
              <Motion.p
                className="auth-overline text-[0.72rem] uppercase tracking-[0.35em] text-amber-200/70"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                Google Login
              </Motion.p>
              <Motion.h2
                className="mt-3 font-heading text-3xl font-bold text-amber-50"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                Completing sign-in
              </Motion.h2>
              <Motion.p
                className="mt-3 text-sm leading-7 text-stone-300"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                We&apos;re finishing your Google authentication and bringing you into MonkMode.
              </Motion.p>

              <div className="mt-8 flex items-center gap-3 text-sm text-stone-200">
                <span className="h-3 w-3 animate-pulse rounded-full bg-amber-300" />
                <span>Securing your session...</span>
              </div>

              <div className="mt-6 text-sm text-stone-300">
                <Link to="/" className="font-semibold text-stone-300 transition hover:text-amber-100">
                  Back to home
                </Link>
              </div>

              <AuthenticateWithRedirectCallback
                afterSignInUrl="/dashboard"
                afterSignUpUrl="/dashboard"
                signInFallbackRedirectUrl="/login"
                signUpFallbackRedirectUrl="/signup"
              />
            </div>
          </div>
        </Motion.div>
      </div>
    </div>
  );
}
