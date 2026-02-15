import { useState } from "react";
import { Activity, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import api from "../lib/api";

export default function LoginPage({ onAuth }) {
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = () => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login";
      const payload = mode === "register" ? { name, email, password } : { email, password };
      const res = await api.post(endpoint, payload);
      onAuth(res.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)" }}
      data-testid="login-page"
    >
      <div className="max-w-md w-full">
        <div
          className="rounded-2xl p-8 shadow-2xl border border-white/10"
          style={{ backgroundColor: "rgba(30, 30, 50, 0.85)", backdropFilter: "blur(20px)" }}
        >
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-gradient-to-br from-pink-600 to-rose-700 shadow-lg shadow-pink-900/40">
            <Activity className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white text-center mb-1" data-testid="login-title">
            Recruiting HQ
          </h1>
          <p className="text-white/50 text-sm text-center mb-6">
            {mode === "register" ? "Create your account to get started" : "Sign in to your recruiting dashboard"}
          </p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            data-testid="google-login-btn"
            className="w-full flex items-center justify-center gap-3 font-medium py-2.5 px-4 rounded-xl border border-white/15 transition-all duration-200 hover:bg-white/10 bg-white/5 text-white text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="register-name-input"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 border border-white/10 focus:border-pink-500/50 focus:outline-none transition-colors"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email-input"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 border border-white/10 focus:border-pink-500/50 focus:outline-none transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            />
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                data-testid="login-password-input"
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 border border-white/10 focus:border-pink-500/50 focus:outline-none transition-colors pr-10"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                data-testid="toggle-password-visibility"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-rose-400 text-xs px-1" data-testid="auth-error-msg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="auth-submit-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-lg shadow-pink-900/30 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "register" ? "Create Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm mt-5 text-white/40">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => { setMode("register"); setError(""); }} className="text-pink-400 hover:text-pink-300 font-medium transition-colors" data-testid="switch-to-register">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => { setMode("login"); setError(""); }} className="text-pink-400 hover:text-pink-300 font-medium transition-colors" data-testid="switch-to-login">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
