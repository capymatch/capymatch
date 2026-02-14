import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { useState, useEffect } from "react";
import Layout from "./components/Layout";
import RecruitingBoard from "./pages/RecruitingBoard";
import RecruitingJourney from "./pages/RecruitingJourney";
import UniversityKnowledgeBase from "./pages/UniversityKnowledgeBase";
import Dashboard from "./pages/Dashboard";
import NeedsFollowUp from "./pages/NeedsFollowUp";
import ProgramDetail from "./pages/ProgramDetail";
import Inbox from "./pages/Inbox";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/SettingsPage";
import CalendarPage from "./pages/CalendarPage";
import PublicSchedule from "./pages/PublicSchedule";
import ProfilePage from "./pages/ProfilePage";
import AthleteProfileQuiz from "./pages/AthleteProfileQuiz";
import { Toaster } from "./components/ui/sonner";
import api from "./lib/api";
import "./App.css";

// Auth bypassed: static user for public access
const PUBLIC_USER = { user_id: "user_public_default", name: "Athlete", email: "athlete@recruitinghq.app", picture: "" };

function OnboardingGate({ children }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get("/recruiting-profile").then(res => {
      if (cancelled) return;
      if (!res.data?.questionnaire_completed) {
        navigate("/onboarding", { replace: true });
      } else {
        setChecked(true);
      }
    }).catch(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, [navigate]);

  if (!checked) return null;
  return children;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/s/:shortId" element={<PublicSchedule />} />
      <Route path="/schedule/:tenantId" element={<PublicSchedule />} />
      <Route path="/onboarding" element={<AthleteProfileQuiz />} />
      <Route path="/" element={<OnboardingGate><Layout user={PUBLIC_USER} /></OnboardingGate>}>
        <Route index element={<Navigate to="/board" replace />} />
        <Route path="board" element={<Dashboard />} />
        <Route path="pipeline" element={<RecruitingBoard />} />
        <Route path="journey/:programId" element={<RecruitingJourney />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="knowledge-base" element={<UniversityKnowledgeBase />} />
        <Route path="follow-ups" element={<NeedsFollowUp />} />
        <Route path="programs/:programId" element={<ProgramDetail />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/login" element={<Navigate to="/board" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}

export default App;
