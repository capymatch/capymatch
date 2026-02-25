import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Clock, CheckCircle2, XCircle, ArrowUpCircle, Link2, Upload, FileText,
  ChevronDown, Filter, RefreshCw, MessageSquare, ExternalLink
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending_verification: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Clock },
  verified: { label: "Verified", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: CheckCircle2 },
  promoted: { label: "Promoted", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: ArrowUpCircle },
  rejected: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: XCircle },
};

const CARD_TYPES = {
  roster_stability: "Roster Stability",
  timeline_intelligence: "Timeline Intel",
  scholarship_structure: "Scholarship",
  nil_readiness: "NIL Readiness",
  match_risk: "Match Risk",
};

const TYPE_ICONS = { link: Link2, upload: Upload, request: FileText };

function StatCard({ label, count, color, bg, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      data-testid={`stat-${label.toLowerCase()}`}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${active ? "ring-1" : "hover:border-white/15"}`}
      style={{
        background: active ? bg : "rgba(255,255,255,0.03)",
        borderColor: active ? color : "rgba(255,255,255,0.08)",
        ringColor: color,
      }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-left">
        <p className="text-xl font-bold" style={{ color: "var(--t-text)" }}>{count}</p>
        <p className="text-[11px] text-white/40 font-medium">{label}</p>
      </div>
    </button>
  );
}

function ContributionRow({ item, onAction, actionLoading }) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState(null);
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending_verification;
  const StatusIcon = status.icon;
  const TypeIcon = TYPE_ICONS[item.contribution_type] || FileText;

  const handleAction = (type) => {
    if (type === "reject" || type === "verify") {
      setActionType(type);
      setShowNotes(true);
    } else {
      onAction(item.contribution_id, type, "");
    }
  };

  const submitAction = () => {
    onAction(item.contribution_id, actionType, notes);
    setShowNotes(false);
    setNotes("");
    setActionType(null);
  };

  const isPending = item.status === "pending_verification";
  const isVerified = item.status === "verified";

  return (
    <div
      className="border rounded-xl overflow-hidden transition-all hover:border-white/15"
      style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
      data-testid={`contribution-row-${item.contribution_id}`}
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Left: Type icon + info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
            <TypeIcon className="w-4 h-4" style={{ color: "var(--t-muted)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
                {item.university_name || "Unknown School"}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: status.bg, color: status.color }}>
                {status.label}
              </span>
            </div>
            <p className="text-xs mb-1" style={{ color: "var(--t-muted)" }}>
              <span className="font-medium" style={{ color: "var(--t-sub)" }}>
                {CARD_TYPES[item.card_type] || item.card_type}
              </span>
              {" "}— {item.contribution_type === "link" ? "Link submitted" : item.contribution_type === "upload" ? "File uploaded" : "Data request"}
            </p>
            {item.data && (
              <p className="text-xs truncate max-w-md" style={{ color: "rgba(255,255,255,0.35)" }}>
                {item.contribution_type === "link" ? (
                  <a href={item.data} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline" style={{ color: "#2dd4bf" }}>
                    {item.data} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : item.data}
              </p>
            )}
            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
              {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {item.created_by && ` — ${item.created_by}`}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-12 sm:ml-0">
          {isPending && (
            <>
              <button onClick={() => handleAction("verify")}
                disabled={actionLoading === item.contribution_id}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                data-testid={`verify-btn-${item.contribution_id}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Verify
              </button>
              <button onClick={() => handleAction("reject")}
                disabled={actionLoading === item.contribution_id}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                data-testid={`reject-btn-${item.contribution_id}`}>
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}
          {isVerified && (
            <>
              <button onClick={() => handleAction("promote")}
                disabled={actionLoading === item.contribution_id}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10b981" }}
                data-testid={`promote-btn-${item.contribution_id}`}>
                <ArrowUpCircle className="w-3.5 h-3.5" /> Promote
              </button>
              <button onClick={() => handleAction("reject")}
                disabled={actionLoading === item.contribution_id}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                data-testid={`reject-btn-${item.contribution_id}`}>
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}
          {item.rejection_reason && (
            <span className="text-[10px] italic max-w-[200px] truncate" style={{ color: "rgba(239,68,68,0.6)" }}>
              {item.rejection_reason}
            </span>
          )}
        </div>
      </div>

      {/* Notes input */}
      {showNotes && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={actionType === "reject" ? "Reason for rejection (optional)" : "Admin notes (optional)"}
              className="flex-1 h-8 px-3 rounded-lg text-xs bg-white/5 border border-white/10 outline-none focus:border-white/20"
              style={{ color: "var(--t-text)" }}
              data-testid={`notes-input-${item.contribution_id}`}
            />
            <button onClick={submitAction}
              className="h-8 px-4 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: actionType === "reject" ? "#ef4444" : "#3b82f6" }}
              data-testid={`confirm-action-${item.contribution_id}`}>
              Confirm
            </button>
            <button onClick={() => { setShowNotes(false); setActionType(null); }}
              className="h-8 px-3 rounded-lg text-xs text-white/40 hover:text-white/60">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminContributions() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ pending: 0, verified: 0, promoted: 0, rejected: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [listRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/admin/contributions`, { params, withCredentials: true }),
        axios.get(`${API}/api/admin/contributions/stats`, { withCredentials: true }),
      ]);
      setItems(listRes.data.items);
      setStats(statsRes.data);
    } catch (err) {
      toast.error("Failed to load contributions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (contributionId, action, notes) => {
    setActionLoading(contributionId);
    try {
      const body = action === "reject" ? { reason: notes } : { notes };
      await axios.patch(
        `${API}/api/admin/contributions/${contributionId}/${action}`,
        body,
        { withCredentials: true }
      );
      toast.success(`Contribution ${action === "verify" ? "verified" : action === "reject" ? "rejected" : "promoted"}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFilter = (status) => {
    setStatusFilter(prev => prev === status ? null : status);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="admin-contributions-page">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Pending" count={stats.pending} active={statusFilter === "pending_verification"} onClick={() => toggleFilter("pending_verification")} {...STATUS_CONFIG.pending_verification} />
        <StatCard label="Verified" count={stats.verified} active={statusFilter === "verified"} onClick={() => toggleFilter("verified")} {...STATUS_CONFIG.verified} />
        <StatCard label="Promoted" count={stats.promoted} active={statusFilter === "promoted"} onClick={() => toggleFilter("promoted")} {...STATUS_CONFIG.promoted} />
        <StatCard label="Rejected" count={stats.rejected} active={statusFilter === "rejected"} onClick={() => toggleFilter("rejected")} {...STATUS_CONFIG.rejected} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
            {statusFilter ? `${STATUS_CONFIG[statusFilter]?.label || ""} Contributions` : "All Contributions"}
          </h3>
          <p className="text-xs" style={{ color: "var(--t-muted)" }}>{items.length} of {stats.total} total</p>
        </div>
        <button onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
          style={{ color: "var(--t-muted)", border: "1px solid rgba(255,255,255,0.1)" }}
          data-testid="refresh-contributions">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" style={{ color: "var(--t-muted)" }} />
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>Loading contributions...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
            <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--t-text)" }}>No contributions yet</p>
            <p className="text-xs" style={{ color: "var(--t-muted)" }}>
              {statusFilter ? "No contributions match this filter." : "User-submitted improvements will appear here for review."}
            </p>
          </div>
        ) : (
          items.map(item => (
            <ContributionRow key={item.contribution_id} item={item} onAction={handleAction} actionLoading={actionLoading} />
          ))
        )}
      </div>
    </div>
  );
}
