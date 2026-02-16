import { useState } from "react";
import { Sparkles, User, Lock, Eye, EyeOff, Loader2, Mail, Compass, ArrowRight, Zap } from "lucide-react";
import api from "../lib/api";

const BANNER_IMG = "https://static.prod-images.emergentagent.com/jobs/9e6ea980-8158-4981-b7bd-5e0116513214/images/f7dc0782833b6c45f432631fe3a1b15f484365361d0515f6847bd9b496686c2d.png";

export default function LoginPage({ onAuth }) {
  const [mode, setMode] = useState("login");
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: "#edf0f7" }} data-testid="login-page">
      <div className="w-full max-w-[960px] flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

        {/* ── Left: Marketing Copy ── */}
        <div className="flex-1 max-w-md lg:max-w-[420px]">
          <h1 className="text-3xl sm:text-4xl font-bold italic text-gray-900 leading-tight mb-4 whitespace-nowrap" data-testid="login-headline">
            Everything in one place.
          </h1>
          <p className="text-gray-500 text-[15px] leading-relaxed mb-8">
            Track schools, coach responses, and next actions—without spreadsheets or missed follow-ups.
          </p>

          <div className="space-y-6">
            <div className="flex gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Compass className="w-[18px] h-[18px] text-rose-700" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">College Tracker</h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">Keep every school's status, notes, and next step in one place.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-[18px] h-[18px] text-rose-700" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">Recruiting Journey</h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">A guided action plan for each school — know exactly what to do next and when.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-[18px] h-[18px] text-rose-700" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">AI-Powered Outreach</h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">Draft personalized coach emails, get engagement insights, and highlight reel advice — all powered by AI.</p>
              </div>
            </div>

            <div className="flex gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Eye className="w-[18px] h-[18px] text-rose-700" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">Coach Watch Alerts</h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">Get notified when news could affect your outreach timing.</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-8 leading-relaxed">
            Used by families navigating high-visibility recruiting seasons.
          </p>
        </div>

        {/* ── Right: Login Card ── */}
        <div className="w-full max-w-[420px] rounded-2xl overflow-hidden shadow-xl bg-white" data-testid="login-card">
          {/* Purple Banner */}
          <div className="relative h-[160px] overflow-hidden" style={{ background: "linear-gradient(135deg, #6b1530 0%, #8b2252 40%, #a83262 100%)" }}>
            <img src={BANNER_IMG} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-soft-light opacity-70" />
            <div className="relative z-10 p-6 pb-4 flex flex-col justify-end h-full">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-white/80" />
                <span className="text-white/90 text-sm font-medium">Recruiting HQ</span>
              </div>
              <h2 className="text-[28px] font-bold text-white leading-tight">
                {mode === "login" ? "Welcome back" : "Get started"}
              </h2>
              <p className="text-white/75 text-sm mt-1">
                {mode === "login" ? "Log in to your Recruiting HQ" : "Create your Recruiting HQ account"}
              </p>
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 pt-5">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "register" && (
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    data-testid="register-name-input"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-pink-600 focus:ring-1 focus:ring-pink-600/20 focus:outline-none transition-colors bg-white"
                  />
                </div>
              )}
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-pink-600 focus:ring-1 focus:ring-pink-600/20 focus:outline-none transition-colors bg-white"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="login-password-input"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-pink-600 focus:ring-1 focus:ring-pink-600/20 focus:outline-none transition-colors bg-white"
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

              {mode === "login" && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 accent-pink-700" />
                    <span className="text-[13px]">Remember me</span>
                  </label>
                  <button type="button" className="text-[13px] text-pink-700 hover:text-pink-800 font-medium transition-colors">
                    Forgot password?
                  </button>
                </div>
              )}

              {error && (
                <p className="text-rose-600 text-xs px-1" data-testid="auth-error-msg">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="auth-submit-btn"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #6b1530 0%, #a83262 50%, #d4577e 100%)" }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === "register" ? "Create Account" : "Sign In"}
                  </>
                )}
              </button>
            </form>

            {/* Toggle mode divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[13px] text-gray-500 whitespace-nowrap">
                {mode === "login" ? (
                  <>New here?{" "}<button onClick={() => { setMode("register"); setError(""); }} className="text-pink-700 hover:text-pink-800 font-semibold transition-colors" data-testid="switch-to-register">Create an account</button></>
                ) : (
                  <>Already a member?{" "}<button onClick={() => { setMode("login"); setError(""); }} className="text-pink-700 hover:text-pink-800 font-semibold transition-colors" data-testid="switch-to-login">Sign in</button></>
                )}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              data-testid="google-login-btn"
              className="w-full flex items-center justify-center gap-3 font-medium py-2.5 px-4 rounded-full border border-gray-200 transition-all duration-200 hover:bg-gray-50 bg-white text-gray-700 text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-[11px] text-gray-400 mt-4">
              By logging in, you agree to <button className="text-pink-700 hover:underline">Terms</button> & <button className="text-pink-700 hover:underline">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
