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
      setError(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#f7f7f7" }} data-testid="login-page">
      <div className="w-full max-w-[440px]">
        {/* Logo — scales on mobile */}
        <div className="flex justify-center mb-6">
          <img
            src="/images/capymatch-logo-new.png"
            alt="CapyMatch"
            className="h-28 max-w-[100px] sm:max-w-none sm:h-28 object-contain"
            data-testid="login-logo"
          />
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1" data-testid="login-headline">
            {forgotMode ? "Reset your password" : isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-base text-gray-500">
            {forgotMode
              ? "We'll send you a reset link"
              : isLogin
              ? "Log in to your CapyMatch account"
              : "Sign up for your CapyMatch account"}
          </p>
          {!forgotMode && (
            <p className="text-sm text-gray-400 mt-1.5">
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 hover:brightness-110"
                  style={{ backgroundColor: "#2ec4b6" }}
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
            {/* Google Button */}
            <button
              onClick={handleGoogle}
              data-testid="google-login-btn"
              className="w-full flex items-center justify-center gap-3 font-medium py-2.5 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all text-gray-700 text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            {/* Separator — extra breathing room */}
            <div className="flex items-center gap-3 my-7">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm text-gray-400 whitespace-nowrap">
                {isLogin ? "Or log in with email" : "Or sign up with email"}
              </span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    data-testid="register-name-input"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all bg-white"
                  />
                </div>
              )}

              <div>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all bg-white"
                />
              </div>

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

              {isLogin && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Lock className="w-3 h-3" /> Secure login
                  </span>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotSent(false); }}
                    className="text-sm text-teal-700 hover:text-teal-800 font-semibold hover:underline transition-colors"
                    data-testid="forgot-password-link"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg" data-testid="auth-error-msg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-btn"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 hover:shadow-md active:scale-[0.99]"
                style={{ backgroundColor: "#2ec4b6" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "#27b0a3"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "#2ec4b6"}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isLogin ? "Log In" : "Create Account"
                )}
              </button>

              {/* Toggle — full-width outlined button */}
              <button
                type="button"
                onClick={() => { setMode(isLogin ? "register" : "login"); setError(""); }}
                data-testid={isLogin ? "switch-to-register" : "switch-to-login"}
                className="w-full flex items-center justify-center py-2.5 rounded-lg text-sm font-semibold border transition-all hover:shadow-sm active:scale-[0.99]"
                style={{ color: "#2ec4b6", borderColor: "#2ec4b6" }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(46,196,182,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {isLogin ? "New to CapyMatch? Create your free account" : "Already have an account? Log in"}
              </button>
            </form>
          </>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          By signing in, you agree to our{" "}
          <button className="text-gray-500 underline decoration-gray-300 hover:text-gray-700 hover:decoration-gray-500 transition-colors">Terms</button>
          {" "}&amp;{" "}
          <button className="text-gray-500 underline decoration-gray-300 hover:text-gray-700 hover:decoration-gray-500 transition-colors">Privacy Policy</button>
        </p>
      </div>
    </div>
  );
}
