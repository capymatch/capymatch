import { useState } from "react";
import { Eye, EyeOff, Loader2, ChevronLeft, CheckCircle, Lock } from "lucide-react";
import api from "../lib/api";

export default function LoginPage({ onAuth, defaultMode = "login" }) {
  const [mode, setMode] = useState(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleGoogle = () => {
    const redirectUrl = window.location.origin + '/board';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
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
      const detail = err?.response?.data?.detail;
      if (detail) {
        setError(typeof detail === "string" ? detail : JSON.stringify(detail));
      } else if (err?.response?.status) {
        setError(`Server error (${err.response.status}). Please try again.`);
      } else if (err?.message?.includes("Network")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#f7f7f7" }} data-testid="login-page">
      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/images/capymatch-logo-new.png"
            alt="CapyMatch"
            className="h-28 max-w-[100px] sm:max-w-none sm:h-28 object-contain"
            data-testid="login-logo"
          />
        </div>

        {/* Headline */}
        <div className="text-center mb-9">
          <h1 className="text-2xl font-bold text-gray-950 mb-1.5" data-testid="login-headline">
            {forgotMode ? "Reset your password" : isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-lg font-medium text-gray-500">
            {forgotMode
              ? "We'll send you a reset link"
              : isLogin
              ? "Log in to CapyMatch"
              : "Sign up for CapyMatch"}
          </p>
          {!forgotMode && (
            <p className="text-xs text-gray-500 mt-3">
              Free forever for your first 5 schools &bull; No card needed
            </p>
          )}
        </div>

        {/* Forgot Password Flow */}
        {forgotMode ? (
          <div data-testid="forgot-password-form">
            {forgotSent ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-teal-600" />
                <h3 className="text-base font-semibold text-gray-900 mb-2">Check your email</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
                  If an account exists for <span className="font-medium text-gray-700">{forgotEmail}</span>, we've sent a password reset link. It expires in 1 hour.
                </p>
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setForgotSent(false); }}
                  className="mt-6 flex items-center gap-1.5 mx-auto text-sm font-semibold text-teal-700 hover:text-teal-800 hover:underline transition-colors"
                  data-testid="back-to-login-btn"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-gray-500 text-center leading-relaxed mb-2">
                  Enter your email and we'll send you a reset link.
                </p>
                <div>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    data-testid="forgot-email-input"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all bg-white"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  data-testid="forgot-submit-btn"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 hover:shadow-md active:scale-[0.99]"
                  style={{ backgroundColor: "#1a8a80" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#14736a"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "#1a8a80"}
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:underline transition-colors"
                  data-testid="back-to-login-from-forgot"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to sign in
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {!isLogin && (
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    data-testid="register-name-input"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all bg-white"
                  />
                )}

                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all bg-white"
                />

                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="login-password-input"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    data-testid="toggle-password-visibility"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Secure login + Forgot — extra top spacing */}
              {isLogin && (
                <div className="flex items-center justify-between mt-5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Lock className="w-3 h-3" /> Secure login
                  </span>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotSent(false); }}
                    className="text-sm font-semibold transition-colors"
                    style={{ color: "#0f5f58" }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = "underline"; e.currentTarget.style.color = "#0a4f49"; }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = "none"; e.currentTarget.style.color = "#0f5f58"; }}
                    data-testid="forgot-password-link"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg mt-4" data-testid="auth-error-msg">{error}</p>
              )}

              {/* Buttons */}
              <div className="mt-6 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  data-testid="auth-submit-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 hover:shadow-md active:scale-[0.99]"
                  style={{ backgroundColor: "#1a8a80" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#14736a"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "#1a8a80"}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isLogin ? "Log In" : "Create Account"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode(isLogin ? "register" : "login"); setError(""); }}
                  data-testid={isLogin ? "switch-to-register" : "switch-to-login"}
                  className="w-full flex items-center justify-center py-3 rounded-lg text-sm font-semibold transition-all active:scale-[0.99]"
                  style={{ color: "#1a8a80", borderWidth: "1.5px", borderStyle: "solid", borderColor: "#1a8a80", backgroundColor: "transparent" }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#1a8a80"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#1a8a80"; }}
                >
                  {isLogin ? "New to CapyMatch? Create your free account" : "Already have an account? Log in"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          By signing in, you agree to our{" "}
          <button className="text-gray-500 underline decoration-gray-300 hover:text-gray-700 hover:decoration-gray-500 transition-colors">Terms</button>
          {" "}&amp;{" "}
          <button className="text-gray-500 underline decoration-gray-300 hover:text-gray-700 hover:decoration-gray-500 transition-colors">Privacy Policy</button>
        </p>
      </div>
    </div>
  );
}
