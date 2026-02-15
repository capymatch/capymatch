import { useState, useEffect } from "react";
import { Bell, Shield, Moon, Sun, Monitor, Palette, Mail, CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react";
import api, { BACKEND_URL } from "../lib/api";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import TeamSection from "../components/TeamSection";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for Gmail callback result
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

  // Load Gmail status
  useEffect(() => {
    api.get("/gmail/status")
      .then((res) => setGmailStatus(res.data))
      .catch(() => setGmailStatus({ connected: false }))
      .finally(() => setGmailLoading(false));
  }, []);

  const handleConnectGmail = async () => {
    try {
      const res = await api.get("/gmail/connect");
      window.location.href = res.data.auth_url;
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

  const themeOptions = [
    { value: "dark", label: "Dark", icon: Moon, description: "Dark theme for low-light environments" },
    { value: "light", label: "Light", icon: Sun, description: "Light theme for bright environments" },
    { value: "system", label: "System", icon: Monitor, description: "Automatically match your system settings" },
  ];

  return (
    <div data-testid="settings-page" className="max-w-3xl mx-auto space-y-8">
      {/* Theme Section */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-pink-600/20 flex items-center justify-center">
            <Palette className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Appearance</h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Customize how the app looks</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              data-testid={`theme-${option.value}`}
              className={`p-4 rounded-xl border-2 transition-all text-left ${theme === option.value ? "border-pink-600 bg-pink-600/10" : ""}`}
              style={{ borderColor: theme === option.value ? undefined : "var(--t-border)", backgroundColor: theme === option.value ? undefined : "var(--t-surface-alt)" }}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${theme === option.value ? "bg-pink-600/30" : ""}`} style={{ backgroundColor: theme === option.value ? undefined : "var(--t-surface)" }}>
                <option.icon className={`w-5 h-5 ${theme === option.value ? "text-pink-600" : ""}`} style={{ color: theme === option.value ? undefined : "var(--t-text-muted)" }} />
              </div>
              <p className="font-medium" style={{ color: theme === option.value ? "var(--t-text)" : "var(--t-text-secondary)" }}>{option.label}</p>
              <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Gmail Integration */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Gmail Integration</h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Connect your Gmail to send and receive emails</p>
          </div>
        </div>
        {gmailLoading ? (
          <div className="flex items-center gap-3 py-4">
            <Loader2 className="w-5 h-5 animate-spin text-pink-600" />
            <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Checking connection...</span>
          </div>
        ) : gmailStatus?.connected ? (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Connected</p>
              <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }} data-testid="gmail-connected-email">{gmailStatus.gmail_email}</p>
            </div>
            <button data-testid="disconnect-gmail-btn" onClick={handleDisconnectGmail} className="px-4 py-2 text-sm rounded-lg border transition-colors text-red-500 hover:bg-red-500/10" style={{ borderColor: "var(--t-border)" }}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
            <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
            <div className="flex-1">
              <p className="text-sm" style={{ color: "var(--t-text-secondary)" }}>No Gmail account connected</p>
            </div>
            <button data-testid="connect-gmail-settings-btn" onClick={handleConnectGmail} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium text-white bg-pink-700 hover:bg-pink-800 transition-colors">
              <Mail className="w-4 h-4" /> Connect
            </button>
          </div>
        )}
      </div>

      {/* Team Management */}
      <TeamSection />

      {/* Replay Tour */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Guided Tour</h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Replay the app walkthrough</p>
          </div>
        </div>
        <button
          data-testid="replay-tour-btn"
          onClick={() => {
            localStorage.removeItem("tour_completed");
            localStorage.removeItem("onboarding_dismissed");
            window.location.href = "/board";
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Replay Tour
        </button>
      </div>
    </div>
  );
}
