import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import {
  Plus, ChevronRight, Calendar, CheckCircle, Mail, Send,
  Clock, TrendingUp, Users, Target, Award, AlertCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const FUNNEL_STAGES = [
  { key: "Not Contacted", color: "from-rose-500 to-rose-600", label: "Not Contacted" },
  { key: "Contacted", color: "from-emerald-500 to-emerald-600", label: "Contacted" },
  { key: "Video Viewed", color: "from-cyan-500 to-cyan-600", label: "Video Viewed" },
  { key: "No Response Yet", color: "from-amber-500 to-amber-600", label: "No Response Yet", showOverdue: true },
  { key: "Some Interest", color: "from-blue-500 to-blue-600", label: "Some Interest" },
  { key: "Active Conversation", color: "from-indigo-500 to-indigo-600", label: "Active Conversation" },
  { key: "Offer / Commit Talk", color: "from-purple-500 to-purple-600", label: "Offered" },
  { key: "Not a Fit / Closed", color: "from-slate-500 to-slate-600", label: "Closed" },
];

// Glass card component
const GlassCard = ({ children, className = "", ...props }) => (
  <div 
    className={`rounded-2xl border border-white/10 backdrop-blur-xl ${className}`}
    style={{ backgroundColor: "rgba(30, 30, 60, 0.5)" }}
    {...props}
  >
    {children}
  </div>
);

// Stat card component
const StatCard = ({ value, label, subValue, color, icon: Icon }) => (
  <div 
    className={`rounded-2xl p-6 border border-white/10 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}
    style={{ backgroundColor: `rgba(${color}, 0.15)` }}
  >
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-30" style={{ backgroundColor: `rgb(${color})` }} />
    <div className="relative">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-4xl font-black text-white tracking-tight">
            {value}
            {subValue && <span className="text-lg font-normal text-white/60 ml-2">{subValue}</span>}
          </p>
          <p className="text-white/50 text-sm mt-1 font-medium">{label}</p>
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `rgba(${color}, 0.3)` }}>
            <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  </div>
);

// School avatar component
const SchoolAvatar = ({ name, color = "from-purple-500 to-indigo-600" }) => (
  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
    {name?.charAt(0) || "?"}
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
          <div className="w-12 h-12 border-3 border-purple-400/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-white/60 text-sm font-medium">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // Calculate funnel data
  const funnelData = FUNNEL_STAGES.map(stage => ({
    ...stage,
    count: programs.filter(p => p.recruiting_status === stage.key).length
  }));
  const maxCount = Math.max(...funnelData.map(s => s.count), 1);
  const offersCount = programs.filter(p => p.recruiting_status === "Offer / Commit Talk").length;
  const activeSchools = programs.filter(p => !["Not a Fit / Closed"].includes(p.recruiting_status));

  // Days of week for chart
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = [1, 1, 1, 1, 2, 3, 2];

  return (
    <div data-testid="dashboard" className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-black text-white tracking-tight">Recruiting Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Track your volleyball recruiting journey</p>
        </div>
        <Button 
          onClick={() => navigate("/knowledge-base")}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white gap-2 shadow-lg shadow-purple-500/25 border-0"
        >
          <Plus className="w-4 h-4" /> Add School
        </Button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard 
          value={activeSchools.length} 
          label="Active Schools" 
          icon={Users}
          color="59, 130, 246"
        />
        <StatCard 
          value={offersCount} 
          subValue="Offers"
          label="Priority" 
          icon={Award}
          color="168, 85, 247"
        />
        <StatCard 
          value={data.follow_ups_due} 
          subValue={`/ ${followUps.length}`}
          label="Follow-Ups Due" 
          icon={Clock}
          color="34, 197, 94"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 cursor-pointer hover:bg-white/10 transition-colors">
          <option value="">Division ▾</option>
          <option value="D1">D1</option>
          <option value="D2">D2</option>
          <option value="D3">D3</option>
        </select>
        <select className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm focus:outline-none focus:border-purple-500/50 cursor-pointer hover:bg-white/10 transition-colors">
          <option value="">Region ▾</option>
          <option value="Northeast">Northeast</option>
          <option value="Southeast">Southeast</option>
          <option value="Midwest">Midwest</option>
          <option value="West">West</option>
        </select>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm cursor-pointer hover:bg-purple-500/30 transition-colors">
          <Target className="w-3.5 h-3.5" />
          Priority: High
          <span className="text-purple-400 hover:text-white ml-1">×</span>
        </div>
      </div>

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="col-span-4 space-y-6">
          {/* Progress Funnel */}
          <GlassCard className="p-6">
            <h3 className="font-heading text-lg font-bold text-white mb-5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Progress Funnel
            </h3>
            <div className="space-y-3">
              {funnelData.map((stage, i) => (
                <div key={stage.key} className="group">
                  <div className="flex items-center gap-3">
                    <div className="w-28 text-right flex-shrink-0">
                      <span className="text-white/60 text-xs font-medium">{stage.label}</span>
                    </div>
                    <div className="flex-1 h-7 rounded-lg bg-white/5 overflow-hidden relative">
                      <div 
                        className={`h-full bg-gradient-to-r ${stage.color} transition-all duration-700 ease-out rounded-lg group-hover:opacity-90`}
                        style={{ width: `${Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 15 : 0)}%` }}
                      />
                    </div>
                    <div className="w-16 flex items-center gap-2 flex-shrink-0">
                      <span className="text-white font-bold text-sm">{stage.count}</span>
                      {stage.showOverdue && stage.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-orange-500/30 text-orange-300 font-medium">
                          0 late
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/30"></span>
                Weekly signups
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                Emails this week: {data.recent_interactions?.length || 0}
              </span>
            </div>
          </GlassCard>

          {/* Key Insights - Bar Chart */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-white">Key Insights</h3>
              <select className="text-xs text-white/50 bg-transparent border-0 focus:outline-none cursor-pointer">
                <option>All Activity ▾</option>
              </select>
            </div>
            <div className="h-36 flex items-end justify-between gap-2 px-2">
              {weekDays.map((day, i) => {
                const height = chartData[i] * 25;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full flex justify-center">
                      <div 
                        className="w-8 rounded-t-lg bg-gradient-to-t from-purple-600 via-purple-500 to-indigo-400 transition-all duration-500 hover:from-purple-500 hover:to-indigo-300 cursor-pointer"
                        style={{ height: `${Math.max(height, 20)}px` }}
                      />
                      <span className="absolute -top-5 text-[10px] text-white/60 font-medium">{chartData[i]}</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-medium">{day}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              Emails this week: {data.recent_interactions?.length || 0}
            </div>
          </GlassCard>
        </div>

        {/* MIDDLE COLUMN */}
        <div className="col-span-4 space-y-6">
          {/* Next Actions */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Next Actions
              </h3>
              <button 
                onClick={() => navigate("/follow-ups")}
                className="text-xs text-white/50 hover:text-purple-400 flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            {followUps.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <p className="text-white font-medium">All caught up!</p>
                <p className="text-white/40 text-sm mt-1">No follow-ups due</p>
              </div>
            ) : (
              <div className="space-y-2">
                {followUps.slice(0, 5).map((action, i) => (
                  <div 
                    key={action.program_id} 
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/programs/${action.program_id}`)}
                  >
                    <div className="text-center min-w-[50px]">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider">
                        {action.next_action_due ? new Date(action.next_action_due).toLocaleDateString('en-US', { month: 'short' }) : 'TBD'}
                      </p>
                      <p className="text-white font-bold text-lg">
                        {action.next_action_due ? new Date(action.next_action_due).getDate() : '-'}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                        <span className="text-white text-sm font-medium truncate">{action.university_name}</span>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">{action.next_action || 'Send Follow-Up'}</p>
                    </div>
                    <Send className="w-4 h-4 text-white/30 group-hover:text-purple-400 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Activity Heatmap */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-white">Weekly Activity</h3>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-purple-400' : 'bg-white/20'}`}></span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {/* Header */}
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] text-white/30 font-medium py-1">{d}</div>
              ))}
              {/* Cells */}
              {Array.from({length: 28}, (_, i) => {
                const intensity = Math.random();
                return (
                  <div 
                    key={i}
                    className={`aspect-square rounded-md transition-colors cursor-pointer hover:ring-1 hover:ring-purple-400/50 ${
                      intensity > 0.7 ? 'bg-purple-500' : 
                      intensity > 0.4 ? 'bg-purple-500/50' : 
                      intensity > 0.2 ? 'bg-purple-500/20' : 'bg-white/5'
                    }`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-white/30">
              <span>Less</span>
              <div className="flex gap-1">
                <span className="w-3 h-3 rounded bg-white/5"></span>
                <span className="w-3 h-3 rounded bg-purple-500/20"></span>
                <span className="w-3 h-3 rounded bg-purple-500/50"></span>
                <span className="w-3 h-3 rounded bg-purple-500"></span>
              </div>
              <span>More</span>
            </div>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-4 space-y-6">
          {/* Priority Schools */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Priority Schools
              </h3>
              <button className="text-xs text-white/50 hover:text-purple-400 flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {programs.slice(0, 4).map((prog, i) => {
                const colors = [
                  "from-blue-500 to-cyan-500",
                  "from-purple-500 to-pink-500", 
                  "from-orange-500 to-red-500",
                  "from-green-500 to-emerald-500"
                ];
                return (
                  <div 
                    key={prog.program_id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                    onClick={() => navigate(`/programs/${prog.program_id}`)}
                  >
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    </div>
                    <SchoolAvatar name={prog.university_name} color={colors[i % colors.length]} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate group-hover:text-purple-300 transition-colors">
                        {prog.university_name}
                      </p>
                      <p className="text-white/40 text-xs">{prog.recruiting_status}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <button className="px-3 py-1.5 rounded-full bg-purple-500/30 text-purple-300 text-[11px] font-medium hover:bg-purple-500/50 transition-colors">
                        Follow Up
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                Recent Emails
              </h3>
              <button className="text-xs text-white/50 hover:text-purple-400 flex items-center gap-1 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {data.recent_interactions?.length > 0 ? (
              <div className="space-y-3">
                {data.recent_interactions.slice(0, 3).map((int, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <SchoolAvatar 
                      name={int.university_name} 
                      color={i === 0 ? "from-orange-500 to-red-500" : i === 1 ? "from-blue-500 to-indigo-500" : "from-green-500 to-teal-500"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {int.university_name?.split(' ').slice(0, 2).join(' ')}
                        <span className="text-white/40 font-normal ml-2">| {int.type}</span>
                      </p>
                      <p className="text-white/40 text-xs truncate">{int.outcome || 'Email interaction'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white/30 text-[10px]">2d ago</p>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-medium ${
                        int.outcome === 'Reply Received' ? 'bg-green-500/30 text-green-300' : 'bg-blue-500/30 text-blue-300'
                      }`}>
                        {int.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No recent emails</p>
              </div>
            )}
          </GlassCard>

          {/* Top Active Schools */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Top Active Schools
              </h3>
              <button 
                onClick={() => navigate("/knowledge-base")}
                className="text-xs text-white/50 hover:text-purple-400 flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {programs
                .filter(p => p.priority === "High" || p.priority === "Very High")
                .slice(0, 3)
                .map((school, i) => (
                  <div 
                    key={school.program_id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                    onClick={() => navigate(`/programs/${school.program_id}`)}
                  >
                    <SchoolAvatar 
                      name={school.university_name}
                      color={i === 0 ? "from-blue-500 to-cyan-500" : i === 1 ? "from-purple-500 to-pink-500" : "from-amber-500 to-orange-500"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{school.university_name}</p>
                      <p className="text-white/40 text-xs">Last contact: {school.last_follow_up || 'Never'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white/30 text-[10px] mb-1">
                        {school.reply_status === "No Reply" ? "Awaiting reply" : school.reply_status}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-medium ${
                        school.reply_status === "No Reply" ? 'bg-orange-500/30 text-orange-300' : 'bg-green-500/30 text-green-300'
                      }`}>
                        {school.priority}
                      </span>
                    </div>
                  </div>
                ))}
              {programs.filter(p => p.priority === "High" || p.priority === "Very High").length === 0 && (
                <div className="text-center py-8">
                  <Target className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No high priority schools</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
