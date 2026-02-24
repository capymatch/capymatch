import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import api from "../lib/api";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.detail || "Reset failed. The link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)" }}>
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-xl overflow-hidden" data-testid="reset-password-card">
        <div className="h-3" style={{ background: "linear-gradient(135deg, #1a3a4a 0%, #1a8a80 100%)" }} />
        <div className="p-6 pt-8">
          <div className="flex items-center gap-2 mb-6">
            <img src="/images/capymatch-logo.png" alt="CapyMatch" className="w-7 h-7 rounded object-cover" />
            <span className="text-sm font-medium text-gray-600">CapyMatch</span>
          </div>

          {done ? (
            <div className="text-center py-4" data-testid="reset-success">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Password reset!</h2>
              <p className="text-sm text-gray-500 mb-5">Your password has been updated. You can now sign in.</p>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-2.5 rounded-full text-sm font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #1a3a4a 0%, #1a8a80 100%)" }}
                data-testid="go-to-login-btn"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Set new password</h2>
              <p className="text-sm text-gray-500 mb-5">Choose a strong password for your account.</p>
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="new-password-input"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 focus:outline-none transition-colors bg-white"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    data-testid="confirm-password-input"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 border border-gray-200 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 focus:outline-none transition-colors bg-white"
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-600" data-testid="reset-error">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  data-testid="reset-submit-btn"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #1a3a4a 0%, #1a8a80 100%)" }}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
