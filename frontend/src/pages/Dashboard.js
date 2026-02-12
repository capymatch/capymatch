import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Check, ChevronRight, Clock, Users, Award, TrendingUp, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/dashboard"),
      api.get("/programs"),
    ])
      .then(([dashRes, progRes]) => {
        setData(dashRes.data);
        setPrograms(progRes.data);
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

  // Funnel stages with counts from real data
  const funnelStages = [
    { label: "Not Contacted", count: programs.filter(p => p.recruiting_status === "Not Contacted").length, color: "#6366f1" },
    { label: "Contacted", count: programs.filter(p => p.recruiting_status === "Contacted").length, color: "#8b5cf6" },
    { label: "Video Viewed", count: programs.filter(p => p.recruiting_status === "Video Viewed").length, color: "#a78bfa" },
    { label: "No Response Yet", count: programs.filter(p => p.recruiting_status === "No Response Yet").length, color: "#fbbf24" },
    { label: "Some Interest", count: programs.filter(p => p.recruiting_status === "Some Interest").length, color: "#f59e0b" },
    { label: "Active Conversation", count: programs.filter(p => p.recruiting_status === "Active Conversation").length, color: "#f97316" },
    { label: "Offered", count: programs.filter(p => p.recruiting_status === "Offer / Commit Talk").length, color: "#22c55e" },
    { label: "Closed", count: programs.filter(p => p.recruiting_status === "Not a Fit / Closed").length, color: "#64748b" },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Welcome back! Here's your recruiting overview.</p>
        </div>
        <button 
          onClick={() => navigate("/knowledge-base")}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add School
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{totalSchools}</p>
              <p className="text-white/60 text-sm mt-1">Active Schools</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{offersCount}</p>
              <p className="text-white/60 text-sm mt-1">Offers Received</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>
        <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{followUpsDue}</p>
              <p className="text-white/60 text-sm mt-1">Follow-ups Due</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left Column */}
        <div className="col-span-5 space-y-5">
          {/* Progress Funnel */}
          <div className="rounded-xl p-5 border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="text-white font-semibold">Recruiting Pipeline</h3>
            </div>
            <div className="space-y-3">
              {funnelStages.map((stage, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-white/60 text-sm w-36 truncate">{stage.label}</span>
                  <div className="flex-1 h-5 rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${stage.count > 0 ? Math.max((stage.count / maxFunnel) * 100, 10) : 0}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                  <span className="text-white font-medium w-8 text-right">{stage.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl p-5 border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Recent Activity</h3>
              </div>
              <button 
                onClick={() => navigate("/inbox")}
                className="text-white/50 text-sm hover:text-white transition-colors"
              >
                View all
              </button>
            </div>
            {data.recent_interactions && data.recent_interactions.length > 0 ? (
              <div className="space-y-3">
                {data.recent_interactions.slice(0, 4).map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: avatarColors[i % avatarColors.length] }}
                    >
                      {item.university_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.university_name}</p>
                      <p className="text-white/40 text-xs">{item.type} • {item.outcome || "Pending"}</p>
                    </div>
                    <span className="text-white/30 text-xs">
                      {item.date_time ? formatDate(item.date_time) : "Recently"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-7 space-y-5">
          {/* Priority Schools */}
          <div className="rounded-xl p-5 border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="text-white font-semibold">Schools Requiring Action</h3>
              </div>
              <button 
                onClick={() => navigate("/follow-ups")}
                className="text-white/50 text-sm hover:text-white transition-colors flex items-center gap-1"
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
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: avatarColors[i % avatarColors.length] }}
                    >
                      {prog.university_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm group-hover:text-purple-300 transition-colors truncate">
                        {prog.university_name}
                      </p>
                      <p className="text-white/40 text-xs">
                        {prog.recruiting_status || "Not Contacted"} • {prog.division || ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-medium hover:bg-purple-600 hover:text-white transition-colors">
                        Follow Up
                      </span>
                    </div>
                    <span className="text-white/40 text-xs w-16 text-right">
                      {prog.next_action_due ? formatDate(prog.next_action_due) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No schools added yet</p>
                <button 
                  onClick={() => navigate("/knowledge-base")}
                  className="mt-3 text-purple-400 text-sm hover:text-purple-300 transition-colors"
                >
                  + Add your first school
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-5 border border-white/10 bg-white/[0.02]">
              <h4 className="text-white/60 text-sm mb-3">By Division</h4>
              <div className="space-y-2">
                {["D1", "D2", "D3", "NAIA"].map((div) => {
                  const count = programs.filter(p => p.division === div).length;
                  return (
                    <div key={div} className="flex items-center justify-between">
                      <span className="text-white/80 text-sm">{div}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl p-5 border border-white/10 bg-white/[0.02]">
              <h4 className="text-white/60 text-sm mb-3">By Priority</h4>
              <div className="space-y-2">
                {["Very High", "High", "Medium", "Low"].map((priority) => {
                  const count = programs.filter(p => p.priority === priority).length;
                  const colors = {
                    "Very High": "text-red-400",
                    "High": "text-orange-400",
                    "Medium": "text-blue-400",
                    "Low": "text-white/60"
                  };
                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <span className={`text-sm ${colors[priority]}`}>{priority}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
