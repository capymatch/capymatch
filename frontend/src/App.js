import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import { useState, useEffect, useCallback, useRef } from "react";
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
import ComparePage from "./pages/ComparePage";
import UniversityKnowledgeBase from "./pages/UniversityKnowledgeBase";
import Dashboard from "./pages/Dashboard";
// Tasks/follow-ups feature removed
import ProgramDetail from "./pages/ProgramDetail";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/SettingsPage";
import AccountPage from "./pages/AccountPage";
import CalendarPage from "./pages/CalendarPage";
import PublicSchedule from "./pages/PublicSchedule";
import ProfilePage from "./pages/ProfilePage";
import AthleteProfileQuiz from "./pages/AthleteProfileQuiz";
import PaymentSuccess from "./pages/PaymentSuccess";
import SchoolInfoPage from "./pages/SchoolInfoPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import { Toaster } from "./components/ui/sonner";
import { SubscriptionProvider, useSubscription } from "./lib/subscription";
import { onSubscriptionError, onAuthFail } from "./lib/api";
import UpgradeModal from "./components/UpgradeModal";
import api from "./lib/api";
import "./App.css";

/* Google OAuth callback handler */
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function OAuthCallback({ onAuth }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    // session_id comes in the URL hash fragment: #session_id=xxx
    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? match[1] : null;

    console.log("[OAuth] Callback fired, hash:", hash);
    console.log("[OAuth] session_id:", sessionId ? sessionId.substring(0, 8) + "..." : "MISSING");

    if (!sessionId) {
      setStatus("error");
      setErrorMsg("No session ID received from Google. Please try again.");
      setTimeout(() => navigate("/login", { replace: true }), 2000);
      return;
    }

    setStatus("loading");
    const API_BASE = process.env.REACT_APP_BACKEND_URL + "/api";

    // Session exchange with retry (session data may take a moment to propagate)
    const exchangeSession = (retries = 2) => {
      fetch(`${API_BASE}/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then(async res => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const errMsg = data?.detail || `Auth failed (${res.status})`;
            // Retry on 401/503 (session may still be propagating)
            if (retries > 0 && (res.status === 401 || res.status === 503 || res.status >= 500)) {
              console.log(`[OAuth] Retrying session exchange (${retries} left)...`);
              setTimeout(() => exchangeSession(retries - 1), 1500);
              return null;
            }
            throw new Error(errMsg);
          }
          return res.json();
        })
        .then(data => {
          if (!data) return; // retry in progress
          console.log("[OAuth] Session exchange successful for:", data?.email);
          onAuth(data);
          navigate("/board", { replace: true });
        })
        .catch(err => {
          console.error("[OAuth] Session exchange failed:", err?.message);
          setStatus("error");
          setErrorMsg(err?.message || "Authentication failed. Please try again.");
          setTimeout(() => navigate("/login", { replace: true }), 3000);
        });
    };

    exchangeSession();
  }, [navigate, onAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}>
      {status === "loading" && (
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-white/60 text-sm">Signing you in...</div>
        </div>
      )}
      {status === "error" && (
        <div className="text-center max-w-sm px-4">
          <div className="text-red-400 text-sm font-medium mb-2">Sign-in failed</div>
          <div className="text-white/50 text-xs mb-3">{errorMsg}</div>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="text-teal-600 text-xs underline hover:text-slate-300"
          >
            Back to login
          </button>
          <div className="text-white/30 text-xs mt-2">Auto-redirecting in 3s...</div>
        </div>
      )}
    </div>
  );
}

function OnboardingGate({ children }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;

    const checkProfile = () => {
      api.get("/recruiting-profile").then(res => {
        if (cancelled) return;
        if (!res.data?.questionnaire_completed) {
          navigate("/onboarding", { replace: true });
        } else {
          setChecked(true);
        }
      }).catch(() => {
        if (cancelled) return;
        // Retry once after a short delay (handles OAuth session timing)
        if (retries < 1) {
          retries++;
          setTimeout(checkProfile, 1000);
        } else {
          // After retry, redirect to onboarding as safe default
          navigate("/onboarding", { replace: true });
        }
      });
    };

    checkProfile();
    return () => { cancelled = true; };
  }, [navigate]);

  if (!checked) return null;
  return children;
}

function AuthedRoutes({ user, onAuth, onLogout }) {
  return (
    <Routes>
      <Route path="/s/:shortId" element={<PublicSchedule />} />
      <Route path="/schedule/:tenantId" element={<PublicSchedule />} />
      <Route path="/login" element={<Navigate to="/board" replace />} />
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/onboarding" element={<AthleteProfileQuiz />} />
      <Route path="/" element={<OnboardingGate><Layout user={user} onLogout={onLogout} /></OnboardingGate>}>
        <Route index element={<Navigate to="/board" replace />} />
        <Route path="board" element={<Dashboard />} />
        <Route path="pipeline" element={<RecruitingBoard />} />
        <Route path="journey/:programId" element={<RecruitingJourney />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="knowledge-base" element={<UniversityKnowledgeBase />} />
        <Route path="school/:domain" element={<SchoolInfoPage />} />
        <Route path="programs/:programId" element={<ProgramDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="outreach-analysis" element={<OutreachAnalysis />} />
        <Route path="highlight-advisor" element={<HighlightAdvisor />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="payment-success" element={<PaymentSuccess />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="integrations" element={<AdminIntegrations />} />
        <Route path="universities" element={<AdminUniversities />} />
      </Route>
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Routes>
  );
}

function UnauthRoutes({ onAuth }) {
  return (
    <Routes>
      <Route path="/s/:shortId" element={<PublicSchedule />} />
      <Route path="/schedule/:tenantId" element={<PublicSchedule />} />
      <Route path="/login" element={<LoginPage onAuth={onAuth} />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/welcome" element={<LandingPage />} />
      {/* Handle OAuth callback — session_id arrives in URL hash fragment */}
      <Route path="/" element={<OAuthCallbackGate onAuth={onAuth} />} />
      <Route path="/board" element={<OAuthCallbackGate onAuth={onAuth} />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

/* Detect session_id in hash synchronously during render (not in useEffect) */
function OAuthCallbackGate({ onAuth }) {
  if (window.location.hash?.includes("session_id=")) {
    return <OAuthCallback onAuth={onAuth} />;
  }
  return <Navigate to="/login" replace />;
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

  // Register auth fail handler for session expiry
  useEffect(() => {
    onAuthFail(() => setUser(null));
  }, []);

  // Check session on mount
  useEffect(() => {
    // If URL has session_id in hash fragment, let the OAuth callback handle it
    if (window.location.hash?.includes("session_id")) {
      setUser(null);
      return;
    }
    api.get("/auth/me")
      .then(res => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  // Loading state
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a2e" }}>
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      {user ? (
        <SubscriptionProvider>
          <SubscriptionGuard>
            <BrowserRouter>
              <AuthedRoutes user={user} onAuth={handleAuth} onLogout={handleLogout} />
            </BrowserRouter>
          </SubscriptionGuard>
        </SubscriptionProvider>
      ) : (
        <BrowserRouter>
          <UnauthRoutes onAuth={handleAuth} />
        </BrowserRouter>
      )}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}

export default App;
