import { useState } from "react";
import { useSubscription } from "../lib/subscription";
import { CreditCard, ChevronRight, Sparkles, Zap, Crown, Lock, Trash2, Loader2, Shield, Bell, Download, Check, X as XIcon } from "lucide-react";
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
      {/* Subscription Plan Card */}
      {subscription && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
          data-testid="subscription-card"
        >
          <div className="flex items-center gap-3 px-6 pt-6 pb-2">
            <div className="w-10 h-10 rounded-lg bg-pink-600/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-pink-600" />
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
                  <Sparkles className="w-5 h-5 text-pink-400" />
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
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors"
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
                      backgroundColor: subscription.usage.schools_remaining <= 1 && subscription.usage.schools_limit !== -1 ? "#ef4444" : "#ec4899",
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
                    { label: "AI email drafts", value: subscription.usage.ai_drafts_limit === -1 ? "Unlimited" : subscription.usage.ai_drafts_limit === 0 ? "Not included" : `${subscription.usage.ai_drafts_limit}/month`, included: subscription.usage.ai_drafts_limit !== 0 },
                    { label: "Gmail integration", value: null, included: subscription.limits?.gmail_integration },
                    { label: "Engagement AI", value: null, included: subscription.limits?.recruiting_insights },
                    { label: "Recruiting analytics", value: null, included: subscription.limits?.analytics },
                    { label: "Follow-up reminders", value: null, included: subscription.limits?.follow_up_reminders },
                    { label: "Highlight AI", value: "Commit Ready", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "Coach Watch alerts", value: "Commit Ready", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "Auto reply detection", value: "Commit Ready", included: subscription.limits?.auto_reply_detection, premiumOnly: true },
                    { label: "Weekly digest", value: "Commit Ready", included: subscription.limits?.weekly_digest, premiumOnly: true },
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        {feat.included ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XIcon className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${feat.included ? "" : "opacity-50"}`} style={{ color: "var(--t-text-secondary)" }}>
                          {feat.label}
                        </span>
                        {!feat.included && feat.premiumOnly && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400">COMMIT READY</span>
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
              className="w-full px-3 py-2 rounded-lg text-sm border focus:border-pink-500 focus:outline-none transition-colors"
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
              className="w-full px-3 py-2 rounded-lg text-sm border focus:border-pink-500 focus:outline-none transition-colors"
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
              className="w-full px-3 py-2 rounded-lg text-sm border focus:border-pink-500 focus:outline-none transition-colors"
              style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            data-testid="change-password-btn"
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg font-medium text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:opacity-50"
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
            <div className="w-10 h-6 bg-pink-700 rounded-full relative cursor-pointer" data-testid="toggle-followup-reminders">
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
