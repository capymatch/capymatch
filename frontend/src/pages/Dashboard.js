import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { STATUS_GROUPS } from "../lib/constants";
import {
  BarChart3, Users, Bell, TrendingUp, ArrowRight, Calendar,
  Target, Send, MessageCircle, Trophy, Archive, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";

const STAGE_CONFIG = [
  { key: "Active - Not Contacted", icon: Target, color: "from-rose-500 to-pink-500", bg: "bg-rose-50", text: "text-rose-600", bar: "bg-rose-400" },
  { key: "Contacted - Awaiting Reply", icon: Send, color: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-400" },
  { key: "Active Conversations", icon: MessageCircle, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", text: "text-blue-600", bar: "bg-blue-400" },
  { key: "Offers / Serious Interest", icon: Trophy, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-400" },
  { key: "Closed / Archived", icon: Archive, color: "from-gray-400 to-slate-400", bg: "bg-gray-50", text: "text-gray-500", bar: "bg-gray-400" },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/dashboard")
      .then((res) => setData(res.data))
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="dashboard-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-xl" style={{ background: `linear-gradient(135deg, var(--t-hero-from), var(--t-hero-to))` }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
            <span className="text-slate-300 text-sm font-medium">Welcome back</span>
          </div>
          <h2 className="font-heading text-4xl font-black tracking-tight" data-testid="dashboard-title">
            {data.athlete_name ? `${data.athlete_name}'s Recruiting Hub` : "Recruiting Hub"}
          </h2>
          <p className="text-slate-300 mt-2 text-sm max-w-md">
            Track your progress, manage follow-ups, and stay on top of your college volleyball recruiting journey.
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-testid="stat-cards">
        <div className="bg-white dark:bg-[#141e30] rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow" style={{ borderColor: "var(--t-border)" }} data-testid="stat-total-schools">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Total Schools</p>
              <p className="font-heading text-4xl font-black mt-1" style={{ color: "var(--t-text)" }}>{data.total_schools}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--t-surface-alt)" }}>
              <Users className="w-7 h-7" style={{ color: "var(--t-accent)" }} strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
            <button onClick={() => navigate("/board")} className="text-xs font-medium flex items-center gap-1 transition-colors" style={{ color: "var(--t-accent)" }}>
              View Board <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141e30] rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow" style={{ borderColor: "var(--t-border)" }} data-testid="stat-follow-ups-due">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Follow-Ups Due</p>
              <p className="font-heading text-4xl font-black mt-1" style={{ color: "var(--t-text)" }}>{data.follow_ups_due}</p>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${data.follow_ups_due > 0 ? "bg-orange-500/20" : "bg-green-500/20"}`}>
              <Bell className={`w-7 h-7 ${data.follow_ups_due > 0 ? "text-orange-500" : "text-green-500"}`} strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
            <button onClick={() => navigate("/follow-ups")} className="text-orange-500 text-xs font-medium flex items-center gap-1 transition-colors">
              {data.follow_ups_due > 0 ? "Action needed" : "All caught up"} <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141e30] rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow" style={{ borderColor: "var(--t-border)" }} data-testid="stat-pipeline">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Active Pipeline</p>
              <p className="font-heading text-4xl font-black mt-1" style={{ color: "var(--t-text)" }}>
                {(data.status_counts?.["Contacted - Awaiting Reply"] || 0) + (data.status_counts?.["Active Conversations"] || 0)}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-blue-500" strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
            <button onClick={() => navigate("/knowledge-base")} className="text-blue-500 text-xs font-medium flex items-center gap-1 transition-colors">
              Browse Universities <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Pipeline Breakdown - wider */}
        <div className="lg:col-span-3 bg-white dark:bg-[#141e30] rounded-xl border shadow-sm p-6" style={{ borderColor: "var(--t-border)" }} data-testid="status-breakdown">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
            <h3 className="font-heading text-lg font-bold" style={{ color: "var(--t-text)" }}>Pipeline Breakdown</h3>
          </div>
          <div className="space-y-4">
            {STAGE_CONFIG.map((stage) => {
              const count = data.status_counts?.[stage.key] || 0;
              const pct = data.total_schools > 0 ? Math.round((count / data.total_schools) * 100) : 0;
              return (
                <div key={stage.key} className="group" data-testid={`breakdown-${stage.key.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${stage.bg} flex items-center justify-center flex-shrink-0`}>
                      <stage.icon className={`w-4 h-4 ${stage.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{stage.key}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--t-text-secondary)" }}>{count}</span>
                      </div>
                      <div className="w-full rounded-full h-2" style={{ backgroundColor: "var(--t-border)" }}>
                        <div className={`h-2 rounded-full ${stage.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => navigate("/board")}
            data-testid="go-to-board-btn"
            className="mt-5 flex items-center gap-1 text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors"
          >
            Go to Recruiting Board <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-[#141e30] rounded-xl border shadow-sm p-6" style={{ borderColor: "var(--t-border)" }} data-testid="recent-activity">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
            <h3 className="font-heading text-lg font-bold" style={{ color: "var(--t-text)" }}>Recent Activity</h3>
          </div>
          {data.recent_interactions && data.recent_interactions.length > 0 ? (
            <div className="space-y-1">
              {data.recent_interactions.map((int, i) => (
                <div key={int.interaction_id || i} className="flex items-start gap-3 p-3 rounded-lg transition-colors" style={{ backgroundColor: "transparent" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"} data-testid={`activity-${i}`}>
                  <div className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ring-2" style={{ backgroundColor: "var(--t-accent)", ringColor: "var(--t-border)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{int.university_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{int.type}{int.outcome ? ` - ${int.outcome}` : ""}</p>
                  </div>
                  <span className="text-[11px] whitespace-nowrap mt-0.5" style={{ color: "var(--t-text-faint)" }}>
                    {int.date_time ? new Date(int.date_time).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No recent activity</p>
              <p className="text-xs mt-1" style={{ color: "var(--t-text-faint)" }}>Interactions will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
