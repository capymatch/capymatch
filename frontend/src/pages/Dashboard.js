import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { ChevronRight, Calendar, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/dashboard"),
      api.get("/programs"),
      api.get("/events"),
    ])
      .then(([dashRes, progRes, evtRes]) => {
        setData(dashRes.data);
        setPrograms(progRes.data);
        setEvents(evtRes.data);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-32" data-testid="dashboard-loading">
        <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate real stats
  const totalSchools = programs.length;
  const offersCount = programs.filter(p => p.recruiting_status === "Offer / Commit Talk").length;
  const followUpsDue = data.follow_ups_due || 0;

  // Funnel stages with counts from real data — each maps to a pipeline section key
  const funnelStages = [
    { label: "Not Contacted", count: programs.filter(p => p.recruiting_status === "Not Contacted").length, color: "#6366f1", sectionKey: "not_contacted" },
    { label: "Contacted", count: programs.filter(p => p.recruiting_status === "Contacted").length, color: "#8b5cf6", sectionKey: "contacted" },
    { label: "Video Viewed", count: programs.filter(p => p.recruiting_status === "Video Viewed").length, color: "#a78bfa", sectionKey: "contacted" },
    { label: "No Response Yet", count: programs.filter(p => p.recruiting_status === "No Response Yet").length, color: "#fbbf24", sectionKey: "contacted" },
    { label: "Some Interest", count: programs.filter(p => p.recruiting_status === "Some Interest").length, color: "#f59e0b", sectionKey: "active" },
    { label: "Active Conversation", count: programs.filter(p => p.recruiting_status === "Active Conversation").length, color: "#f97316", sectionKey: "active" },
    { label: "Offered", count: programs.filter(p => p.recruiting_status === "Offer / Commit Talk").length, color: "#22c55e", sectionKey: "offers" },
    { label: "Closed", count: programs.filter(p => p.recruiting_status === "Not a Fit / Closed").length, color: "#64748b", sectionKey: "closed" },
  ];
  const maxFunnel = Math.max(...funnelStages.map(s => s.count), 1);

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // School colors for avatars
  const avatarColors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#6366f1"];

  return (
    <div data-testid="dashboard" className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>Welcome back! Here's your recruiting overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", borderColor: "var(--t-border)" }}>
          <p className="text-3xl font-bold" style={{ color: "var(--t-text)" }}>{totalSchools}</p>
          <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>Active Schools</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", borderColor: "var(--t-border)" }}>
          <p className="text-3xl font-bold" style={{ color: "var(--t-text)" }}>{offersCount}</p>
          <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>Offers Received</p>
        </div>
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", borderColor: "var(--t-border)" }}>
          <p className="text-3xl font-bold" style={{ color: "var(--t-text)" }}>{followUpsDue}</p>
          <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>Follow-ups Due</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: "var(--t-border)" }} />

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column */}
        <div className="col-span-5 space-y-5">
          {/* Progress Funnel */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <h3 className="font-semibold mb-5" style={{ color: "var(--t-text)" }}>Recruiting Pipeline</h3>
            <div className="space-y-8">
              {funnelStages.map((stage, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <span className="text-sm w-36 truncate" style={{ color: "var(--t-text-muted)" }}>{stage.label}</span>
                  <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${stage.count > 0 ? Math.max((stage.count / maxFunnel) * 100, 10) : 0}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                  <span className="font-medium w-8 text-right" style={{ color: "var(--t-text)" }}>{stage.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: "var(--t-border)" }} />

          {/* Recent Activity */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold" style={{ color: "var(--t-text)" }}>Recent Activity</h3>
              <button 
                onClick={() => navigate("/inbox")}
                className="text-sm transition-colors"
                style={{ color: "var(--t-text-muted)" }}
              >
                View all
              </button>
            </div>
            {data.recent_interactions && data.recent_interactions.length > 0 ? (
              <div className="space-y-3">
                {data.recent_interactions.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg transition-colors" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: avatarColors[i % avatarColors.length] }}
                    >
                      {item.university_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{item.university_name}</p>
                      <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>{item.type} • {item.outcome || "Pending"}</p>
                    </div>
                    <span className="text-xs" style={{ color: "var(--t-text-faint)" }}>
                      {item.date_time ? formatDate(item.date_time) : "Recently"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-7 space-y-5">
          {/* Priority Schools */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold" style={{ color: "var(--t-text)" }}>Schools Requiring Action</h3>
              <button 
                onClick={() => navigate("/follow-ups")}
                className="text-sm transition-colors flex items-center gap-1"
                style={{ color: "var(--t-text-muted)" }}
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {programs.length > 0 ? (
              <div className="space-y-2">
                {programs.slice(0, 5).map((prog, i) => (
                  <div 
                    key={prog.program_id}
                    onClick={() => navigate(`/programs/${prog.program_id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer group"
                    style={{ backgroundColor: "var(--t-surface-alt)" }}
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: avatarColors[i % avatarColors.length] }}
                    >
                      {prog.university_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm group-hover:text-purple-500 transition-colors truncate" style={{ color: "var(--t-text)" }}>
                        {prog.university_name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                        {prog.recruiting_status || "Not Contacted"} • {prog.division || ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-600 hover:text-white transition-colors" style={{ backgroundColor: "var(--t-surface)", color: "var(--t-text-secondary)" }}>
                        Follow Up
                      </span>
                    </div>
                    <span className="text-xs w-16 text-right" style={{ color: "var(--t-text-muted)" }}>
                      {prog.next_action_due ? formatDate(prog.next_action_due) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No schools added yet</p>
                <button 
                  onClick={() => navigate("/knowledge-base")}
                  className="mt-3 text-purple-500 text-sm hover:text-purple-400 transition-colors"
                >
                  + Add your first school
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" style={{ borderColor: "var(--t-border)" }} />

          {/* Upcoming Events */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="flex items-center justify-between px-5 py-4">
              <h4 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Upcoming Events</h4>
              <button onClick={() => navigate("/calendar")} className="text-xs text-purple-500 hover:text-purple-400 transition-colors flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              const upcoming = events.filter(e => e.start_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 5);
              const typeBg = { Camp: "bg-purple-500/15 text-purple-400", Showcase: "bg-blue-500/15 text-blue-400", Tournament: "bg-amber-500/15 text-amber-400", Visit: "bg-emerald-500/15 text-emerald-400", Tryout: "bg-pink-500/15 text-pink-400", Meeting: "bg-cyan-500/15 text-cyan-400", Deadline: "bg-red-500/15 text-red-400", Other: "bg-gray-500/15 text-gray-400" };
              const formatDate = (d) => { const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
              if (upcoming.length === 0) return (
                <div className="text-center py-8 px-5">
                  <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
                  <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No upcoming events</p>
                  <button onClick={() => navigate("/calendar")} className="mt-2 text-sm text-purple-500 hover:text-purple-400">+ Add event</button>
                </div>
              );
              return (
                <table className="w-full">
                  <thead>
                    <tr className="border-t border-b" style={{ borderColor: "var(--t-border)" }}>
                      <th className="text-left text-[11px] font-medium uppercase tracking-wider px-5 py-2.5" style={{ color: "var(--t-text-muted)" }}>Event</th>
                      <th className="text-left text-[11px] font-medium uppercase tracking-wider px-4 py-2.5" style={{ color: "var(--t-text-muted)" }}>Date</th>
                      <th className="text-left text-[11px] font-medium uppercase tracking-wider px-4 py-2.5" style={{ color: "var(--t-text-muted)" }}>Location</th>
                      <th className="text-right text-[11px] font-medium uppercase tracking-wider px-5 py-2.5" style={{ color: "var(--t-text-muted)" }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((evt) => (
                      <tr
                        key={evt.event_id}
                        onClick={() => navigate("/calendar")}
                        className="border-b cursor-pointer transition-colors"
                        style={{ borderColor: "var(--t-border)" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td className="px-5 py-3">
                          <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{evt.title}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs whitespace-nowrap" style={{ color: "var(--t-text-secondary)" }}>
                            {formatDate(evt.start_date)}{evt.end_date && evt.end_date !== evt.start_date ? ` – ${formatDate(evt.end_date)}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{evt.location || "—"}</span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-md ${typeBg[evt.event_type] || "bg-gray-500/15 text-gray-400"}`}>
                            {evt.event_type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
