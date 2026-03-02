import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./lib/theme";
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import LoginPage from "./pages/LoginPage";
import { Toaster } from "./components/ui/sonner";
import { SubscriptionProvider, useSubscription } from "./lib/subscription";
import { onSubscriptionError, onAuthFail } from "./lib/api";
import UpgradeModal from "./components/UpgradeModal";

// Lazy-loaded pages — only downloaded when navigated to
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/AdminUserDetail"));
const AdminUniversities = lazy(() => import("./pages/AdminUniversities"));
const AdminSubscriptions = lazy(() => import("./pages/AdminSubscriptions"));
const AdminIntegrations = lazy(() => import("./pages/AdminIntegrations"));
const AdminContributions = lazy(() => import("./pages/AdminContributions"));
const AdminImportAnalytics = lazy(() => import("./pages/AdminImportAnalytics"));
const OutreachAnalysis = lazy(() => import("./pages/OutreachAnalysis"));
const HighlightAdvisor = lazy(() => import("./pages/HighlightAdvisor"));
const RecruitingBoard = lazy(() => import("./pages/RecruitingBoard"));
const RecruitingJourney = lazy(() => import("./pages/RecruitingJourney"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const UniversityKnowledgeBase = lazy(() => import("./pages/UniversityKnowledgeBase"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProgramDetail = lazy(() => import("./pages/ProgramDetail"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const PublicSchedule = lazy(() => import("./pages/PublicSchedule"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AthleteProfileQuiz = lazy(() => import("./pages/AthleteProfileQuiz"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const SchoolInfoPage = lazy(() => import("./pages/SchoolInfoPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
import InstallPrompt from "./components/InstallPrompt";
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

    // Use the shared api instance (same URL as login/register — works on all domains)
    const exchangeSession = (retries = 3) => {
      const attempt = 4 - retries;
      console.log(`[OAuth] Exchange attempt ${attempt}`);
      api.post("/auth/session", { session_id: sessionId })
        .then(res => {
          console.log("[OAuth] Success:", res.data?.email);
          onAuth(res.data);
          navigate("/board", { replace: true });
        })
        .catch(err => {
          const status = err?.response?.status;
          const detail = err?.response?.data?.detail || err?.message || "Unknown error";
          console.error(`[OAuth] Error: ${status} ${detail}`);
          if (retries > 0 && (!status || status === 401 || status >= 500)) {
            setTimeout(() => exchangeSession(retries - 1), 2000);
            return;
          }
          setStatus("error");
          setErrorMsg(detail);
          setTimeout(() => navigate("/login", { replace: true }), 5000);
        });
    };

    // Small delay for session data propagation
    setTimeout(() => exchangeSession(), 500);
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
          <div className="text-white/30 text-xs mt-2">Redirecting...</div>
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

// Lightweight loading fallback for lazy routes
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen" style={{ backgroundColor: "#1a1a2e" }}>
    <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Error boundary for lazy loading failures
class ChunkErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) {
    // If chunk fails to load, reload the page once
    if (error?.name === 'ChunkLoadError' || error?.message?.includes('Loading chunk')) {
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-3" style={{ backgroundColor: "#1a1a2e" }}>
          <p className="text-white/60 text-sm">Something went wrong loading the page.</p>
          <button onClick={() => window.location.reload()} className="text-teal-500 text-sm underline">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuthedRoutes({ user, onAuth, onLogout }) {
  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/s/:shortId" element={<PublicSchedule />} />
      <Route path="/schedule/:tenantId" element={<PublicSchedule />} />
      <Route path="/card/:slug" element={<PublicProfile />} />
      <Route path="/p/:slug" element={<PublicProfile />} />
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
        <Route path="terms" element={<TermsOfServicePage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="payment-success" element={<PaymentSuccess />} />
        <Route path="billing" element={<BillingPage />} />
      </Route>
      <Route path="/admin" element={user?.email === "douglas@yeslms.com" ? <AdminLayout /> : <Navigate to="/board" replace />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="integrations" element={<AdminIntegrations />} />
        <Route path="contributions" element={<AdminContributions />} />
        <Route path="universities" element={<AdminUniversities />} />
        <Route path="analytics" element={<AdminImportAnalytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/board" replace />} />
    </Routes>
    </Suspense>
    </ChunkErrorBoundary>
  );
}

function UnauthRoutes({ onAuth }) {
  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/s/:shortId" element={<PublicSchedule />} />
      <Route path="/schedule/:tenantId" element={<PublicSchedule />} />
      <Route path="/login" element={<LoginPage onAuth={onAuth} />} />
      <Route path="/signup" element={<LoginPage onAuth={onAuth} defaultMode="register" />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/card/:slug" element={<PublicProfile />} />
      <Route path="/p/:slug" element={<PublicProfile />} />
      <Route path="/welcome" element={<LandingPage />} />
      {/* Handle OAuth callback — session_id arrives in URL hash fragment */}
      <Route path="/" element={<OAuthCallbackGate onAuth={onAuth} />} />
      <Route path="/board" element={<OAuthCallbackGate onAuth={onAuth} />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </Suspense>
    </ChunkErrorBoundary>
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
        message={upgradeInfo?.message}
        currentTier={subscription?.tier || "basic"}
      />
    </>
  );
}

function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not authed

  const handleAuth = useCallback((userData) => {
    if (userData?.session_token) {
      localStorage.setItem("session_token", userData.session_token);
    }
    setUser(userData);
  }, []);

  const handleLogout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("session_token");
    setUser(null);
  }, []);

  // Register auth fail handler for session expiry
  useEffect(() => {
    onAuthFail(() => {
      localStorage.removeItem("session_token");
      setUser(null);
    });
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
      <InstallPrompt />
    </ThemeProvider>
  );
}

export default App;
