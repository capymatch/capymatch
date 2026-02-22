import { useState, useEffect } from "react";
import { useSubscription } from "../lib/subscription";
import { CreditCard, ChevronRight, Sparkles, Zap, Crown, Lock, Trash2, Loader2, Shield, Bell, Download, Check, X as XIcon, User, Pencil } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import UpgradeModal from "../components/UpgradeModal";

export default function AccountPage() {
  const { subscription } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Personal info state
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [originalName, setOriginalName] = useState("");
  const [originalEmail, setOriginalEmail] = useState("");
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoSaving, setInfoSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  useEffect(() => {
    api.get("/auth/me").then((res) => {
      setAccountName(res.data.name || "");
      setAccountEmail(res.data.email || "");
      setOriginalName(res.data.name || "");
      setOriginalEmail(res.data.email || "");
      setIsGoogleUser(res.data.auth_provider === "google");
    }).catch(() => {}).finally(() => setInfoLoading(false));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    setPwLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: currentPw, new_password: newPw });
      toast.success("Password updated successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div data-testid="account-page" className="max-w-3xl mx-auto space-y-8">
      {/* Personal Info Card */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="personal-info-card">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(46,196,182,0.2)" }}>
              <User className="w-5 h-5" style={{ color: "#2ec4b6" }} />
            </div>
            <div>
              <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Personal Info</h2>
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Your account name and email</p>
            </div>
          </div>
          {!isEditing && !infoLoading && (
            <button onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
              style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-secondary)" }}
              data-testid="edit-personal-info-btn"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
        </div>
        <div className="px-6 py-4">
          {infoLoading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2ec4b6" }} />
              <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Loading...</span>
            </div>
          ) : isEditing ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!accountName.trim()) { toast.error("Name is required"); return; }
              if (!accountEmail.trim()) { toast.error("Email is required"); return; }
              setInfoSaving(true);
              try {
                await api.put("/auth/update-account", { name: accountName.trim(), email: accountEmail.trim() });
                setOriginalName(accountName.trim()); setOriginalEmail(accountEmail.trim()); setIsEditing(false);
                toast.success("Account info updated");
              } catch (err) { toast.error(err?.response?.data?.detail || "Failed to update"); }
              finally { setInfoSaving(false); }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--t-text-secondary)" }}>Name</label>
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} required
                  data-testid="account-name-input"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors"
                  style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--t-text-secondary)" }}>Email</label>
                <input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} required
                  disabled={isGoogleUser} data-testid="account-email-input"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                />
                {isGoogleUser && <p className="text-[11px] mt-1" style={{ color: "var(--t-text-muted)" }}>Email is managed by Google and cannot be changed here.</p>}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button type="submit" disabled={infoSaving || (accountName === originalName && accountEmail === originalEmail)}
                  data-testid="save-personal-info-btn"
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#2ec4b6" }}
                >
                  {infoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
                </button>
                <button type="button" onClick={() => { setAccountName(originalName); setAccountEmail(originalEmail); setIsEditing(false); }}
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
                  style={{ color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}
                  data-testid="cancel-edit-personal-info-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Name</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: "var(--t-text)" }} data-testid="account-name-display">{originalName || "—"}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Email</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: "var(--t-text)" }} data-testid="account-email-display">{originalEmail || "—"}</p>
                </div>
                {isGoogleUser && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>Google</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscription Plan Card */}
      {subscription && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
          data-testid="subscription-card"
        >
          <div className="flex items-center gap-3 px-6 pt-6 pb-2">
            <div className="w-10 h-10 rounded-lg bg-teal-600/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Subscription</h2>
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Manage your plan and usage</p>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
              <div className="flex items-center gap-3">
                {subscription.tier === "premium" ? (
                  <Crown className="w-5 h-5 text-amber-400" />
                ) : subscription.tier === "pro" ? (
                  <Sparkles className="w-5 h-5 text-teal-600" />
                ) : (
                  <Zap className="w-5 h-5 text-zinc-400" />
                )}
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{subscription.label} Plan</p>
                  <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                    {subscription.tier === "basic" ? "Free" : subscription.tier === "pro" ? "$19/month" : "$39/month"}
                  </p>
                </div>
              </div>
              {subscription.tier !== "premium" && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                  data-testid="account-upgrade-btn"
                >
                  Upgrade <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Usage Bars */}
            <div className="grid grid-cols-2 gap-6 mt-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>Schools on board</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>
                    {subscription.usage.schools}/{subscription.usage.schools_limit === -1 ? "\u221e" : subscription.usage.schools_limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: subscription.usage.schools_limit === -1 ? "15%" : `${Math.min(100, (subscription.usage.schools / subscription.usage.schools_limit) * 100)}%`,
                      backgroundColor: subscription.usage.schools_remaining <= 1 && subscription.usage.schools_limit !== -1 ? "#ef4444" : "#2ec4b6",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>AI drafts this month</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>
                    {subscription.usage.ai_drafts_used}/{subscription.usage.ai_drafts_limit === -1 ? "\u221e" : subscription.usage.ai_drafts_limit === 0 ? "Upgrade to unlock" : subscription.usage.ai_drafts_limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: subscription.usage.ai_drafts_limit <= 0 ? "0%" : subscription.usage.ai_drafts_limit === -1 ? "15%" : `${Math.min(100, (subscription.usage.ai_drafts_used / subscription.usage.ai_drafts_limit) * 100)}%`,
                      backgroundColor: "#8b5cf6",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Plan Features Comparison */}
            {subscription.tier !== "premium" && (
              <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--t-border)" }}>
                <p className="text-xs font-semibold mb-3" style={{ color: "var(--t-text-muted)" }}>Your plan includes</p>
                <div className="space-y-2">
                  {[
                    { label: "School tracking", value: subscription.usage.schools_limit === -1 ? "Unlimited" : `Up to ${subscription.usage.schools_limit}`, included: true },
                    { label: "Gmail integration", value: null, included: subscription.limits?.gmail_integration },
                    { label: "Recruiting analytics", value: null, included: subscription.limits?.analytics },
                    { label: "Follow-up reminders", value: null, included: subscription.limits?.follow_up_reminders },
                    { label: "Public athlete profile", value: null, included: subscription.limits?.public_profile },
                    { label: "AI email drafts", value: "Premium", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "Engagement AI", value: "Premium", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "Highlight AI", value: "Premium", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "AI Advisor", value: "Premium", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "Coach Watch alerts", value: "Premium", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "Auto reply detection", value: "Premium", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "Weekly digest", value: "Premium", included: subscription.limits?.weekly_digest, premiumOnly: true },
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        {feat.included ? (
                          <Check className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        ) : (
                          <XIcon className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${feat.included ? "" : "opacity-50"}`} style={{ color: "var(--t-text-secondary)" }}>
                          {feat.label}
                        </span>
                        {!feat.included && feat.premiumOnly && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400">PREMIUM</span>
                        )}
                      </div>
                      {feat.value && feat.included && (
                        <span className="text-[11px] font-medium" style={{ color: "var(--t-text-muted)" }}>{feat.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Password */}
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Change Password</h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Update your account password</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--t-text-secondary)" }}>Current Password</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              data-testid="current-password-input"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:border-slate-500 focus:outline-none transition-colors"
              style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--t-text-secondary)" }}>New Password</label>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={6}
              data-testid="new-password-input"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:border-slate-500 focus:outline-none transition-colors"
              style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--t-text-secondary)" }}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
              minLength={6}
              data-testid="confirm-password-input"
              className="w-full px-3 py-2 rounded-lg text-sm border focus:border-slate-500 focus:outline-none transition-colors"
              style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            data-testid="change-password-btn"
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>

      {/* Notifications */}
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
            <div className="w-10 h-6 bg-teal-700 rounded-full relative cursor-pointer" data-testid="toggle-followup-reminders">
              <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div>
              <p className="text-sm" style={{ color: "var(--t-text)" }}>Email Notifications</p>
              <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Receive updates via email</p>
            </div>
            <div className="w-10 h-6 rounded-full relative cursor-pointer" style={{ backgroundColor: "var(--t-surface-alt)" }} data-testid="toggle-email-notifications">
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy */}
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
        <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--t-border)" }}>
          <div>
            <p className="text-sm" style={{ color: "var(--t-text)" }}>Data Export</p>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Download all your recruiting data</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors" style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-secondary)" }} data-testid="data-export-btn">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl p-6 border border-red-500/20" style={{ backgroundColor: "var(--t-surface)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-red-500">Danger Zone</h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Permanent actions that cannot be undone</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/15" style={{ backgroundColor: "var(--t-surface-alt)" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Delete Account</p>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Permanently delete your account and all data</p>
          </div>
          <button
            data-testid="delete-account-btn"
            className="px-4 py-2 text-sm rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors font-medium"
          >
            Delete Account
          </button>
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="max_schools" currentTier={subscription?.tier || "basic"} />
    </div>
  );
}
