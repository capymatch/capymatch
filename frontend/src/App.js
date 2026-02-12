import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import api from "./lib/api";
import { ThemeProvider } from "./lib/theme";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RecruitingBoard from "./pages/RecruitingBoard";
import UniversityKnowledgeBase from "./pages/UniversityKnowledgeBase";
import Dashboard from "./pages/Dashboard";
import NeedsFollowUp from "./pages/NeedsFollowUp";
import ProgramDetail from "./pages/ProgramDetail";
import { Toaster } from "./components/ui/sonner";
import "./App.css";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    api.post("/auth/session", { session_id: sessionId })
      .then((res) => {
        navigate("/", { replace: true, state: { user: res.data } });
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f5f5f7]">
      <div className="text-gray-400 text-lg">Signing in...</div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const [authState, setAuthState] = useState(null); // null=checking, true/false
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.user) {
      setUser(location.state.user);
      setAuthState(true);
      return;
    }
    api.get("/auth/me")
      .then((res) => { setUser(res.data); setAuthState(true); })
      .catch(() => { setAuthState(false); navigate("/login", { replace: true }); });
  }, [navigate, location.state]);

  if (authState === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f5f7]">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }
  if (authState === false) return null;
  return children(user);
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          {(user) => <Layout user={user} />}
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="board" element={<RecruitingBoard />} />
        <Route path="knowledge-base" element={<UniversityKnowledgeBase />} />
        <Route path="follow-ups" element={<NeedsFollowUp />} />
        <Route path="programs/:programId" element={<ProgramDetail />} />
      </Route>
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
