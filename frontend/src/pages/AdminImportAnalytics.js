import { useEffect, useState } from "react";
import {
  Mail, Users, School, UserCheck, Clock, TrendingUp,
  ArrowRight, AlertTriangle, ChevronDown, ChevronRight, Loader2
} from "lucide-react";
import api from "../lib/api";

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`import-stat-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>{value}</p>
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{label}</p>
          {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-faint)" }}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function FunnelStep({ label, value, total, isLast }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barWidth = total > 0 ? Math.max((value / total) * 100, 4) : 4;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}>{label}</span>
          <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>
            {value.toLocaleString()} {total > 0 && value !== total && <span style={{ color: "var(--t-text-faint)" }}>({pct}%)</span>}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${barWidth}%`, background: "linear-gradient(90deg, #1a8a80, #16a34a)" }}
          />
        </div>
      </div>
      {!isLast && <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-faint)" }} />}
    </div>
  );
}

function BehaviorStat({ label, value, total, format = "count" }) {
  const display = format === "pct" ? `${value}%` : value.toLocaleString();
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <span className="text-xs" style={{ color: "var(--t-text-secondary)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{display}</span>
    </div>
  );
}

function RunRow({ run }) {
  const [expanded, setExpanded] = useState(false);
  const confirmedCount = run.confirmed_school_ids?.length || 0;
  const scanAnalytics = run.scan_analytics || {};
  const confirmAnalytics = run.confirm_analytics || {};

  const statusColor = {
    ready: "#d97706",
    scanning: "#1a8a80",
    aggregating: "#1a8a80",
    failed: "#ef4444",
  };
  const isConfirmed = !!run.confirmed_at;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`import-run-${run.run_id}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-all"
      >
        {expanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-faint)" }} /> :
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-faint)" }} />}
        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>
            {run.user_name || run.user_email || "Unknown"}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isConfirmed ? "rgba(22,163,74,0.1)" : `${statusColor[run.status] || "#6b7280"}20`,
              color: isConfirmed ? "#16a34a" : (statusColor[run.status] || "#6b7280"),
            }}
          >
            {isConfirmed ? `Imported ${confirmedCount}` : run.status}
          </span>
          {run.error && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              Error
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[11px] flex-shrink-0" style={{ color: "var(--t-text-muted)" }}>
          <span>{run.schools_found || 0} found</span>
          <span>{run.messages_scanned || 0} msgs</span>
          <span>{run.started_at ? new Date(run.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t space-y-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {/* Scan details */}
          {scanAnalytics.scan_duration_s != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: "var(--t-text-faint)" }}>Scan</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniStat label="Duration" value={`${scanAnalytics.scan_duration_s}s`} />
                <MiniStat label="Passed Guardrails" value={scanAnalytics.passed_guardrails} />
                <MiniStat label="Filtered" value={scanAnalytics.filtered_by_guardrails} />
                <MiniStat label="Unmapped" value={scanAnalytics.unmapped_count} />
              </div>
            </div>
          )}
          {/* Confirm details */}
          {confirmAnalytics.created_count != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: "var(--t-text-faint)" }}>Confirm</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniStat label="Created" value={confirmAnalytics.created_count} />
                <MiniStat label="Skipped" value={confirmAnalytics.skipped_count} />
                <MiniStat label="Conversion" value={`${confirmAnalytics.conversion_rate}%`} />
                <MiniStat label="Coaches" value={confirmAnalytics.total_coaches_created} />
              </div>
              {confirmAnalytics.skip_reasons && Object.values(confirmAnalytics.skip_reasons).some(v => v > 0) && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {Object.entries(confirmAnalytics.skip_reasons).filter(([, v]) => v > 0).map(([k, v]) => (
                    <span key={k} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#f87171" }}>
                      {k.replace(/_/g, " ")}: {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Confirmed schools */}
          {run.confirmed_school_ids?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: "var(--t-text-faint)" }}>Schools Imported</p>
              <div className="flex flex-wrap gap-1.5">
                {run.confirmed_school_ids.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(26,138,128,0.1)", color: "#1a8a80" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Unmapped domains */}
          {run.unmapped_domains?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: "var(--t-text-faint)" }}>Unmapped Domains</p>
              <div className="flex flex-wrap gap-1.5">
                {run.unmapped_domains.map(d => (
                  <span key={d.domain} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(217,119,6,0.1)", color: "#d97706" }}>
                    {d.domain} ({d.count})
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Error */}
          {run.error && (
            <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.06)" }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400" />
              <p className="text-[11px] text-red-400">{typeof run.error === "string" ? run.error : run.error?.message || JSON.stringify(run.error)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="p-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
      <p className="text-[10px] mb-0.5" style={{ color: "var(--t-text-faint)" }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{value ?? "—"}</p>
    </div>
  );
}

export default function AdminImportAnalytics() {
  const [overview, setOverview] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [behavior, setBehavior] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [stages, setStages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/import-analytics/overview"),
      api.get("/admin/import-analytics/funnel"),
      api.get("/admin/import-analytics/behavior"),
      api.get("/admin/import-analytics/recent-runs"),
      api.get("/admin/import-analytics/stage-distribution"),
    ]).then(([ov, fn, bh, rn, st]) => {
      setOverview(ov.data);
      setFunnel(fn.data);
      setBehavior(bh.data);
      setRuns(rn.data.runs);
      setRunsTotal(rn.data.total);
      setStages(st.data.stages || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--t-text-muted)" }} />
      </div>
    );
  }

  const ov = overview || {};
  const fn = funnel || {};
  const bh = behavior || {};

  return (
    <div className="space-y-6" data-testid="admin-import-analytics">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Mail} label="Total Imports" value={ov.total_completed_imports || 0} color="bg-teal-600/15 text-teal-600" />
        <StatCard icon={Users} label="Unique Users" value={ov.unique_users || 0} color="bg-blue-600/15 text-blue-400" />
        <StatCard icon={School} label="Schools Imported" value={ov.total_schools_imported || 0} sub={`${ov.avg_schools_per_run || 0} avg per run`} color="bg-teal-700/15 text-teal-600" />
        <StatCard icon={UserCheck} label="Coaches Created" value={(ov.total_coaches_from_kb || 0) + (ov.total_coaches_from_gmail || 0)} sub={`${ov.total_coaches_from_kb || 0} KB · ${ov.total_coaches_from_gmail || 0} Gmail`} color="bg-amber-600/15 text-amber-400" />
        <StatCard icon={Clock} label="Avg Scan Time" value={`${ov.avg_scan_duration_s || 0}s`} color="bg-violet-600/15 text-violet-400" />
        <StatCard icon={TrendingUp} label="Avg Conversion" value={`${ov.avg_conversion_rate || 0}%`} color="bg-teal-600/15 text-teal-600" />
      </div>

      {/* Funnel + Behavior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--t-text)" }}>Import Funnel</h3>
          <div className="space-y-3">
            <FunnelStep label="Messages Scanned" value={fn.messages_scanned || 0} total={fn.messages_scanned || 0} />
            <FunnelStep label="Schools Found" value={fn.schools_found || 0} total={fn.messages_scanned || 1} />
            <FunnelStep label="High Confidence" value={fn.high_confidence || 0} total={fn.schools_found || 1} />
            <FunnelStep label="User Selected" value={fn.user_selected || 0} total={fn.high_confidence || 1} />
            <FunnelStep label="Actually Created" value={fn.actually_created || 0} total={fn.user_selected || 1} isLast />
          </div>
        </div>

        {/* User Behavior */}
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--t-text)" }}>User Behavior</h3>
          <div>
            <BehaviorStat label="Consent Screens Shown" value={bh.consent_shown || 0} />
            <BehaviorStat label="Imports Started" value={bh.started || 0} />
            <BehaviorStat label="Start Rate" value={bh.start_rate || 0} format="pct" />
            <BehaviorStat label="Previews Shown" value={bh.preview_shown || 0} />
            <BehaviorStat label="Abandoned at Preview" value={bh.abandoned || 0} />
            <BehaviorStat label="Abandon Rate" value={bh.abandon_rate || 0} format="pct" />
            <BehaviorStat label="Deselections" value={bh.total_deselections || 0} />
            <BehaviorStat label="Reselections" value={bh.total_reselections || 0} />
            <BehaviorStat label="Add Manually Clicks" value={bh.add_manually_clicks || 0} />
          </div>
        </div>
      </div>

      {/* Stage Distribution */}
      {Object.keys(stages).length > 0 && (
        <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--t-text)" }}>Stage Distribution (Confirmed)</h3>
          <div className="flex gap-3 flex-wrap">
            {Object.entries(stages).map(([stage, count]) => (
              <div key={stage} className="px-4 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(26,138,128,0.06)" }}>
                <p className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{count}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>{stage.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div>
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--t-text)" }}>
          Recent Import Runs {runsTotal > 0 && <span style={{ color: "var(--t-text-faint)" }}>({runsTotal})</span>}
        </h3>
        {runs.length === 0 ? (
          <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <Mail className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.1)" }} />
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No import runs yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map(run => (
              <RunRow key={run.run_id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
