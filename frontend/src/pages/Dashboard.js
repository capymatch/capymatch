import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Check, ChevronRight, Calendar, X } from "lucide-react";
import { toast } from "sonner";

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
        <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Funnel data
  const funnelStages = [
    { label: "Not Contacted", count: 16, color: "#ef4444" },
    { label: "Contacted", count: 8, color: "#22c55e" },
    { label: "Video Viewed", count: 2, color: "#06b6d4" },
    { label: "No Response Yet", count: 5, color: "#f59e0b", overdue: 0 },
    { label: "Some Interest", count: 7, color: "#eab308" },
    { label: "Active Conversation:", count: 2, color: "#d97706" },
    { label: "Offered", count: 3, color: "#a855f7" },
    { label: "Closed", count: 4, color: "#64748b" },
  ];
  const maxFunnel = Math.max(...funnelStages.map(s => s.count));

  // Chart data
  const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Juv'];
  const chartValues = [1, 1, 1, 1, 1, 2, 2, 0];

  // School colors
  const schoolLogos = [
    { bg: "#1e3a5f", initial: "O" },
    { bg: "#7c2d12", initial: "U" },
    { bg: "#dc2626", initial: "C" },
    { bg: "#1e40af", initial: "B" },
  ];

  const formatDate = (d) => {
    if (!d) return "TBD";
    const date = new Date(d);
    return `${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getDate()}`;
  };

  return (
    <div data-testid="dashboard" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Recruiting Dashboard</h1>
        <button 
          onClick={() => navigate("/knowledge-base")}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add School
        </button>
      </div>

      {/* Main Grid - 3 columns */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* ========== LEFT COLUMN ========== */}
        <div className="col-span-4 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(59, 130, 246, 0.15)" }}>
              <p className="text-3xl font-bold text-white">35</p>
              <p className="text-white/60 text-xs mt-1">Active Schools</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(168, 85, 247, 0.15)" }}>
              <p className="text-3xl font-bold text-white">3 <span className="text-lg font-normal">Offers</span></p>
              <p className="text-white/60 text-xs mt-1">Priority</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}>
              <p className="text-3xl font-bold text-white">10 <span className="text-lg font-normal text-white/60">6</span></p>
              <p className="text-white/60 text-xs mt-1">Follow-Ups Due</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white/70 text-xs">
              <option>Division ▾</option>
              <option>All ×</option>
            </select>
            <select className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white/70 text-xs">
              <option>Region ▾</option>
              <option>All ×</option>
            </select>
            <div className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-1">
              Priority |wiitw - Attenti| <X className="w-3 h-3 cursor-pointer" />
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-1">
              Prrensccd enerls <X className="w-3 h-3 cursor-pointer" />
            </div>
          </div>

          {/* Progress Funnel */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 25, 50, 0.6)" }}>
            <h3 className="text-white font-semibold mb-4">Progress Funnel</h3>
            <div className="space-y-2">
              {funnelStages.map((stage, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-white/70 text-xs w-36 text-left">{stage.label}</span>
                  <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden">
                    <div 
                      className="h-full rounded"
                      style={{ width: `${(stage.count / maxFunnel) * 100}%`, backgroundColor: stage.color }}
                    />
                  </div>
                  <span className="text-white font-semibold text-sm w-6 text-right">{stage.count}</span>
                  {stage.overdue !== undefined && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-orange-500/30 text-orange-300">{stage.overdue} overdue</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-[10px] text-white/40">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white/30"></span> Week ensign yn</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> Emails this week 7</span>
            </div>
          </div>

          {/* Key Insights Bar Chart */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 25, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Key Insights</h3>
              <span className="text-white/50 text-xs">All● Acrayps ▽</span>
            </div>
            <div className="flex items-end justify-between h-24 px-2">
              {chartDays.map((day, i) => (
                <div key={day} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[10px] text-white/50">{chartValues[i]}</span>
                  <div 
                    className="w-6 rounded-t bg-gradient-to-t from-purple-600 to-indigo-400"
                    style={{ height: `${Math.max(chartValues[i] * 25, 8)}px` }}
                  />
                  <span className="text-[10px] text-white/40">{day}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[10px] text-white/40 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span> Emails this week · 7
            </div>
          </div>
        </div>

        {/* ========== MIDDLE COLUMN ========== */}
        <div className="col-span-3 space-y-4">
          {/* Next Actions - Simple List */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 25, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Next Actions</h3>
              <span className="text-white/50 text-xs cursor-pointer hover:text-white">View all</span>
            </div>
            <div className="space-y-3">
              {['Apr 15', 'Apr 27', 'Apr 29', 'Apr 28'].map((date, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-white/30" />
                  <span className="text-white/50 text-xs w-12">{date}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${i === 3 ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-white text-sm">Send Follow-Up</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-white/30">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">Sav all 2%</span>
              </div>
            </div>
          </div>

          {/* Key Insights - Grid */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 25, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Key Insights</h3>
              <span className="text-white/40 text-[10px]">◄ ▬▬▬▬ ►</span>
            </div>
            <div className="text-[10px]">
              <div className="grid grid-cols-6 gap-1 text-white/40 mb-1">
                <span></span>
                <span>Koot</span>
                <span>Moore</span>
                <span>Yes</span>
                <span>2%</span>
                <span></span>
              </div>
              <div className="grid grid-cols-6 gap-1 text-white/40 mb-1">
                <span></span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
              </div>
              {[[0, 3, 3, 1, 3], [2, 3, 7, 0, 9], [3, 4, 5, 7, 0]].map((row, ri) => (
                <div key={ri} className="grid grid-cols-6 gap-1 mb-1">
                  <span></span>
                  {row.map((val, ci) => (
                    <span 
                      key={ci} 
                      className={`text-center py-1 rounded ${val >= 5 ? 'bg-purple-500 text-white' : val >= 3 ? 'bg-purple-500/40 text-white/80' : 'text-white/40'}`}
                    >
                      {val}
                    </span>
                  ))}
                </div>
              ))}
              <div className="grid grid-cols-6 gap-1 text-white/30 text-[9px] mt-2">
                <span></span>
                <span>+15</span>
                <span>+1</span>
                <span>15</span>
                <span>38</span>
                <span>12</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========== RIGHT COLUMN ========== */}
        <div className="col-span-5 space-y-4">
          {/* Next Actions - With Schools */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 25, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Next Actions</h3>
              <span className="text-white/50 text-xs cursor-pointer hover:text-white">View all <ChevronRight className="w-3 h-3 inline" /></span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Ohio State University", date: "Apr 26", status: "Active", btn: "Send Follow-Up", btnColor: "bg-slate-600", logo: schoolLogos[0] },
                { name: "University of North Florida", date: "Apr 27", status: "Recruiting", btn: "Send Follow-Up", btnColor: "bg-slate-600", logo: schoolLogos[1] },
                { name: "Clemson University Camps", date: "Apr 20", status: "Ppical", btn: "Send Foxcht", btnColor: "bg-amber-700", dateRight: "Apr 25", logo: schoolLogos[2] },
                { name: "Butler University", date: "1 nate", status: "urthonated", btn: "Send Follow-Up", btnColor: "bg-slate-600", dateRight: "Apr 26", logo: schoolLogos[3] },
              ].map((school, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${i === 1 ? 'bg-orange-500' : 'bg-emerald-600'}`}>
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: school.logo.bg }}
                  >
                    {school.logo.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{school.name}</p>
                    <p className="text-white/40 text-xs">{school.date} – {school.status}</p>
                  </div>
                  <button className={`px-3 py-1.5 rounded text-xs font-medium text-white/90 ${school.btnColor}`}>
                    {school.btn}
                  </button>
                  <span className="text-white/50 text-xs">{school.dateRight || school.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Emails */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 25, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Recent Emails</h3>
              <span className="text-white/50 text-xs cursor-pointer hover:text-white">View all <ChevronRight className="w-3 h-3 inline" /></span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                  <span className="text-white text-sm">TH</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">Tim Hinote <span className="text-white/40 font-normal">| Inbox</span></p>
                  <p className="text-white/40 text-xs truncate">Loye to Loyola University Chicago</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs">Last email 2d ago<ChevronRight className="w-3 h-3 inline" /></p>
                  <div className="flex gap-1 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/30 text-blue-300">Some Interest</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-600 text-white">Apr 223</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-800 flex items-center justify-center">
                  <span className="text-white text-sm">JO</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">Jason Oliver <span className="text-white/40 font-normal">| Oniox</span></p>
                  <p className="text-white/40 text-xs truncate">Hldy alco Glora. coitio nalti: no hop nere restive chid noot.</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs">2d ago</p>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-600 text-white/70 mt-1 inline-block">kpt 20</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Active Schools */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 25, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Top Active Schools</h3>
              <span className="text-white/50 text-xs cursor-pointer hover:text-white">View all <ChevronRight className="w-3 h-3 inline" /></span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Butler University", email: "Last email done responding", time: "Last email 2d ago", badge: "17 days without responding", badgeColor: "bg-purple-600" },
                { name: "North Carolina State University", email: "Last email oeld responding", time: "21 ago", badge: "1 day without response", badgeColor: "bg-slate-600" },
                { name: "Loyola University", email: "Last email caneals", time: "2d ago", badge: "1 day without responding", badgeColor: "bg-slate-600" },
              ].map((school, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: i === 0 ? "#1e40af" : i === 1 ? "#7c2d12" : "#b91c1c" }}
                  >
                    {school.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{school.name}</p>
                    <p className="text-white/40 text-xs">{school.email} <ChevronRight className="w-3 h-3 inline" /></p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs">{school.time} <ChevronRight className="w-3 h-3 inline" /></p>
                    <span className={`px-2 py-0.5 rounded text-[10px] text-white/80 mt-1 inline-block ${school.badgeColor}`}>
                      {school.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
