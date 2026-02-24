import { useState } from "react";
import { Mail, Shield, Eye, EyeOff, AlertTriangle, CheckCircle, X, ExternalLink } from "lucide-react";

export default function GmailConsentModal({ onConsent, onCancel }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)" }}
      data-testid="gmail-consent-modal"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,138,128,0.15)" }}>
                <Shield className="w-5 h-5" style={{ color: "#1a8a80" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Before You Connect Gmail</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>Your privacy matters to us</p>
              </div>
            </div>
            <button onClick={onCancel} className="p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: "var(--t-text-faint)" }} data-testid="consent-close-btn">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tip */}
          <div className="rounded-xl px-4 py-3 mb-4" style={{ background: "rgba(26,138,128,0.08)", border: "1px solid rgba(26,138,128,0.15)" }}>
            <p className="text-sm font-semibold mb-1" style={{ color: "#1a8a80" }}>Pro Tip: Use a Recruiting Email</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
              We recommend creating a dedicated email for recruiting (e.g., <span className="font-medium" style={{ color: "var(--t-text)" }}>firstname.lastname.recruiting@gmail.com</span>). This keeps your personal inbox private and your recruiting communication organized.
            </p>
          </div>

          {/* What we access */}
          <div className="space-y-3 mb-4">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>What we access</p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#22c55e" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Send emails to coaches on your behalf</p>
                  <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>Only when you compose and hit send</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#22c55e" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Read email headers to detect coach replies</p>
                  <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>We check who emailed you, not what they said</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#22c55e" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Auto-detect inbound coach interest</p>
                  <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>You can turn this off anytime in Settings</p>
                </div>
              </div>
            </div>
          </div>

          {/* What we DON'T do */}
          <div className="space-y-3 mb-5">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>What we never do</p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <X className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <p className="text-sm" style={{ color: "var(--t-text-secondary)" }}>Read, store, or share the content of your emails</p>
              </div>
              <div className="flex items-start gap-3">
                <X className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <p className="text-sm" style={{ color: "var(--t-text-secondary)" }}>Send emails without your explicit action</p>
              </div>
              <div className="flex items-start gap-3">
                <X className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
                <p className="text-sm" style={{ color: "var(--t-text-secondary)" }}>Share your data with third parties</p>
              </div>
            </div>
          </div>

          {/* Encrypted badge */}
          <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg" style={{ background: "var(--t-surface-alt)" }}>
            <Shield className="w-3.5 h-3.5" style={{ color: "#1a8a80" }} />
            <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>Your Gmail credentials are encrypted at rest. You can disconnect anytime.</p>
          </div>

          {/* Agreement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-5" data-testid="consent-checkbox-label">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-teal-600 rounded"
              data-testid="consent-checkbox"
            />
            <span className="text-sm leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
              I understand what data is accessed and consent to connecting my Gmail account.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 sm:px-6 pb-5 sm:pb-6">
          <button
            onClick={onConsent}
            disabled={!agreed}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: agreed ? "#1a8a80" : "rgba(26,138,128,0.4)", color: "#ffffff" }}
            data-testid="consent-connect-btn"
          >
            <Mail className="w-4 h-4" />
            Connect Gmail
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}
            data-testid="consent-cancel-btn"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
