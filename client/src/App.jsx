import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingpage/LandingPage";
import DemoLogin from "./pages/landingpage/demologin";
import About from "./pages/landingpage/about";
import Features from "./pages/landingpage/features";
import Login from "./pages/authentication/Login";
import SignUp from "./pages/authentication/SignUp";
import DashboardLayout from "./dashboard/DashboardLayout";
import Overview from "./dashboard/overview/Overview";
import Journal from "./dashboard/journal/Journal";
import Todo from "./dashboard/todo/Todo";
import Habits from "./dashboard/habits/Habits";
import Goal from "./dashboard/goal/Goal";
import Gym from "./dashboard/gym/Gym";
import Analytics from "./dashboard/analysis/Analytics";
import WeeklyReport from "./dashboard/weeklyreport/WeeklyReport";
import AIGuru from "./dashboard/ai_guru/AIGuru";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/demo-login" element={<DemoLogin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* Dashboard Routes with Fixed Layout */}
        <Route path="/dashboard" element={<Overview />} />
        <Route path="/dashboard/journal" element={<DashboardLayout><Journal /></DashboardLayout>} />
        <Route path="/dashboard/todo" element={<DashboardLayout><Todo /></DashboardLayout>} />
        <Route path="/dashboard/habit" element={<DashboardLayout><Habits /></DashboardLayout>} />
        <Route path="/dashboard/goal" element={<DashboardLayout><Goal /></DashboardLayout>} />
        <Route path="/dashboard/gym" element={<DashboardLayout><Gym /></DashboardLayout>} />
        <Route path="/dashboard/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
        <Route path="/dashboard/weeklyreport" element={<DashboardLayout><WeeklyReport /></DashboardLayout>} />
        <Route path="/dashboard/weeklyreview" element={<Navigate to="/dashboard/weeklyreport" replace />} />
        <Route path="/dashboard/ai_coach" element={<Navigate to="/dashboard/ai_guru" replace />} />
        <Route path="/dashboard/ai_guru" element={<DashboardLayout><AIGuru /></DashboardLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
