import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, School, MessageSquare, Eye, Calendar, Mail,
  CheckCircle2, XCircle, Shield
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import api from "../lib/api";
import { toast } from "sonner";

const PLAN_BADGE = {
  basic: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  pro: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  premium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <span className="text-xs flex items-center gap-2" style={{ color: "var(--t-text-muted)" }}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className="text-xs font-medium" style={{ color: "var(--t-text)" }}>{value || "—"}</span>
    </div>
  );
}

function StatMini({ label, value, color }) {
  return (
    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>{label}</p>
    </div>
  );
}

export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDetail = () => {
    setLoading(true);
    api.get(`/admin/users/${userId}`).then(res => {
      setData(res.data);
      setSelectedPlan(res.data.tenant?.plan || "basic");
      setSelectedStatus(res.data.tenant?.status || "active");
    }).catch(() => {
      toast.error("User not found");
      navigate("/admin/users");
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDetail(); }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/users/${userId}`, {
        plan: selectedPlan,
        status: selectedStatus,
      });
      toast.success("User updated");
      fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { user, tenant, profile, stats, recent_interactions, programs, subscription } = data;
  const plan = tenant?.plan || "basic";

  return (
    <div className="space-y-5" data-testid="admin-user-detail">
      {/* Back */}
      <button onClick={() => navigate("/admin/users")} className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-teal-400" style={{ color: "var(--t-text-muted)" }} data-testid="admin-back-to-users">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Users
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="w-14 h-14 rounded-xl bg-teal-600/15 flex items-center justify-center text-teal-400 text-xl font-bold flex-shrink-0">
          {(tenant?.athlete_name || user?.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{tenant?.athlete_name || user?.name}</h2>
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_BADGE[plan]}`}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
            <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>
              Joined {tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <StatMini label="Schools" value={stats.school_count} color="text-blue-400" />
        <StatMini label="Interactions" value={stats.interaction_count} color="text-amber-400" />
        <StatMini label="Events" value={stats.event_count} color="text-violet-400" />
        <StatMini label="Views (7d)" value={stats.profile_views_week} color="text-emerald-400" />
        <StatMini label="Views Total" value={stats.profile_views_total} color="text-teal-400" />
        <StatMini label="Gmail" value={stats.gmail_connected ? "Yes" : "No"} color={stats.gmail_connected ? "text-emerald-400" : "text-gray-500"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Manage Subscription */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
            <Shield className="w-4 h-4 text-teal-400" /> Manage Account
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-secondary)" }}>Subscription Plan</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="admin-user-plan-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-secondary)" }}>Account Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="admin-user-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs" data-testid="admin-user-save-btn">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Plan Features */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--t-text)" }}>
            Current Plan Features ({plan.charAt(0).toUpperCase() + plan.slice(1)})
          </h3>
          <div className="space-y-0.5">
            <InfoRow label="Max Schools" value={subscription?.max_schools === -1 ? "Unlimited" : subscription?.max_schools} icon={School} />
            <InfoRow label="AI Drafts/Month" value={subscription?.ai_drafts_per_month === -1 ? "Unlimited" : subscription?.ai_drafts_per_month === 0 ? "None" : subscription?.ai_drafts_per_month} icon={MessageSquare} />
            <FeatureRow label="Gmail Integration" enabled={subscription?.gmail_integration} />
            <FeatureRow label="Follow-up Reminders" enabled={subscription?.follow_up_reminders} />
            <FeatureRow label="Recruiting Insights" enabled={subscription?.recruiting_insights} />
            <FeatureRow label="Auto Reply Detection" enabled={subscription?.auto_reply_detection} />
            <FeatureRow label="Weekly Digest" enabled={subscription?.weekly_digest} />
            <FeatureRow label="Public Profile" enabled={subscription?.public_profile} />
            <FeatureRow label="Analytics" enabled={subscription?.analytics} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--t-text)" }}>Recent Activity</h3>
        {recent_interactions.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--t-text-muted)" }}>No interactions yet</p>
        ) : (
          <div className="space-y-0">
            {recent_interactions.map((ix, i) => (
              <div key={ix.interaction_id || i} className="flex items-center gap-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="w-7 h-7 rounded-lg bg-teal-600/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--t-text)" }}>
                    {ix.type} — {ix.university_name || "Unknown school"}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>
                    {ix.outcome || "No outcome"} {ix.date_time ? `| ${new Date(ix.date_time).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schools on Board */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--t-text)" }}>Schools on Board ({programs.length})</h3>
        {programs.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--t-text-muted)" }}>No schools added yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {programs.map(p => (
              <div key={p.program_id || p.university_name} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 flex-shrink-0">{p.division || "—"}</span>
                <span className="text-xs truncate" style={{ color: "var(--t-text)" }}>{p.university_name}</span>
                <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: "var(--t-text-muted)" }}>{p.recruiting_status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureRow({ label, enabled }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{label}</span>
      {enabled ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-600" />
      )}
    </div>
  );
}
