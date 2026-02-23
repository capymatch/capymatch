import { useState } from "react";
import { User, Lock, Eye, EyeOff, Loader2, Mail, ChevronLeft, CheckCircle } from "lucide-react";
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

  const title = forgotMode
    ? "Reset your password"
    : mode === "login"
    ? "Log in to your account"
    : "Create your account";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#f7f7f7" }} data-testid="login-page">
      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/images/capymatch-logo-new.png"
            alt="CapyMatch"
            className="h-12 object-contain"
            data-testid="login-logo"
          />
        </div>

        {/* Headline */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1" data-testid="login-headline">
            Your recruiting journey.
          </h1>
          <p className="text-lg text-gray-500">{title}</p>
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
                  className="mt-6 flex items-center gap-1.5 mx-auto text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="Enter your email address..."
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    data-testid="forgot-email-input"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all bg-white"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  data-testid="forgot-submit-btn"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  data-testid="back-to-login-from-forgot"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to sign in
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* ── Log in with ── */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm text-gray-500 whitespace-nowrap">Log in with</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Social Buttons */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleGoogle}
                data-testid="google-login-btn"
                className="flex flex-col items-center justify-center gap-2 w-[140px] h-[80px] rounded-lg border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>
            </div>

            {/* ── or continue with ── */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm text-gray-500 whitespace-nowrap">or continue with</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    data-testid="register-name-input"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all bg-white"
                />
                {mode === "register" && (
                  <p className="text-xs text-gray-400 mt-1.5">Use a personal or family email to get started</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder={mode === "register" ? "Create a password (6+ characters)" : "Enter your password..."}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="login-password-input"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all bg-white"
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

              {mode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotSent(false); }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  mode === "register" ? "Continue" : "Continue"
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <p className="text-center text-sm text-gray-500 mt-5">
              {mode === "login" ? (
                <>Don't have an account?{" "}
                  <button
                    onClick={() => { setMode("register"); setError(""); }}
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    data-testid="switch-to-register"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button
                    onClick={() => { setMode("login"); setError(""); }}
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    data-testid="switch-to-login"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </>
        )}

        {/* Terms */}
        <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
          By continuing, you acknowledge that you understand<br />
          and agree to the{" "}
          <button className="text-gray-500 underline hover:text-gray-700 transition-colors">Terms & Conditions</button>
          {" "}and{" "}
          <button className="text-gray-500 underline hover:text-gray-700 transition-colors">Privacy Policy</button>
        </p>
      </div>
    </div>
  );
}
