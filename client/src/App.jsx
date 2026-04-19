import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/landingpage/LandingPage";
import Login from "./pages/authentication/Login";
import SignUp from "./pages/authentication/SignUp";
import DashboardLayout from "./dashboard/DashboardLayout";
import Overview from "./dashboard/overview/Overview";
import Journal from "./dashboard/journal/Journal";
import Todo from "./dashboard/todo/Todo";
import Habits from "./dashboard/habits/Habits";
import Goal from "./dashboard/goal/Goal";
import Gym from "./dashboard/gym/Gym";
import Analytics from "./dashboard/analytics/Analytics";
import WeeklyReview from "./dashboard/weeklyreview/WeeklyReview";
import AICoach from "./dashboard/ai_coach/AICoach";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
        <Route path="/dashboard/weeklyreview" element={<DashboardLayout><WeeklyReview /></DashboardLayout>} />
        <Route path="/dashboard/ai_coach" element={<DashboardLayout><AICoach /></DashboardLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
