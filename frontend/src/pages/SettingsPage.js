import { useState, useEffect } from "react";
import { Moon, Sun, Monitor, Palette, Mail, CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react";
import api, { BACKEND_URL } from "../lib/api";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import TeamSection from "../components/TeamSection";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

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
  }, []);

  const handleConnectGmail = async () => {
    try {
      const res = await api.get("/gmail/connect?return_to=/settings");
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
              localStorage.removeItem("tour_completed");
              localStorage.setItem("show_tour", "true");
              window.location.href = "/board";
            }}
            className="flex items-center gap-1.5 px-3 lg:px-4 py-2 text-xs lg:text-sm rounded-xl font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            Replay
          </button>
        </div>
      </div>
    </div>
  );
}
