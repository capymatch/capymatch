import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Check, ChevronRight, Calendar, X, TrendingUp, Users, Award, Clock, Send, Mail, School } from "lucide-react";
import { toast } from "sonner";

// Glassmorphism Card Component
const GlassCard = ({ children, className = "", hover = true }) => (
  <div 
    className={`rounded-2xl backdrop-blur-sm border border-white/[0.08] ${hover ? 'hover:border-white/[0.15] transition-all duration-300' : ''} ${className}`}
    style={{ 
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
    }}
  >
    {children}
  </div>
);

// Stat Card Component
const StatCard = ({ value, subValue, label, icon: Icon, gradient }) => (
  <GlassCard className="p-5 relative overflow-hidden group">
    <div 
      className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500"
      style={{ background: gradient }}
    />
    <div className="relative flex items-start justify-between">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-white tracking-tight">{value}</span>
          {subValue && <span className="text-xl text-white/50">{subValue}</span>}
        </div>
        <p className="text-white/50 text-sm mt-1 font-medium">{label}</p>
      </div>
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: gradient }}
      >
        <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
      </div>
    </div>
  </GlassCard>
);

// School Avatar
const SchoolAvatar = ({ name, color, size = "md" }) => {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-11 h-11 text-sm", lg: "w-14 h-14 text-base" };
  return (
    <div 
      className={`${sizes[size]} rounded-xl flex items-center justify-center text-white font-bold shadow-lg`}
      style={{ background: color }}
    >
      {name?.charAt(0) || "?"}
    </div>
  );
};

// Checkmark Badge
const CheckBadge = ({ variant = "success" }) => {
  const colors = {
    success: "from-emerald-500 to-emerald-600",
    warning: "from-amber-500 to-orange-500",
    info: "from-blue-500 to-indigo-500"
  };
  return (
    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${colors[variant]} flex items-center justify-center shadow-lg`}>
      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
    </div>
  );
};

// Section Header
const SectionHeader = ({ title, onViewAll }) => (
  <div className="flex items-center justify-between mb-5">
    <h3 className="text-white font-semibold text-lg">{title}</h3>
    {onViewAll && (
      <button 
        onClick={onViewAll}
        className="text-white/40 text-sm hover:text-purple-400 transition-colors flex items-center gap-1 group"
      >
        View all 
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </button>
    )}
  </div>
);

// Action Button
const ActionButton = ({ children, variant = "default" }) => {
  const variants = {
    default: "bg-white/10 hover:bg-white/20 text-white/80",
    primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25",
    amber: "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25"
  };
  return (
    <button className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${variants[variant]}`}>
      {children}
    </button>
  );
};

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
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-white/50 text-sm font-medium">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // Funnel stages with gradients
  const funnelStages = [
    { label: "Not Contacted", count: programs.filter(p => p.recruiting_status === "Not Contacted").length || 16, gradient: "linear-gradient(90deg, #ef4444, #dc2626)" },
    { label: "Contacted", count: programs.filter(p => p.recruiting_status === "Contacted").length || 8, gradient: "linear-gradient(90deg, #22c55e, #16a34a)" },
    { label: "Video Viewed", count: programs.filter(p => p.recruiting_status === "Video Viewed").length || 2, gradient: "linear-gradient(90deg, #06b6d4, #0891b2)" },
    { label: "No Response Yet", count: programs.filter(p => p.recruiting_status === "No Response Yet").length || 5, gradient: "linear-gradient(90deg, #f59e0b, #d97706)", showOverdue: true },
    { label: "Some Interest", count: programs.filter(p => p.recruiting_status === "Some Interest").length || 7, gradient: "linear-gradient(90deg, #eab308, #ca8a04)" },
    { label: "Active Conversation", count: programs.filter(p => p.recruiting_status === "Active Conversation").length || 2, gradient: "linear-gradient(90deg, #f97316, #ea580c)" },
    { label: "Offered", count: programs.filter(p => p.recruiting_status === "Offer / Commit Talk").length || 3, gradient: "linear-gradient(90deg, #a855f7, #9333ea)" },
    { label: "Closed", count: programs.filter(p => p.recruiting_status === "Not a Fit / Closed").length || 4, gradient: "linear-gradient(90deg, #64748b, #475569)" },
  ];
  const maxFunnel = Math.max(...funnelStages.map(s => s.count), 1);

  // Chart data
  const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartValues = [1, 2, 1, 3, 2, 4, 2];
  const maxChart = Math.max(...chartValues);

  // School colors
  const schoolColors = [
    "linear-gradient(135deg, #1e3a5f, #0f172a)",
    "linear-gradient(135deg, #7c2d12, #431407)",
    "linear-gradient(135deg, #dc2626, #991b1b)",
    "linear-gradient(135deg, #1e40af, #1e3a8a)",
    "linear-gradient(135deg, #7e22ce, #6b21a8)",
  ];

  const formatDate = (d) => {
    if (!d) return "TBD";
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const totalSchools = programs.length || 35;
  const offersCount = programs.filter(p => p.recruiting_status === "Offer / Commit Talk").length || 3;
  const followUpsDue = data.follow_ups_due || 10;

  return (
    <div data-testid="dashboard" className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Recruiting Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">Track your volleyball recruiting journey</p>
        </div>
        <button 
          onClick={() => navigate("/knowledge-base")}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Add School
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-5">
        
        {/* ===== LEFT COLUMN ===== */}
        <div className="col-span-4 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4">
            <StatCard 
              value={totalSchools} 
              label="Active Schools" 
              icon={Users}
              gradient="linear-gradient(135deg, #3b82f6, #1d4ed8)"
            />
            <div className="grid grid-cols-2 gap-4">
              <StatCard 
                value={offersCount} 
                subValue="Offers"
                label="Priority" 
                icon={Award}
                gradient="linear-gradient(135deg, #a855f7, #7c3aed)"
              />
              <StatCard 
                value={followUpsDue} 
                subValue="/6"
                label="Follow-Ups" 
                icon={Clock}
                gradient="linear-gradient(135deg, #22c55e, #16a34a)"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 cursor-pointer hover:bg-white/10 transition-all">
              <option>Division ▾</option>
            </select>
            <select className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 cursor-pointer hover:bg-white/10 transition-all">
              <option>Region ▾</option>
            </select>
            <div className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm flex items-center gap-2 cursor-pointer hover:bg-purple-500/30 transition-all">
              Priority: High <X className="w-3.5 h-3.5 hover:text-white" />
            </div>
          </div>

          {/* Progress Funnel */}
          <GlassCard className="p-5">
            <SectionHeader title="Progress Funnel" />
            <div className="space-y-3">
              {funnelStages.map((stage, i) => (
                <div key={i} className="group">
                  <div className="flex items-center gap-3">
                    <span className="text-white/60 text-xs w-32 text-right font-medium">{stage.label}</span>
                    <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden">
                      <div 
                        className="h-full rounded-lg transition-all duration-700 group-hover:opacity-80"
                        style={{ 
                          width: `${Math.max((stage.count / maxFunnel) * 100, 8)}%`,
                          background: stage.gradient
                        }}
                      />
                    </div>
                    <span className="text-white font-bold text-sm w-8 text-right">{stage.count}</span>
                    {stage.showOverdue && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        0 overdue
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-6 text-xs text-white/40">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/30"></span> Weekly signups
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Emails: 7
              </span>
            </div>
          </GlassCard>

          {/* Key Insights Chart */}
          <GlassCard className="p-5">
            <SectionHeader title="Weekly Activity" />
            <div className="h-32 flex items-end justify-between gap-2 mt-2">
              {chartDays.map((day, i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="relative w-full flex justify-center">
                    <div 
                      className="w-8 rounded-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
                      style={{ 
                        height: `${(chartValues[i] / maxChart) * 80 + 20}px`,
                        background: 'linear-gradient(180deg, #a855f7, #6366f1)'
                      }}
                    />
                    <span className="absolute -top-5 text-xs text-white/60 font-medium">{chartValues[i]}</span>
                  </div>
                  <span className="text-[10px] text-white/40 font-medium">{day}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* ===== MIDDLE COLUMN ===== */}
        <div className="col-span-3 space-y-5">
          {/* Next Actions - Simple */}
          <GlassCard className="p-5">
            <SectionHeader title="Upcoming Tasks" onViewAll={() => navigate("/follow-ups")} />
            <div className="space-y-3">
              {[
                { date: "Apr 15", status: "success" },
                { date: "Apr 27", status: "success" },
                { date: "Apr 29", status: "success" },
                { date: "Apr 28", status: "warning" },
              ].map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                  <Calendar className="w-4 h-4 text-white/30" />
                  <span className="text-white/50 text-sm w-14">{task.date}</span>
                  <CheckBadge variant={task.status} />
                  <span className="text-white text-sm font-medium">Send Follow-Up</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Activity Heatmap */}
          <GlassCard className="p-5">
            <SectionHeader title="Activity Heatmap" />
            <div className="grid grid-cols-7 gap-1.5 mt-2">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] text-white/30 font-medium py-1">{d}</div>
              ))}
              {Array.from({length: 28}, (_, i) => {
                const intensity = Math.random();
                return (
                  <div 
                    key={i}
                    className={`aspect-square rounded-md transition-all duration-300 cursor-pointer hover:scale-110 ${
                      intensity > 0.7 ? 'bg-purple-500 shadow-lg shadow-purple-500/30' : 
                      intensity > 0.4 ? 'bg-purple-500/50' : 
                      intensity > 0.2 ? 'bg-purple-500/20' : 'bg-white/5'
                    }`}
                  />
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-white/30">
              <span>Less</span>
              <div className="flex gap-1">
                {['bg-white/5', 'bg-purple-500/20', 'bg-purple-500/50', 'bg-purple-500'].map((c, i) => (
                  <span key={i} className={`w-3 h-3 rounded ${c}`}></span>
                ))}
              </div>
              <span>More</span>
            </div>
          </GlassCard>
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div className="col-span-5 space-y-5">
          {/* Priority Schools */}
          <GlassCard className="p-5">
            <SectionHeader title="Priority Schools" onViewAll={() => navigate("/pipeline")} />
            <div className="space-y-2">
              {programs.slice(0, 4).map((prog, i) => (
                <div 
                  key={prog.program_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer group"
                  onClick={() => navigate(`/programs/${prog.program_id}`)}
                >
                  <CheckBadge variant={i === 2 ? "warning" : "success"} />
                  <SchoolAvatar name={prog.university_name} color={schoolColors[i % schoolColors.length]} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors truncate">
                      {prog.university_name}
                    </p>
                    <p className="text-white/40 text-xs">
                      {formatDate(prog.next_action_due)} – {prog.recruiting_status?.split(' ')[0] || 'Active'}
                    </p>
                  </div>
                  <ActionButton variant={i === 2 ? "amber" : "default"}>
                    {i === 2 ? "Send Now" : "Follow Up"}
                  </ActionButton>
                  <span className="text-white/40 text-xs">{formatDate(prog.next_action_due)}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Recent Emails */}
          <GlassCard className="p-5">
            <SectionHeader title="Recent Emails" onViewAll={() => navigate("/inbox")} />
            <div className="space-y-2">
              {(data.recent_interactions || []).slice(0, 2).map((int, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer">
                  <div 
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: i === 0 ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'linear-gradient(135deg, #f97316, #c2410c)' }}
                  >
                    {int.university_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {int.university_name?.split(' ').slice(0, 2).join(' ')} 
                      <span className="text-white/40 font-normal ml-2">| Inbox</span>
                    </p>
                    <p className="text-white/40 text-xs truncate">{int.outcome || 'Email conversation...'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/40 text-xs mb-1">2d ago</p>
                    <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {int.type || 'Email'}
                    </span>
                  </div>
                </div>
              ))}
              {(!data.recent_interactions || data.recent_interactions.length === 0) && (
                <div className="text-center py-6">
                  <Mail className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No recent emails</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Top Active Schools */}
          <GlassCard className="p-5">
            <SectionHeader title="Schools Needing Attention" onViewAll={() => navigate("/knowledge-base")} />
            <div className="space-y-2">
              {programs.slice(0, 3).map((school, i) => (
                <div 
                  key={school.program_id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all cursor-pointer"
                  onClick={() => navigate(`/programs/${school.program_id}`)}
                >
                  <SchoolAvatar name={school.university_name} color={schoolColors[(i + 2) % schoolColors.length]} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{school.university_name}</p>
                    <p className="text-white/40 text-xs">Last contact: {school.last_follow_up || 'Never'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white/40 text-xs mb-1">{school.reply_status || 'Pending'}</p>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-medium ${
                      i === 0 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                        : 'bg-white/10 text-white/60'
                    }`}>
                      {i === 0 ? '17 days waiting' : `${i + 1} day waiting`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
