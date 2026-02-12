import { useState, useEffect } from "react";
import { Settings, User, Bell, Shield, Moon, Sun, Monitor, Palette } from "lucide-react";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // Get saved theme from localStorage
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
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>Manage your preferences and account settings</p>
      </div>

      {/* Theme Section */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Palette className="w-5 h-5 text-purple-500" />
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
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                theme === option.value
                  ? "border-purple-500 bg-purple-500/10"
                  : ""
              }`}
              style={{ 
                borderColor: theme === option.value ? undefined : "var(--t-border)",
                backgroundColor: theme === option.value ? undefined : "var(--t-surface-alt)"
              }}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                theme === option.value ? "bg-purple-500/30" : ""
              }`} style={{ backgroundColor: theme === option.value ? undefined : "var(--t-surface)" }}>
              }`}>
                <option.icon className={`w-5 h-5 ${theme === option.value ? "text-purple-400" : "text-white/60"}`} />
              </div>
              <p className={`font-medium ${theme === option.value ? "text-white" : "text-white/80"}`}>
                {option.label}
              </p>
              <p className="text-white/40 text-xs mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Profile</h2>
            <p className="text-white/50 text-sm">Your account information</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <span className="text-white/60 text-sm">Account</span>
            <span className="text-white text-sm">Connected via Google</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <span className="text-white/60 text-sm">Role</span>
            <span className="text-white text-sm">Athlete Family</span>
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="rounded-xl p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Notifications</h2>
            <p className="text-white/50 text-sm">Manage your notification preferences</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-white text-sm">Follow-up Reminders</p>
              <p className="text-white/40 text-xs">Get notified when follow-ups are due</p>
            </div>
            <div className="w-10 h-6 bg-purple-600 rounded-full relative cursor-pointer">
              <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-white text-sm">Email Notifications</p>
              <p className="text-white/40 text-xs">Receive updates via email</p>
            </div>
            <div className="w-10 h-6 bg-white/20 rounded-full relative cursor-pointer">
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white/60 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="rounded-xl p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Privacy</h2>
            <p className="text-white/50 text-sm">Control your data and privacy</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-white/5">
            <div>
              <p className="text-white text-sm">Data Export</p>
              <p className="text-white/40 text-xs">Download all your recruiting data</p>
            </div>
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
