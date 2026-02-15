import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { useState, useEffect, useCallback } from "react";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminUserDetail from "./pages/AdminUserDetail";
import AdminUniversities from "./pages/AdminUniversities";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminIntegrations from "./pages/AdminIntegrations";
import OutreachAnalysis from "./pages/OutreachAnalysis";
import HighlightAdvisor from "./pages/HighlightAdvisor";
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
import PaymentSuccess from "./pages/PaymentSuccess";
import LoginPage from "./pages/LoginPage";
import { Toaster } from "./components/ui/sonner";
import { SubscriptionProvider, useSubscription } from "./lib/subscription";
import { onSubscriptionError } from "./lib/api";
import UpgradeModal from "./components/UpgradeModal";
import api from "./lib/api";
import "./App.css";

/* Google OAuth callback handler */
function OAuthCallback({ onAuth }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) { navigate("/login", { replace: true }); return; }
    api.post("/auth/session", { session_id: sessionId })
      .then(res => { onAuth(res.data); navigate("/board", { replace: true }); })
      .catch(() => navigate("/login", { replace: true }));
  }, [searchParams, navigate, onAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}>
      <div className="text-white/60 text-sm">Signing you in...</div>
    </div>
  );
}

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

function AppRouter({ user, onAuth, onLogout }) {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/s/:shortId" element={<PublicSchedule />} />
      <Route path="/schedule/:tenantId" element={<PublicSchedule />} />
      <Route path="/login" element={user ? <Navigate to="/board" replace /> : <LoginPage onAuth={onAuth} />} />

      {/* OAuth callback — works whether or not already logged in */}
      <Route path="/" element={
        /* If URL has session_id param, handle OAuth callback */
        window.location.search.includes("session_id")
          ? <OAuthCallback onAuth={onAuth} />
          : user
            ? <OnboardingGate><Layout user={user} onLogout={onLogout} /></OnboardingGate>
            : <Navigate to="/login" replace />
      }>
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
        <Route path="outreach-analysis" element={<OutreachAnalysis />} />
        <Route path="highlight-advisor" element={<HighlightAdvisor />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="payment-success" element={<PaymentSuccess />} />
      </Route>
      <Route path="/onboarding" element={user ? <AthleteProfileQuiz /> : <Navigate to="/login" replace />} />
      <Route path="/admin" element={user ? <AdminLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="integrations" element={<AdminIntegrations />} />
        <Route path="universities" element={<AdminUniversities />} />
      </Route>
      {/* Catch all */}
      <Route path="*" element={<Navigate to={user ? "/board" : "/login"} replace />} />
    </Routes>
  );
}

function SubscriptionGuard({ children }) {
  const { subscription, refresh } = useSubscription();
  const [upgradeInfo, setUpgradeInfo] = useState(null);

  useEffect(() => {
    onSubscriptionError((detail) => {
      setUpgradeInfo(detail);
      refresh();
    });
  }, [refresh]);

  return (
    <>
      {children}
      <UpgradeModal
        isOpen={!!upgradeInfo}
        onClose={() => setUpgradeInfo(null)}
        feature={upgradeInfo?.feature}
        currentTier={subscription?.tier || "basic"}
      />
    </>
  );
}

function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not authed

  const handleAuth = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
  }, []);

  // Check session on mount
  useEffect(() => {
    api.get("/auth/me")
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  // Show nothing while checking auth
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}>
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <SubscriptionProvider>
        <SubscriptionGuard>
          <BrowserRouter>
            <AppRouter user={user} onAuth={handleAuth} onLogout={handleLogout} />
          </BrowserRouter>
        </SubscriptionGuard>
      </SubscriptionProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}

export default App;
