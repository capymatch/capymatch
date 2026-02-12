import { useState, useEffect, useRef } from "react";
import { Settings, User, Bell, Shield, Moon, Sun, Monitor, Palette, Mail, CheckCircle, XCircle, Loader2, Copy, ExternalLink, Camera, Check } from "lucide-react";
import api, { BACKEND_URL } from "../lib/api";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [gmailStatus, setGmailStatus] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const photoRef = useRef(null);

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

  // Load athlete profile + share link
  useEffect(() => {
    Promise.all([api.get("/athlete-profile"), api.get("/share-link")])
      .then(([profRes, linkRes]) => {
        setProfile(profRes.data);
        const base = window.location.origin;
        setShareLink(`${base}/schedule/${linkRes.data.tenant_id}`);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const updateProfile = (key, val) => setProfile((p) => ({ ...p, [key]: val }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put("/athlete-profile", profile);
      setProfile(res.data);
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) return toast.error("Photo must be under 5MB");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.post("/athlete-profile/photo", { photo_data: reader.result });
        updateProfile("photo_url", reader.result);
        toast.success("Photo uploaded");
      } catch {
        toast.error("Failed to upload photo");
      }
    };
    reader.readAsDataURL(file);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

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
                <option.icon className={`w-5 h-5 ${theme === option.value ? "text-purple-500" : ""}`} style={{ color: theme === option.value ? undefined : "var(--t-text-muted)" }} />
              </div>
              <p className="font-medium" style={{ color: theme === option.value ? "var(--t-text)" : "var(--t-text-secondary)" }}>
                {option.label}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Gmail Integration Section */}
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
            <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Checking connection...</span>
          </div>
        ) : gmailStatus?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Connected</p>
                <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }} data-testid="gmail-connected-email">
                  {gmailStatus.gmail_email}
                </p>
              </div>
              <button
                data-testid="disconnect-gmail-btn"
                onClick={handleDisconnectGmail}
                className="px-4 py-2 text-sm rounded-lg border transition-colors text-red-500 hover:bg-red-500/10"
                style={{ borderColor: "var(--t-border)" }}
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
              <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
              <div className="flex-1">
                <p className="text-sm" style={{ color: "var(--t-text-secondary)" }}>No Gmail account connected</p>
              </div>
              <button
                data-testid="connect-gmail-settings-btn"
                onClick={handleConnectGmail}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Connect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Athlete Profile & Share Link */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Athlete Profile</h2>
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>This info appears on your public schedule page</p>
            </div>
          </div>
        </div>

        {/* Share Link */}
        {shareLink && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Public Schedule Link</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareLink}
                data-testid="share-link-input"
                className="flex-1 px-3 py-2 rounded-lg text-sm border"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}
              />
              <button
                data-testid="copy-share-link-btn"
                onClick={copyShareLink}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg transition-colors"
                style={{ color: "var(--t-text-muted)" }}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--t-text-muted)" }}>
              Share this link with coaches so they can see your event schedule and contact info
            </p>
          </div>
        )}

        {profileLoading ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Photo + Name */}
            <div className="flex items-start gap-5">
              <div className="relative group">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt="Profile" className="w-24 h-24 rounded-xl object-cover border-2 border-purple-500/30" />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-purple-500/20 flex items-center justify-center border-2 border-dashed border-purple-500/30">
                    <User className="w-10 h-10 text-purple-500/50" />
                  </div>
                )}
                <button
                  onClick={() => photoRef.current?.click()}
                  data-testid="upload-photo-btn"
                  className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="flex-1 space-y-3">
                <FieldRow label="Full Name" testId="profile-name" value={profile.athlete_name} onChange={(v) => updateProfile("athlete_name", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Graduation Year" testId="profile-grad-year" value={profile.grad_year} onChange={(v) => updateProfile("grad_year", v)} placeholder="2027" />
                  <FieldRow label="Position" testId="profile-position" value={profile.position} onChange={(v) => updateProfile("position", v)} placeholder="Outside Hitter" />
                </div>
              </div>
            </div>

            {/* Physical + Team */}
            <div className="grid grid-cols-3 gap-3">
              <FieldRow label="Height" testId="profile-height" value={profile.height} onChange={(v) => updateProfile("height", v)} placeholder="5'11&quot;" />
              <FieldRow label="Jersey #" testId="profile-jersey" value={profile.jersey_number} onChange={(v) => updateProfile("jersey_number", v)} placeholder="14" />
              <FieldRow label="GPA" testId="profile-gpa" value={profile.gpa} onChange={(v) => updateProfile("gpa", v)} placeholder="3.8" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Club Team" testId="profile-club" value={profile.club_team} onChange={(v) => updateProfile("club_team", v)} placeholder="A5 Volleyball" />
              <FieldRow label="High School" testId="profile-hs" value={profile.high_school} onChange={(v) => updateProfile("high_school", v)} placeholder="Lincoln High" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="City" testId="profile-city" value={profile.city} onChange={(v) => updateProfile("city", v)} placeholder="Austin" />
              <FieldRow label="State" testId="profile-state" value={profile.state} onChange={(v) => updateProfile("state", v)} placeholder="TX" />
            </div>

            {/* Video Link */}
            <FieldRow label="Highlights Video Link" testId="profile-video" value={profile.video_link} onChange={(v) => updateProfile("video_link", v)} placeholder="https://youtube.com/..." />

            {/* Bio */}
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Bio</label>
              <textarea
                data-testid="profile-bio"
                value={profile.bio || ""}
                onChange={(e) => updateProfile("bio", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50 resize-none"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                placeholder="Tell coaches about yourself..."
              />
            </div>

            {/* Contact Info */}
            <div className="pt-4 border-t" style={{ borderColor: "var(--t-border)" }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--t-text)" }}>Athlete Contact</h3>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Email" testId="profile-email" value={profile.contact_email} onChange={(v) => updateProfile("contact_email", v)} placeholder="clara@email.com" />
                <FieldRow label="Phone" testId="profile-phone" value={profile.contact_phone} onChange={(v) => updateProfile("contact_phone", v)} placeholder="(555) 123-4567" />
              </div>
            </div>

            {/* Club Coach Info */}
            <div className="pt-4 border-t" style={{ borderColor: "var(--t-border)" }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--t-text)" }}>Club Coach</h3>
              <div className="space-y-3">
                <FieldRow label="Name" testId="profile-parent-name" value={profile.parent_name} onChange={(v) => updateProfile("parent_name", v)} placeholder="John Smith" />
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Email" testId="profile-parent-email" value={profile.parent_email} onChange={(v) => updateProfile("parent_email", v)} placeholder="parent@email.com" />
                  <FieldRow label="Phone" testId="profile-parent-phone" value={profile.parent_phone} onChange={(v) => updateProfile("parent_phone", v)} placeholder="(555) 987-6543" />
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="pt-2">
              <button
                data-testid="save-profile-btn"
                onClick={saveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Notifications Section */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Notifications</h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Manage your notification preferences</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div>
              <p className="text-sm" style={{ color: "var(--t-text)" }}>Follow-up Reminders</p>
              <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Get notified when follow-ups are due</p>
            </div>
            <div className="w-10 h-6 bg-purple-600 rounded-full relative cursor-pointer">
              <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div>
              <p className="text-sm" style={{ color: "var(--t-text)" }}>Email Notifications</p>
              <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Receive updates via email</p>
            </div>
            <div className="w-10 h-6 rounded-full relative cursor-pointer" style={{ backgroundColor: "var(--t-surface-alt)" }}>
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Privacy</h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Control your data and privacy</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div>
              <p className="text-sm" style={{ color: "var(--t-text)" }}>Data Export</p>
              <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Download all your recruiting data</p>
            </div>
            <button className="px-4 py-2 text-sm rounded-lg transition-colors" style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-secondary)" }}>
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, onChange, placeholder, testId }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>{label}</label>
      <input
        data-testid={testId}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50"
        style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
      />
    </div>
  );
}
