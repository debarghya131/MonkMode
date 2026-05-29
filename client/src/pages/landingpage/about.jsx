import { motion as Motion } from "framer-motion";
import AuthBackground from "../authentication/AuthBackground";
import LandingNavbar from "./LandingNavbar";
import creatorImage from "../../assets/creator.webp";
import monkIllustration from "../../assets/monk.webp";

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.447-2.136 2.942v5.664H9.351V9h3.414v1.561h.047c.476-.9 1.637-1.85 3.37-1.85 3.602 0 4.267 2.371 4.267 5.455v6.286h-.002ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.114 20.452H3.558V9h3.556v11.452Z" />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.02c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18A10.9 10.9 0 0 1 12 6.18c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.42-2.69 5.38-5.26 5.67.42.36.79 1.07.79 2.16v3.21c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export default function About() {
  return (
    <main className="auth-page relative min-h-dvh overflow-x-hidden text-white sm:min-h-screen">
      <div className="fixed inset-0">
        <AuthBackground />
      </div>

      <div className="relative z-10">
        <LandingNavbar />

        <section
          id="about"
          className="mx-auto w-full max-w-7xl px-3 pb-14 pt-5 sm:px-6 sm:pb-24 sm:pt-8 md:px-8"
        >
          <Motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-[1.35rem] border border-amber-200/10 bg-stone-950/40 px-4 py-5 shadow-[0_18px_56px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:rounded-[1.75rem] sm:px-8 sm:py-8"
          >
            <Motion.div
              className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl"
              animate={{ opacity: [0.3, 0.65, 0.3], scale: [0.95, 1.08, 0.95] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <Motion.div
              className="pointer-events-none absolute -bottom-28 right-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl"
              animate={{ opacity: [0.18, 0.46, 0.18], x: [0, -18, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative grid gap-6 sm:gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-center">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Motion.div
                    className="absolute -inset-4 rounded-full bg-amber-400/15 blur-2xl"
                    animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.92, 1.08, 0.92] }}
                    transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <Motion.div
                    className="absolute -inset-2 rounded-full border border-amber-200/15"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  />
                  <Motion.img
                    src={creatorImage}
                    alt="Debarghya Bandyopadhyay"
                    className="relative h-44 w-44 rounded-full border border-amber-100/20 object-cover object-top shadow-[0_24px_60px_rgba(0,0,0,0.42)] sm:h-56 sm:w-56 lg:h-64 lg:w-64"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
                    whileHover={{ scale: 1.03 }}
                  />
                </div>
                <h3 className="mt-5 font-heading text-xl font-black text-amber-50 sm:mt-6 sm:text-2xl">
                  Debarghya Bandyopadhyay
                </h3>
                <p className="mt-2 text-sm font-semibold text-amber-200/70">
                  Creator of MonkMode
                </p>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.24em] text-amber-200/60 sm:text-[0.68rem] sm:tracking-[0.32em]">
                  Creator Details
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base sm:leading-8">
                  🙏 Namo Buddhaya , I am Debarghya Bandyopadhyay, the creator of
                  MonkMode. I love building modern web applications and SaaS
                  products using AI-assisted workflows, rapid prototyping, and
                  technologies like React.js, Next.js, Node.js, MongoDB,
                  TypeScript, and Python. MonkMode is built from my interest in
                  discipline, productivity, self-improvement, and practical web
                  development.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Motion.div
                    whileHover={{ y: -5, scale: 1.01 }}
                    className="rounded-[1.15rem] border border-amber-100/10 bg-white/[0.045] p-4 text-left transition-colors hover:border-amber-200/30 hover:bg-amber-300/[0.07] sm:rounded-2xl"
                  >
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-amber-200/60">
                      B.Tech
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-amber-50">
                      Netaji Subhas Engineering College, Kolkata
                    </p>
                  </Motion.div>
                  <Motion.div
                    whileHover={{ y: -5, scale: 1.01 }}
                    className="rounded-[1.15rem] border border-amber-100/10 bg-white/[0.045] p-4 text-left transition-colors hover:border-amber-200/30 hover:bg-amber-300/[0.07] sm:rounded-2xl"
                  >
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-amber-200/60">
                      Diploma
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-amber-50">
                      Technique Polytechnique Institute, Hooghly
                    </p>
                  </Motion.div>
                </div>

                <div className="mt-6">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-amber-200/60 sm:tracking-[0.24em]">
                    Be My Friend
                  </p>
                  <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base sm:leading-8">
                    I always like to make new friends follow me on
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
                    <Motion.a
                      href="https://x.com/debarghya131"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Connect with Debarghya on X"
                      whileHover={{ y: -4, scale: 1.08 }}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-100/15 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-amber-50 transition hover:border-amber-200/45 hover:bg-amber-300/15 hover:text-amber-100"
                    >
                      <XLogo />
                    </Motion.a>
                    <Motion.a
                      href="https://www.linkedin.com/in/debarghya-bandyopadhyay-953b02400?utm_source=share_via&utm_content=profile&utm_medium=member_android"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Connect with Debarghya on LinkedIn"
                      whileHover={{ y: -4, scale: 1.08 }}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-100/15 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-amber-50 transition hover:border-amber-200/45 hover:bg-amber-300/15 hover:text-amber-100"
                    >
                      <LinkedInLogo />
                    </Motion.a>
                    <Motion.a
                      href="https://github.com/debarghya131"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Connect with Debarghya on GitHub"
                      whileHover={{ y: -4, scale: 1.08 }}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-100/15 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-amber-50 transition hover:border-amber-200/45 hover:bg-amber-300/15 hover:text-amber-100"
                    >
                      <GitHubLogo />
                    </Motion.a>
                    <Motion.a
                      href="https://portfolio.debarghya.org"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="View Debarghya's portfolio"
                      whileHover={{ y: -4, scale: 1.08 }}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-100/15 bg-white/[0.045] px-4 py-2 text-sm font-semibold text-amber-50 transition hover:border-amber-200/45 hover:bg-amber-300/15 hover:text-amber-100"
                    >
                      Portfolio
                    </Motion.a>
                  </div>
                </div>
              </div>
            </div>
          </Motion.div>

          <Motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="group relative mt-6 overflow-hidden rounded-[1.5rem] border border-amber-200/10 bg-stone-950/45 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-xl sm:rounded-[2rem]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),transparent_38%,rgba(59,130,246,0.08))]" />
            <Motion.div
              className="pointer-events-none absolute -left-28 top-0 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl"
              animate={{ opacity: [0.22, 0.52, 0.22], scale: [0.95, 1.12, 0.95] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <Motion.div
              className="pointer-events-none absolute -right-20 top-16 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl"
              animate={{ opacity: [0.18, 0.42, 0.18], y: [0, 18, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative grid gap-8 px-4 py-6 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.55fr)] lg:items-center lg:px-10 lg:py-12">
              <div>
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.24em] text-amber-200/65 sm:text-[0.72rem] sm:tracking-[0.34em]">
                  Motivation
                </p>
                <h2 className="mt-3 max-w-4xl font-heading text-[1.15rem] font-black leading-tight text-amber-50 sm:text-2xl lg:whitespace-nowrap lg:text-[1.85rem] xl:text-[2.15rem]">
                  Motivation for creating this project.
                </h2>
                <p className="mt-6 max-w-3xl text-sm leading-7 text-stone-300 sm:mt-8 sm:text-base sm:leading-8">
                  I was also a less disciplined student. I was not consistent,
                  and I could not focus on one work for a long time. Over time,
                  I realized how important discipline is for a student, not only
                  for study, but also for building a better life.
                </p>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base sm:leading-8">
                  That realization became the motivation behind MonkMode. I
                  wanted to create one calm place where a person can track their
                  daily actions, goals, habits, journal reflections, fitness
                  progress, and weekly growth. This project is made for
                  students, learners, builders, and anyone who wants to improve
                  step by step without getting lost in distraction.
                </p>
              </div>

              <div className="relative flex min-h-[14rem] items-center justify-center sm:min-h-[18rem]">
                <Motion.div
                  className="absolute h-44 w-44 rounded-full border border-amber-200/15 sm:h-56 sm:w-56"
                  animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
                <Motion.div
                  className="absolute h-56 w-56 rounded-full border border-amber-200/10 sm:h-72 sm:w-72"
                  animate={{ scale: [1.04, 0.94, 1.04], opacity: [0.22, 0.5, 0.22] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                />
                <Motion.img
                  src={monkIllustration}
                  alt="Meditating monk"
                  className="relative z-10 w-44 drop-shadow-[0_28px_50px_rgba(0,0,0,0.42)] sm:w-56 lg:w-72"
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <Motion.div
                whileHover={{ y: -5 }}
                className="relative overflow-hidden rounded-[1.25rem] border border-amber-100/10 bg-black/20 p-4 sm:rounded-2xl sm:p-5 lg:col-span-2"
              >
                <Motion.div
                  className="pointer-events-none absolute inset-y-0 left-[-30%] w-[22%] -skew-x-12 bg-amber-100/10 blur-xl"
                  animate={{ left: ["-30%", "120%"] }}
                  transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
                />
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-amber-200/65 sm:text-[0.68rem] sm:tracking-[0.3em]">
                  Why MonkMode?
                </p>
                <p className="mt-4 text-sm leading-7 text-stone-300 sm:text-base sm:leading-8">
                  I chose the name MonkMode because monks represent discipline,
                  consistency, self-control, and deep focus. A monk lives with
                  fewer distractions, follows a simple routine, and trains the
                  mind to stay calm even when the world is noisy. That mindset
                  is very powerful for students and builders.
                </p>
                <p className="mt-4 text-sm leading-7 text-stone-300 sm:text-base sm:leading-8">
                  Buddhism also teaches awareness, patience, mindfulness, and
                  control over desire. MonkMode is inspired by that idea: to
                  observe yourself honestly, reduce distraction, build better
                  habits, and improve every day with a peaceful but focused
                  mind.
                </p>
              </Motion.div>
            </div>
          </Motion.div>

        </section>
      </div>
    </main>
  );
}
