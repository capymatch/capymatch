import { useState, useEffect } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import {
  Mail, CreditCard, Sparkles, CheckCircle2, XCircle, AlertCircle,
  Eye, EyeOff, RefreshCw, Trash2, Save, ExternalLink, Loader2, GraduationCap, Database, Search
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

function StatusDot({ active }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${active ? "bg-emerald-400" : "bg-zinc-500"}`}
      data-testid={`status-dot-${active ? "active" : "inactive"}`}
    />
  );
}

function IntegrationCard({ icon: Icon, title, subtitle, status, statusLabel, accent, badge, children }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`integration-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>{title}</h3>
              {badge && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.class}`}>
                  {badge.text}
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot active={status} />
          <span className={`text-xs font-medium ${status ? "text-emerald-400" : "text-zinc-500"}`}>{statusLabel}</span>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{value}</span>
    </div>
  );
}

export default function AdminIntegrations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stripeKey, setStripeKey] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingResend, setSavingResend] = useState(false);
  const [togglingEmail, setTogglingEmail] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [scorecardKey, setScorecardKey] = useState("");
  const [showScorecardKey, setShowScorecardKey] = useState(false);
  const [savingScorecard, setSavingScorecard] = useState(false);
  const [syncingScorecard, setSyncingScorecard] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [scrapingCoaches, setScrapingCoaches] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState("");

  const fetchIntegrations = async () => {
    try {
      const res = await api.get("/admin/integrations");
      setData(res.data);
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const saveStripeKey = async () => {
    if (!stripeKey.trim()) return;
    setSaving(true);
    try {
      const res = await api.put("/admin/integrations/stripe", { api_key: stripeKey.trim() });
      toast.success(`Stripe key updated (${res.data.mode} mode)`);
      setStripeKey("");
      fetchIntegrations();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update key");
    } finally {
      setSaving(false);
    }
  };

  const disconnectGmail = async (userId) => {
    setDisconnecting(userId);
    try {
      await api.delete(`/admin/integrations/gmail/${userId}`);
      toast.success("Gmail disconnected");
      fetchIntegrations();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  const scrapeCoaches = async () => {
    setScrapingCoaches(true);
    try {
      const res = await api.post("/admin/coach-scraper/scrape");
      if (res.data.status === "already_running") {
        toast.info("Scrape already in progress...");
      } else {
        toast.success(`Scraping started — ${res.data.missing} schools to check (${res.data.already_have} already have coaches)`);
      }
      const poll = setInterval(async () => {
        try {
          const status = await api.get("/admin/coach-scraper/status");
          const d = status.data;
          setScrapeProgress(`${d.scraped + d.failed} / ${d.total}`);
          if (d.done || !d.running) {
            clearInterval(poll);
            setScrapingCoaches(false);
            setScrapeProgress("");
            if (d.scraped > 0) {
              toast.success(`Scrape complete — found coaches for ${d.scraped} schools (${d.failed} not found)`);
            }
            fetchIntegrations();
          }
        } catch { clearInterval(poll); setScrapingCoaches(false); setScrapeProgress(""); }
      }, 5000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Scrape failed");
      setScrapingCoaches(false);
    }
  };

  const saveResendKey = async () => {
    if (!resendKey.trim()) return;
    setSavingResend(true);
    try {
      const res = await api.put("/admin/integrations/email", { api_key: resendKey.trim() });
      toast.success("Resend key updated");
      setResendKey("");
      fetchIntegrations();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update key");
    } finally {
      setSavingResend(false);
    }
  };

  const toggleEmailSetting = async (key, value) => {
    setTogglingEmail(key);
    try {
      await api.put("/admin/integrations/email/settings", { [key]: value });
      toast.success(`${key === "welcome_email" ? "Welcome emails" : "Invitation emails"} ${value ? "enabled" : "disabled"}`);
      fetchIntegrations();
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setTogglingEmail(null);
    }
  };

  const saveScorecardKey = async () => {
    if (!scorecardKey.trim()) return;
    setSavingScorecard(true);
    try {
      await api.put("/admin/integrations/scorecard/key", { api_key: scorecardKey.trim() });
      toast.success("College Scorecard key updated");
      setScorecardKey("");
      fetchIntegrations();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update key");
    } finally {
      setSavingScorecard(false);
    }
  };

  const syncScorecard = async () => {
    setSyncingScorecard(true);
    try {
      const res = await api.post("/admin/integrations/scorecard/sync");
      if (res.data.status === "already_running") {
        toast.info("Sync already in progress...");
      } else {
        toast.success(`Sync started — ${res.data.remaining} schools to sync (${res.data.already_synced} already done)`);
      }
      // Poll for progress
      const poll = setInterval(async () => {
        try {
          const status = await api.get("/admin/integrations/scorecard/sync-status");
          const d = status.data;
          setSyncProgress(`${d.synced + d.failed} / ${d.total}`);
          if (d.done || !d.running) {
            clearInterval(poll);
            setSyncingScorecard(false);
            setSyncProgress("");
            if (d.synced > 0) {
              toast.success(`Sync complete — ${d.synced} synced, ${d.failed} failed`);
            }
            fetchIntegrations();
          }
        } catch { clearInterval(poll); setSyncingScorecard(false); setSyncProgress(""); }
      }, 5000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Sync failed");
      setSyncingScorecard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="integrations-loading">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
      </div>
    );
  }

  const gmail = data?.gmail || {};
  const stripe = data?.stripe || {};
  const ai = data?.ai || {};
  const email = data?.email || {};
  const scorecard = data?.scorecard || {};
  const coachScraper = data?.coach_scraper || {};

  return (
    <div className="space-y-6 max-w-3xl" data-testid="admin-integrations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>Integrations</h1>
          <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>
            Manage connected services and API keys
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchIntegrations}
          className="gap-1.5"
          style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
          data-testid="integrations-refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Gmail */}
      <IntegrationCard
        icon={Mail}
        title="Gmail"
        subtitle="Send and receive coach emails directly from the app"
        status={gmail.connected}
        statusLabel={gmail.connected ? `${gmail.total_connected} user${gmail.total_connected !== 1 ? "s" : ""} connected` : "Not connected"}
        accent="bg-red-500/15 text-red-400"
      >
        {gmail.configured ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--t-text-muted)" }}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>OAuth credentials configured</span>
            </div>

            {gmail.connected_users?.length > 0 ? (
              <div className="space-y-2 mt-3">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Connected Accounts</span>
                {gmail.connected_users.map((u) => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg border"
                    style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}
                    data-testid={`gmail-user-${u.user_id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-red-400" />
                      <div>
                        <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{u.name || "User"}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--t-text-muted)" }}>{u.email}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectGmail(u.user_id)}
                      disabled={disconnecting === u.user_id}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1"
                      data-testid={`gmail-disconnect-${u.user_id}`}
                    >
                      {disconnecting === u.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "var(--t-text-muted)" }}>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>No users have connected Gmail yet. Users can connect from Settings.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--t-text-muted)" }}>
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Gmail OAuth credentials not configured. Add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env</span>
          </div>
        )}
      </IntegrationCard>

      {/* Stripe */}
      <IntegrationCard
        icon={CreditCard}
        title="Stripe"
        subtitle="Process subscription payments and manage billing"
        status={stripe.connected}
        statusLabel={stripe.connected ? "Connected" : "Not configured"}
        accent="bg-violet-500/15 text-violet-400"
        badge={stripe.connected ? { text: stripe.mode, class: stripe.is_live ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400" } : null}
      >
        <div className="space-y-4">
          {/* Current key info */}
          {stripe.connected && (
            <div className="space-y-1">
              <StatRow label="API Key" value={stripe.key_masked} />
              <StatRow label="Total Transactions" value={stripe.stats?.total_transactions || 0} />
              <StatRow label="Successful Payments" value={stripe.stats?.paid_transactions || 0} />
              <StatRow label="Pending" value={stripe.stats?.pending_transactions || 0} />
              <StatRow label="Revenue Collected" value={`$${(stripe.stats?.total_revenue || 0).toFixed(2)}`} />
            </div>
          )}

          {/* Update key form */}
          <div className="pt-2">
            <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--t-text-muted)" }}>
              {stripe.connected ? "Update API Key" : "Add Stripe API Key"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  placeholder="sk_test_... or sk_live_..."
                  className="pr-10 text-sm"
                  style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  data-testid="stripe-key-input"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--t-text-muted)" }}
                  data-testid="stripe-key-toggle"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={saveStripeKey}
                disabled={!stripeKey.trim() || saving}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
                data-testid="stripe-key-save"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: "var(--t-text-muted)" }}>
              Get your key from{" "}
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-0.5">
                Stripe Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </IntegrationCard>

      {/* AI */}
      <IntegrationCard
        icon={Sparkles}
        title="AI Assistant"
        subtitle="Claude Sonnet via Emergent LLM Key — powers email drafts, outreach insights, and highlight advice"
        status={ai.connected}
        statusLabel={ai.connected ? "Active" : "Not configured"}
        accent="bg-pink-500/15 text-pink-400"
      >
        <div className="space-y-1">
          {ai.connected ? (
            <>
              <StatRow label="Provider" value={ai.provider} />
              <StatRow label="API Key" value={ai.key_masked} />
              <StatRow label="Drafts This Month" value={ai.stats?.usage_this_month || 0} />
              <StatRow label="Drafts All-Time" value={ai.stats?.usage_total || 0} />
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--t-text-muted)" }}>
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Emergent LLM Key not configured. Add EMERGENT_LLM_KEY to .env</span>
            </div>
          )}
        </div>
      </IntegrationCard>

      {/* Email Notifications */}
      <IntegrationCard
        icon={Mail}
        title="Email Notifications"
        subtitle="Transactional emails via Resend — welcome emails and team invitations"
        status={email.connected}
        statusLabel={email.connected ? "Active" : "Not configured"}
        accent="bg-cyan-500/15 text-cyan-400"
      >
        <div className="space-y-4">
          {email.connected && (
            <div className="space-y-1">
              <StatRow label="Provider" value={email.provider || "Resend"} />
              <StatRow label="API Key" value={email.key_masked} />
              <StatRow label="Sender Address" value={email.sender_email} />
            </div>
          )}

          {/* Toggle email types */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Active Email Types</span>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Welcome Email</p>
                <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Sent when a new user registers</p>
              </div>
              <button
                onClick={() => toggleEmailSetting("welcome_email", !email.settings?.welcome_email)}
                disabled={togglingEmail === "welcome_email"}
                className={`w-11 h-6 rounded-full transition-colors relative ${email.settings?.welcome_email ? "bg-emerald-500" : "bg-zinc-600"}`}
                data-testid="toggle-welcome-email"
              >
                <span className={`absolute top-0.5 ${email.settings?.welcome_email ? "left-[22px]" : "left-0.5"} w-5 h-5 rounded-full bg-white transition-all shadow-sm`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Invitation Email</p>
                <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Sent when a team member is invited</p>
              </div>
              <button
                onClick={() => toggleEmailSetting("invitation_email", !email.settings?.invitation_email)}
                disabled={togglingEmail === "invitation_email"}
                className={`w-11 h-6 rounded-full transition-colors relative ${email.settings?.invitation_email ? "bg-emerald-500" : "bg-zinc-600"}`}
                data-testid="toggle-invitation-email"
              >
                <span className={`absolute top-0.5 ${email.settings?.invitation_email ? "left-[22px]" : "left-0.5"} w-5 h-5 rounded-full bg-white transition-all shadow-sm`} />
              </button>
            </div>
          </div>

          {/* Update key form */}
          <div className="pt-2">
            <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--t-text-muted)" }}>
              {email.connected ? "Update Resend API Key" : "Add Resend API Key"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showResendKey ? "text" : "password"}
                  value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                  placeholder="re_..."
                  className="pr-10 text-sm"
                  style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  data-testid="resend-key-input"
                />
                <button
                  onClick={() => setShowResendKey(!showResendKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--t-text-muted)" }}
                  data-testid="resend-key-toggle"
                >
                  {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={saveResendKey}
                disabled={!resendKey.trim() || savingResend}
                className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5"
                data-testid="resend-key-save"
              >
                {savingResend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: "var(--t-text-muted)" }}>
              Get your key from{" "}
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-0.5">
                Resend Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </IntegrationCard>

      {/* College Scorecard */}
      <IntegrationCard
        icon={GraduationCap}
        title="College Scorecard"
        subtitle="US Dept of Education data — admissions, graduation rates, tuition, SAT/ACT scores"
        status={scorecard.connected}
        statusLabel={scorecard.connected ? "Connected" : "Not configured"}
        accent="bg-blue-500/15 text-blue-400"
        badge={scorecard.connected ? { text: `${scorecard.stats?.synced_schools || 0} synced`, class: "bg-blue-500/15 text-blue-400" } : null}
      >
        <div className="space-y-4">
          {scorecard.connected && (
            <div className="space-y-1">
              <StatRow label="API Key" value={scorecard.key_masked} />
              <StatRow label="Schools Synced" value={`${scorecard.stats?.synced_schools || 0} of ${scorecard.stats?.total_universities || 0}`} />
            </div>
          )}

          {/* Sync button */}
          {scorecard.connected && (
            <Button
              onClick={syncScorecard}
              disabled={syncingScorecard}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              data-testid="scorecard-sync-btn"
            >
              {syncingScorecard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {syncingScorecard ? `Syncing... (${syncProgress})` : "Sync All Schools"}
            </Button>
          )}

          {/* Update key form */}
          <div className="pt-2">
            <label className="text-xs font-medium uppercase tracking-wider block mb-2" style={{ color: "var(--t-text-muted)" }}>
              {scorecard.connected ? "Update API Key" : "Add College Scorecard API Key"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showScorecardKey ? "text" : "password"}
                  value={scorecardKey}
                  onChange={(e) => setScorecardKey(e.target.value)}
                  placeholder="API key from api.data.gov"
                  className="pr-10 text-sm"
                  style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  data-testid="scorecard-key-input"
                />
                <button
                  onClick={() => setShowScorecardKey(!showScorecardKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--t-text-muted)" }}
                  data-testid="scorecard-key-toggle"
                >
                  {showScorecardKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                onClick={saveScorecardKey}
                disabled={!scorecardKey.trim() || savingScorecard}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                data-testid="scorecard-key-save"
              >
                {savingScorecard ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: "var(--t-text-muted)" }}>
              Free API key from{" "}
              <a href="https://api.data.gov/signup" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5">
                api.data.gov <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </IntegrationCard>

      {/* Coach Scraper */}
      <IntegrationCard
        icon={Search}
        title="Coach Finder"
        subtitle="Auto-scrape coaching staff names and emails from university athletics websites"
        status={coachScraper.stats?.has_coach_email > 0}
        statusLabel={coachScraper.stats?.has_coach_email > 0 ? `${coachScraper.stats.has_coach_email} found` : "Not run yet"}
        accent="bg-emerald-500/15 text-emerald-400"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <StatRow label="Schools with Coach Email" value={`${coachScraper.stats?.has_coach_email || 0} of ${coachScraper.stats?.total || 0}`} />
            <StatRow label="Missing Coach Data" value={coachScraper.stats?.missing_coach_email || 0} />
          </div>
          <Button
            onClick={scrapeCoaches}
            disabled={scrapingCoaches}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            data-testid="coach-scrape-btn"
          >
            {scrapingCoaches ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {scrapingCoaches ? `Scraping... (${scrapeProgress})` : "Find Coaches for All Schools"}
          </Button>
          <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>
            Scrapes university athletics websites for volleyball coaching staff. Finds names, titles, and email addresses.
          </p>
        </div>
      </IntegrationCard>
    </div>
  );
}
