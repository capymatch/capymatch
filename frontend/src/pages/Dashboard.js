import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Check, ChevronRight, TrendingUp, Target, Award, Clock, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const FUNNEL_STAGES = [
  { key: "Not Contacted", color: "#ef4444", label: "Not Contacted" },
  { key: "Contacted", color: "#22c55e", label: "Contacted" },
  { key: "Video Viewed", color: "#06b6d4", label: "Video Viewed" },
  { key: "No Response Yet", color: "#f59e0b", label: "No Response Yet" },
  { key: "Some Interest", color: "#3b82f6", label: "Some Interest" },
  { key: "Active Conversation", color: "#6366f1", label: "Active Conversation" },
  { key: "Offer / Commit Talk", color: "#a855f7", label: "Offered" },
  { key: "Not a Fit / Closed", color: "#64748b", label: "Closed" },
];

// School logo component with initials
const SchoolLogo = ({ name, color = "#6366f1", size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-14 h-14 text-base"
  };
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ backgroundColor: color }}
    >
      {name?.charAt(0) || "?"}
    </div>
  );
};

// Checkmark component
const CheckMark = ({ checked = true, color = "#22c55e" }) => (
  <div 
    className="w-7 h-7 rounded-full flex items-center justify-center"
    style={{ backgroundColor: checked ? color : "transparent", border: checked ? "none" : "2px solid rgba(255,255,255,0.3)" }}
  >
    {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
  </div>
);

// Card section component
const CardSection = ({ title, children, onViewAll }) => (
  <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(30, 25, 50, 0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-white text-lg font-semibold">{title}</h3>
      {onViewAll && (
        <button onClick={onViewAll} className="text-white/50 text-sm hover:text-white flex items-center gap-1 transition-colors">
          View all <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
    {children}
  </div>
);

// Stat card
const StatCard = ({ value, label, icon: Icon, color }) => (
  <div className="rounded-2xl p-5 relative overflow-hidden" style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="text-white/60 text-sm mt-1">{label}</p>
      </div>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}30` }}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/dashboard"),
      api.get("/programs"),
      api.get("/follow-ups")
    ])
      .then(([dashRes, progRes, fuRes]) => {
        setData(dashRes.data);
        setPrograms(progRes.data);
        setFollowUps(fuRes.data);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="dashboard-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-purple-400/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-white/60 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // Calculate stats
  const funnelData = FUNNEL_STAGES.map(stage => ({
    ...stage,
    count: programs.filter(p => p.recruiting_status === stage.key).length
  }));
  const maxCount = Math.max(...funnelData.map(s => s.count), 1);
  const offersCount = programs.filter(p => p.recruiting_status === "Offer / Commit Talk").length;
  const activeSchools = programs.filter(p => !["Not a Fit / Closed"].includes(p.recruiting_status));

  // School colors for variety
  const schoolColors = ["#1e3a5f", "#7c2d12", "#4338ca", "#0f766e", "#7e22ce", "#b91c1c", "#0369a1"];

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div data-testid="dashboard" className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Dashboard</h1>
        <Button 
          onClick={() => navigate("/knowledge-base")}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          + Add School
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard value={activeSchools.length} label="Active Schools" icon={Users} color="#3b82f6" />
        <StatCard value={offersCount} label="Offers" icon={Award} color="#a855f7" />
        <StatCard value={data.follow_ups_due} label="Follow-Ups Due" icon={Clock} color="#22c55e" />
      </div>

      {/* Main Grid - 3 columns */}
      <div className="grid grid-cols-12 gap-5">
        
        {/* LEFT COLUMN - Progress Funnel */}
        <div className="col-span-4">
          <CardSection title="Progress Funnel">
            <div className="space-y-3">
              {funnelData.map((stage) => (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className="w-28 text-right flex-shrink-0">
                    <span className="text-white/60 text-xs">{stage.label}</span>
                  </div>
                  <div className="flex-1 h-6 rounded bg-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded transition-all duration-500"
                      style={{ 
                        width: `${Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 10 : 0)}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                  <div className="w-8 text-right">
                    <span className="text-white font-semibold text-sm">{stage.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardSection>
        </div>

        {/* MIDDLE COLUMN - Next Actions */}
        <div className="col-span-4">
          <CardSection title="Next Actions" onViewAll={() => navigate("/follow-ups")}>
            <div className="space-y-1">
              {programs.slice(0, 4).map((prog, i) => (
                <div 
                  key={prog.program_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/programs/${prog.program_id}`)}
                >
                  <CheckMark checked={true} color={i % 2 === 0 ? "#22c55e" : "#f59e0b"} />
                  <SchoolLogo name={prog.university_name} color={schoolColors[i % schoolColors.length]} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{prog.university_name}</p>
                    <p className="text-white/40 text-xs">{formatDate(prog.next_action_due)} – {prog.recruiting_status?.split(' ')[0] || 'Active'}</p>
                  </div>
                  <button 
                    className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                    style={{ 
                      backgroundColor: i === 2 ? "rgba(217, 175, 107, 0.3)" : "rgba(139, 128, 158, 0.4)",
                      color: i === 2 ? "#d9af6b" : "#c4b8d9"
                    }}
                  >
                    {i === 2 ? "Send Foxcht" : "Send Follow-Up"}
                  </button>
                  <span className="text-white/50 text-xs whitespace-nowrap">{formatDate(prog.next_action_due)}</span>
                </div>
              ))}
            </div>
          </CardSection>
        </div>

        {/* RIGHT COLUMN - Recent Emails & Top Schools */}
        <div className="col-span-4 space-y-5">
          {/* Recent Emails */}
          <CardSection title="Recent Emails" onViewAll={() => navigate("/inbox")}>
            <div className="space-y-1">
              {data.recent_interactions?.slice(0, 2).map((int, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center overflow-hidden">
                    <span className="text-white font-bold text-sm">{int.university_name?.charAt(0) || "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {int.university_name?.split(' ')[0] || "Coach"} 
                      <span className="text-white/40 font-normal ml-2">| Inbox</span>
                    </p>
                    <p className="text-white/40 text-xs truncate">{int.outcome || "Email conversation..."}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/50 text-xs">Last email 2d ago<ChevronRight className="w-3 h-3 inline ml-1" /></p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/30 text-blue-300">Some Interest</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/30 text-purple-300">Apr 223</span>
                    </div>
                  </div>
                </div>
              )) || (
                <p className="text-white/40 text-sm text-center py-4">No recent emails</p>
              )}
            </div>
          </CardSection>

          {/* Top Active Schools */}
          <CardSection title="Top Active Schools" onViewAll={() => navigate("/knowledge-base")}>
            <div className="space-y-1">
              {programs.slice(0, 3).map((school, i) => (
                <div 
                  key={school.program_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/programs/${school.program_id}`)}
                >
                  <SchoolLogo name={school.university_name} color={schoolColors[(i + 3) % schoolColors.length]} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{school.university_name}</p>
                    <p className="text-white/40 text-xs">Last email done responding <ChevronRight className="w-3 h-3 inline" /></p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/50 text-xs">Last email 2d ago <ChevronRight className="w-3 h-3 inline" /></p>
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-medium mt-1 inline-block"
                      style={{ 
                        backgroundColor: i === 0 ? "rgba(139, 92, 246, 0.3)" : "rgba(100, 116, 139, 0.3)",
                        color: i === 0 ? "#a78bfa" : "#94a3b8"
                      }}
                    >
                      {i === 0 ? "17 days without responding" : "1 day without response"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardSection>
        </div>
      </div>
    </div>
  );
}
