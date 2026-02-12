import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Check, ChevronRight, Calendar, X } from "lucide-react";
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

  // Funnel data with specific colors matching the image
  const funnelStages = [
    { label: "Not Contacted", count: 16, color: "#6366f1" },
    { label: "Contacted", count: 8, color: "#818cf8" },
    { label: "Video Viewed", count: 2, color: "#a78bfa" },
    { label: "No Response Yet", count: 5, color: "#c4b5fd", showOverdue: true },
    { label: "Some Interest", count: 7, color: "#fbbf24" },
    { label: "Active Conversation:", count: 2, color: "#f59e0b" },
    { label: "Offered", count: 3, color: "#f97316" },
    { label: "Closed", count: 4, color: "#ef4444" },
  ];
  const maxFunnel = Math.max(...funnelStages.map(s => s.count));

  // Chart data matching the image
  const chartData = [
    { day: "Mon", value: 1 },
    { day: "Tue", value: 1 },
    { day: "Wed", value: 1 },
    { day: "Thu", value: 1 },
    { day: "Fri", value: 1 },
    { day: "Sat", value: 2 },
    { day: "Sun", value: 2 },
    { day: "Juv", value: 0 },
  ];

  // Schools data matching the image
  const schoolsData = [
    { name: "Ohio State University", date: "Apr 26", status: "Active", btnType: "gray", avatar: "🔵" },
    { name: "University of North Florida", date: "Apr 27", status: "Recruiting", btnType: "gray", avatar: "🦅" },
    { name: "Clemson University Camps", date: "Apr 20", status: "Ppical", btnType: "amber", avatar: "🐯" },
    { name: "Butler University", date: "Apr 26", status: "urthonated", btnType: "gray", avatar: "🐕" },
  ];

  return (
    <div data-testid="dashboard" className="space-y-5">
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

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-4">
        
        {/* ===== LEFT COLUMN ===== */}
        <div className="col-span-4 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-4" style={{ backgroundColor: "#1e3a5f" }}>
              <p className="text-4xl font-bold text-white">35</p>
              <p className="text-white/60 text-sm mt-1">Active Schools</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "#4a2545" }}>
              <p className="text-3xl font-bold text-white">3 <span className="text-xl font-normal">Offers</span></p>
              <p className="text-white/60 text-sm mt-1">Priority</p>
            </div>
            <div className="rounded-xl p-4" style={{ backgroundColor: "#1a4a4a" }}>
              <p className="text-3xl font-bold text-white">10 <span className="text-xl text-white/50">6</span></p>
              <p className="text-white/60 text-sm mt-1">Follow-Ups Due</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 text-sm">
            <div className="px-3 py-1.5 rounded bg-white/10 text-white/70 flex items-center gap-1">
              Division <span className="text-white/40">▾</span> All <span className="text-white/40">▾</span>
            </div>
            <div className="px-3 py-1.5 rounded bg-white/10 text-white/70 flex items-center gap-1">
              Region <span className="text-white/40">▾</span> All <span className="text-white/40">▾</span>
            </div>
            <div className="px-3 py-1.5 rounded bg-purple-900/50 text-purple-300 flex items-center gap-1">
              Priority |wiitw · Attentii| <span className="text-white/40">▾</span>
            </div>
            <div className="px-3 py-1.5 rounded bg-slate-700/50 text-slate-300 flex items-center gap-1">
              Prrensccd enerls <X className="w-3 h-3" />
            </div>
          </div>

          {/* Progress Funnel */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 30, 50, 0.8)" }}>
            <h3 className="text-white font-semibold text-lg mb-4">Progress Funnel</h3>
            <div className="space-y-2">
              {funnelStages.map((stage, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-white/70 text-sm w-40">{stage.label}</span>
                  <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                    <div 
                      className="h-full rounded"
                      style={{ 
                        width: `${(stage.count / maxFunnel) * 100}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                  <span className="text-white font-semibold w-6 text-right">{stage.count}</span>
                  {stage.showOverdue && (
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-900/50 text-orange-300">0 overdue</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white/30"></span> Week ensign yn
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span> Emails this week 7
              </span>
            </div>
          </div>

          {/* Key Insights Bar Chart */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 30, 50, 0.8)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Key Insights</h3>
              <span className="text-white/50 text-sm">All● Acrayps ▽</span>
            </div>
            <div className="relative h-32">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-8 w-6 flex flex-col justify-between text-xs text-white/40">
                <span>3</span>
                <span>2</span>
                <span>1</span>
                <span>0</span>
              </div>
              {/* Bars */}
              <div className="ml-8 h-full flex items-end gap-2 pb-6">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full rounded-t"
                      style={{ 
                        height: `${d.value * 25}px`,
                        backgroundColor: i >= 5 ? "#f59e0b" : "#6366f1",
                        minHeight: d.value > 0 ? "20px" : "0"
                      }}
                    >
                      {d.value > 0 && (
                        <span className="block text-center text-xs text-white/80 pt-1">{d.value}</span>
                      )}
                    </div>
                    <span className="text-xs text-white/40">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-xs text-white/50 flex items-center gap-1 mt-2">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span> Emails this week · 7
            </div>
          </div>
        </div>

        {/* ===== MIDDLE COLUMN ===== */}
        <div className="col-span-3 space-y-4">
          {/* Next Actions List */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 30, 50, 0.8)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Next Actions</h3>
              <span className="text-white/50 text-sm cursor-pointer hover:text-white">View all</span>
            </div>
            <div className="space-y-3">
              {["Apr 15", "Apr 27", "Apr 29", "Apr 28"].map((date, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-white/30" />
                  <span className="text-white/50 text-sm w-14">{date}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${i === 3 ? 'bg-orange-500' : 'bg-emerald-500'}`}>
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-white text-sm font-medium">Send Follow-Up</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-white/30 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Sav all 2%</span>
              </div>
            </div>
          </div>

          {/* Key Insights Grid */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 30, 50, 0.8)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-lg">Key Insights</h3>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30"></span>)}
              </div>
            </div>
            <div className="text-xs">
              {/* Header */}
              <div className="grid grid-cols-6 gap-1 text-white/40 mb-1">
                <span></span>
                <span className="text-center">Koot</span>
                <span className="text-center">Moore</span>
                <span className="text-center">Ves</span>
                <span className="text-center">2%</span>
                <span></span>
              </div>
              <div className="grid grid-cols-6 gap-1 text-white/40 mb-2">
                <span></span>
                <span className="text-center">Mon</span>
                <span className="text-center">Tue</span>
                <span className="text-center">Wed</span>
                <span className="text-center">Thu</span>
                <span className="text-center">Fri</span>
              </div>
              {/* Data rows */}
              {[[0, 3, 3, 1, 3], [2, 3, 7, 0, 9], [3, 4, 5, 7, 0]].map((row, ri) => (
                <div key={ri} className="grid grid-cols-6 gap-1 mb-1">
                  <span></span>
                  {row.map((val, ci) => (
                    <span 
                      key={ci} 
                      className={`text-center py-1.5 rounded ${
                        val >= 7 ? 'bg-purple-600 text-white' : 
                        val >= 3 ? 'bg-purple-600/50 text-white/90' : 
                        'text-white/50'
                      }`}
                    >
                      {val}
                    </span>
                  ))}
                </div>
              ))}
              {/* Footer row */}
              <div className="grid grid-cols-6 gap-1 text-white/30 text-[10px] mt-2">
                <span></span>
                <span className="text-center">+15</span>
                <span className="text-center">+1</span>
                <span className="text-center">15</span>
                <span className="text-center">38</span>
                <span className="text-center">12</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN ===== */}
        <div className="col-span-5 space-y-4">
          {/* Next Actions with Schools */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 30, 50, 0.8)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Next Actions</h3>
              <span className="text-white/50 text-sm cursor-pointer hover:text-white flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </span>
            </div>
            <div className="space-y-3">
              {schoolsData.map((school, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-lg">
                    {school.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{school.name}</p>
                    <p className="text-white/40 text-xs">{school.date} – {school.status}</p>
                  </div>
                  <button 
                    className={`px-3 py-1.5 rounded text-xs font-medium ${
                      school.btnType === "amber" 
                        ? "bg-amber-700 text-amber-100" 
                        : "bg-slate-600 text-slate-200"
                    }`}
                  >
                    {school.btnType === "amber" ? "Send Foxcht" : "Send Follow-Up"}
                  </button>
                  <span className="text-white/50 text-xs">{school.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Emails */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 30, 50, 0.8)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Recent Emails</h3>
              <span className="text-white/50 text-sm cursor-pointer hover:text-white flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  TH
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">
                    Tim Hinote <span className="text-white/40 font-normal">| Inbox</span>
                  </p>
                  <p className="text-white/40 text-xs">Loye to Loyola University Chicago</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs">Last email 2d ago<ChevronRight className="w-3 h-3 inline" /></p>
                  <div className="flex gap-1 mt-1">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-600/50 text-blue-200">Some Interest</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-purple-600 text-white">Apr 223</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center text-white text-sm font-bold">
                  JO
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">
                    Jason Oliver <span className="text-white/40 font-normal">| Oniox</span>
                  </p>
                  <p className="text-white/40 text-xs truncate">Hldy alco Glora. coitio nalti: no hop nere restive chid noot.</p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs">2d ago</p>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-600 text-slate-200 mt-1 inline-block">Kpt 20</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Active Schools */}
          <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(30, 30, 50, 0.8)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Top Active Schools</h3>
              <span className="text-white/50 text-sm cursor-pointer hover:text-white flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </span>
            </div>
            <div className="space-y-3">
              {[
                { name: "Butler University", badge: "17 days without responding", badgePurple: true, avatar: "🐕" },
                { name: "North Carolina State University", badge: "1 day without response", badgePurple: false, avatar: "🐺" },
                { name: "Loyola University", badge: "1 day without responding", badgePurple: false, avatar: "🦁" },
              ].map((school, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-lg">
                    {school.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{school.name}</p>
                    <p className="text-white/40 text-xs">Last email done responding <ChevronRight className="w-3 h-3 inline" /></p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs">{i === 0 ? "Last email 2d ago" : `${i === 1 ? "21" : "2d"} ago`} <ChevronRight className="w-3 h-3 inline" /></p>
                    <span className={`px-2 py-0.5 rounded text-[10px] mt-1 inline-block ${
                      school.badgePurple ? "bg-purple-600 text-white" : "bg-slate-600 text-slate-200"
                    }`}>
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
