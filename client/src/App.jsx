import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./pages/authentication/ProtectedRoute";
import DashboardLayout from "./dashboard/DashboardLayout";

const LandingPage = lazy(() => import("./pages/landingpage/LandingPage"));
const DemoLogin = lazy(() => import("./pages/landingpage/demologin"));
const About = lazy(() => import("./pages/landingpage/about"));
const Features = lazy(() => import("./pages/landingpage/features"));
const Login = lazy(() => import("./pages/authentication/Login"));
const SignUp = lazy(() => import("./pages/authentication/SignUp"));
const SsoCallback = lazy(() => import("./pages/authentication/SsoCallback"));
const Overview = lazy(() => import("./dashboard/overview/Overview"));
const Journal = lazy(() => import("./dashboard/journal/Journal"));
const Todo = lazy(() => import("./dashboard/todo/Todo"));
const Habits = lazy(() => import("./dashboard/habits/Habits"));
const Goal = lazy(() => import("./dashboard/goal/Goal"));
const Gym = lazy(() => import("./dashboard/gym/Gym"));
const Analytics = lazy(() => import("./dashboard/analysis/Analytics"));
const WeeklyReport = lazy(() => import("./dashboard/weeklyreport/WeeklyReport"));
const AIGuru = lazy(() => import("./dashboard/ai_guru/AIGuru"));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#12090a] text-stone-200">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6">
        <div className="rounded-2xl border border-amber-200/10 bg-black/20 px-6 py-4 text-sm font-semibold tracking-[0.16em] text-amber-200/80 backdrop-blur">
          Loading MonkMode
        </div>
      </div>
    </div>
  );
}

const withSuspense = (element) => <Suspense fallback={<RouteFallback />}>{element}</Suspense>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={withSuspense(<LandingPage />)} />
        <Route path="/about" element={withSuspense(<About />)} />
        <Route path="/features" element={withSuspense(<Features />)} />
        <Route path="/demo-login" element={withSuspense(<DemoLogin />)} />
        <Route path="/login" element={withSuspense(<Login />)} />
        <Route path="/signup" element={withSuspense(<SignUp />)} />
        <Route path="/sso-callback" element={withSuspense(<SsoCallback />)} />
        
        {/* Dashboard Routes with Fixed Layout */}
        <Route path="/dashboard" element={<ProtectedRoute>{withSuspense(<Overview />)}</ProtectedRoute>} />
        <Route path="/dashboard/journal" element={<ProtectedRoute><DashboardLayout>{withSuspense(<Journal />)}</DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/todo" element={<ProtectedRoute><DashboardLayout>{withSuspense(<Todo />)}</DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/habit" element={<ProtectedRoute><DashboardLayout>{withSuspense(<Habits />)}</DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/goal" element={<ProtectedRoute><DashboardLayout>{withSuspense(<Goal />)}</DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/gym" element={<ProtectedRoute><DashboardLayout>{withSuspense(<Gym />)}</DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/analytics" element={<ProtectedRoute><DashboardLayout>{withSuspense(<Analytics />)}</DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/weeklyreport" element={<ProtectedRoute><DashboardLayout>{withSuspense(<WeeklyReport />)}</DashboardLayout></ProtectedRoute>} />
        <Route path="/dashboard/weeklyreview" element={<ProtectedRoute><Navigate to="/dashboard/weeklyreport" replace /></ProtectedRoute>} />
        <Route path="/dashboard/ai_coach" element={<ProtectedRoute><Navigate to="/dashboard/ai_guru" replace /></ProtectedRoute>} />
        <Route path="/dashboard/ai_guru" element={<ProtectedRoute><DashboardLayout>{withSuspense(<AIGuru />)}</DashboardLayout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
