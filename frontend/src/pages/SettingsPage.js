import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, Palette, Mail, CheckCircle, XCircle, Loader2, Sparkles, Shield, Download, Trash2, Eye, ExternalLink } from "lucide-react";
import api, { BACKEND_URL } from "../lib/api";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import TeamSection from "../components/TeamSection";
import GmailConsentModal from "../components/GmailConsentModal";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [privacyPrefs, setPrivacyPrefs] = useState({ inbound_email_scanning: true });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const gmailResult = searchParams.get("gmail");
    if (gmailResult === "connected") {
      toast.success("Gmail connected successfully!");
      searchParams.delete("gmail");
      setSearchParams(searchParams, { replace: true });
    } else if (gmailResult === "error") {
      const reason = searchParams.get("reason") || "unknown";
      toast.error(`Gmail connection failed: ${reason}`);
      searchParams.delete("gmail");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    api.get("/gmail/status")
      .then((res) => setGmailStatus(res.data))
      .catch(() => setGmailStatus({ connected: false }))
      .finally(() => setGmailLoading(false));
    api.get("/privacy/preferences")
      .then((res) => setPrivacyPrefs(res.data))
      .catch(() => {});
  }, []);

  const handleConnectGmail = () => {
    setShowConsentModal(true);
  };

  const handleConsentAndConnect = async () => {
    setShowConsentModal(false);
    try {
      await api.put("/privacy/preferences", { gmail_consent_given: true });
      const res = await api.get("/gmail/connect?return_to=/settings");
      setTimeout(() => {
        const a = document.createElement('a'); a.href = res.data.auth_url; a.target = '_top'; document.body.appendChild(a); a.click(); a.remove();
      }, 100);
    } catch {
      toast.error("Failed to start Gmail connection");
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await api.post("/gmail/disconnect");
      setGmailStatus({ connected: false });
      toast.success("Gmail disconnected");
    } catch {
      toast.error("Failed to disconnect Gmail");
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (newTheme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) { root.classList.add("dark"); root.classList.remove("light"); }
      else { root.classList.remove("dark"); root.classList.add("light"); }
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const handleToggleInboundScanning = async (enabled) => {
    setPrivacyPrefs(prev => ({ ...prev, inbound_email_scanning: enabled }));
    try {
      await api.put("/privacy/preferences", { inbound_email_scanning: enabled });
      toast.success(enabled ? "Inbound scanning enabled" : "Inbound scanning disabled");
    } catch {
      setPrivacyPrefs(prev => ({ ...prev, inbound_email_scanning: !enabled }));
      toast.error("Failed to update preference");
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await api.get("/privacy/export-data");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recruiting-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    try {
      await api.delete("/privacy/delete-account");
      toast.success("Account deleted. Redirecting...");
      setTimeout(() => { window.location.href = "/login"; }, 1500);
    } catch {
      toast.error("Failed to delete account");
    }
  };

  const themeOptions = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div data-testid="settings-page" className="max-w-3xl mx-auto space-y-5 lg:space-y-8">
      {/* Theme */}
      <div className="rounded-xl p-4 lg:p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-4 lg:mb-6">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
            <Palette className="w-4 h-4 lg:w-5 lg:h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="font-semibold text-base lg:text-lg" style={{ color: "var(--t-text)" }}>Appearance</h2>
            <p className="text-xs lg:text-sm" style={{ color: "var(--t-text-muted)" }}>Customize how the app looks</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:gap-4">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              data-testid={`theme-${option.value}`}
              className={`p-3 lg:p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center ${theme === option.value ? "border-teal-600 bg-teal-600/10" : ""}`}
              style={{ borderColor: theme === option.value ? undefined : "var(--t-border)", backgroundColor: theme === option.value ? undefined : "var(--t-surface-alt)" }}
            >
              <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center mb-2 ${theme === option.value ? "bg-teal-600/30" : ""}`} style={{ backgroundColor: theme === option.value ? undefined : "var(--t-surface)" }}>
                <option.icon className={`w-4 h-4 lg:w-5 lg:h-5 ${theme === option.value ? "text-teal-600" : ""}`} style={{ color: theme === option.value ? undefined : "var(--t-text-muted)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: theme === option.value ? "var(--t-text)" : "var(--t-text-secondary)" }}>{option.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Gmail Integration */}
      <div className="rounded-xl p-4 lg:p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Mail className="w-4 h-4 lg:w-5 lg:h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-semibold text-base lg:text-lg" style={{ color: "var(--t-text)" }}>Gmail Integration</h2>
            <p className="text-xs lg:text-sm" style={{ color: "var(--t-text-muted)" }}>Connect your Gmail to send and receive emails</p>
          </div>
        </div>
        {gmailLoading ? (
          <div className="flex items-center gap-3 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Checking...</span>
          </div>
        ) : gmailStatus?.connected ? (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Connected</p>
              <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }} data-testid="gmail-connected-email">{gmailStatus.gmail_email}</p>
            </div>
            <button data-testid="disconnect-gmail-btn" onClick={handleDisconnectGmail} className="px-3 py-1.5 text-xs rounded-lg border transition-colors text-red-500 hover:bg-red-500/10" style={{ borderColor: "var(--t-border)" }}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
            <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
            <p className="flex-1 text-sm" style={{ color: "var(--t-text-secondary)" }}>Not connected</p>
            <button data-testid="connect-gmail-settings-btn" onClick={handleConnectGmail} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium text-white bg-teal-700 hover:bg-teal-800 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Connect
            </button>
          </div>
        )}
      </div>

      {/* Team Management */}
      <TeamSection />

      {/* Your Data & Privacy */}
      <div className="rounded-xl p-4 lg:p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="privacy-section">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(46,196,182,0.2)" }}>
            <Shield className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: "#2ec4b6" }} />
          </div>
          <div>
            <h2 className="font-semibold text-base lg:text-lg" style={{ color: "var(--t-text)" }}>Your Data & Privacy</h2>
            <p className="text-xs lg:text-sm" style={{ color: "var(--t-text-muted)" }}>Control how your data is used</p>
          </div>
        </div>

        {/* Inbound scanning toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ backgroundColor: "var(--t-surface-alt)" }}>
          <div className="flex items-center gap-3 flex-1">
            <Eye className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Auto-detect inbound coach emails</p>
              <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                {privacyPrefs.inbound_email_scanning
                  ? "We scan email headers to detect when coaches contact you first"
                  : "Disabled \u2014 you'll need to manually add schools when a coach contacts you"}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleInboundScanning(!privacyPrefs.inbound_email_scanning)}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3"
            style={{ backgroundColor: privacyPrefs.inbound_email_scanning ? "#2ec4b6" : "var(--t-border)" }}
            data-testid="inbound-scanning-toggle"
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm"
              style={{ left: privacyPrefs.inbound_email_scanning ? "22px" : "2px" }}
            />
          </button>
        </div>

        {/* Privacy Policy link */}
        <button
          onClick={() => navigate("/privacy")}
          className="flex items-center gap-3 w-full p-3 rounded-xl mb-3 transition-colors hover:bg-white/5"
          style={{ backgroundColor: "var(--t-surface-alt)" }}
          data-testid="privacy-policy-link"
        >
          <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
          <p className="text-sm font-medium flex-1 text-left" style={{ color: "var(--t-text)" }}>Privacy Policy</p>
          <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--t-text-faint)" }} />
        </button>

        {/* Export data */}
        <button
          onClick={handleExportData}
          disabled={exporting}
          className="flex items-center gap-3 w-full p-3 rounded-xl mb-3 transition-colors hover:bg-white/5 disabled:opacity-50"
          style={{ backgroundColor: "var(--t-surface-alt)" }}
          data-testid="export-data-btn"
        >
          <Download className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
          <p className="text-sm font-medium flex-1 text-left" style={{ color: "var(--t-text)" }}>{exporting ? "Exporting..." : "Download My Data"}</p>
        </button>

        {/* Delete account */}
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-3 w-full p-3 rounded-xl transition-colors hover:bg-red-500/10"
            style={{ backgroundColor: "var(--t-surface-alt)" }}
            data-testid="delete-account-btn"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0 text-red-500" />
            <p className="text-sm font-medium flex-1 text-left text-red-500">Delete My Account</p>
          </button>
        ) : (
          <div className="p-4 rounded-xl border" style={{ borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.05)" }}>
            <p className="text-sm font-semibold text-red-500 mb-2">This is permanent and cannot be undone</p>
            <p className="text-xs mb-3" style={{ color: "var(--t-text-muted)" }}>
              All your schools, interactions, coaches, notes, and account data will be permanently deleted. Type <span className="font-bold" style={{ color: "var(--t-text)" }}>DELETE</span> to confirm.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="flex-1 px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                data-testid="delete-confirm-input"
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE"}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-red-700"
                data-testid="delete-confirm-btn"
              >
                Delete
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Replay Tour */}
      <div className="rounded-xl p-4 lg:p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base lg:text-lg" style={{ color: "var(--t-text)" }}>Guided Tour</h2>
              <p className="text-xs lg:text-sm" style={{ color: "var(--t-text-muted)" }}>Replay the app walkthrough</p>
            </div>
          </div>
          <button
            data-testid="replay-tour-btn"
            onClick={() => {
              localStorage.removeItem("pipeline_tour_done");
              window.location.href = "/board";
            }}
            className="flex items-center gap-1.5 px-3 lg:px-4 py-2 text-xs lg:text-sm rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Replay
          </button>
        </div>
      </div>

      {/* Gmail Consent Modal */}
      {showConsentModal && (
        <GmailConsentModal
          onConsent={handleConsentAndConnect}
          onCancel={() => setShowConsentModal(false)}
        />
      )}
    </div>
  );
}
