import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import {
  Plus, ChevronRight, Calendar, CheckCircle, Mail, ExternalLink,
  Target, Send, Eye, Clock, MessageCircle, Trophy, Archive, AlertCircle
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const FUNNEL_STAGES = [
  { key: "Not Contacted", color: "bg-rose-500", label: "Not Contacted" },
  { key: "Contacted", color: "bg-emerald-500", label: "Contacted" },
  { key: "Video Viewed", color: "bg-cyan-500", label: "Video Viewed" },
  { key: "No Response Yet", color: "bg-amber-500", label: "No Response Yet" },
  { key: "Some Interest", color: "bg-blue-500", label: "Some Interest" },
  { key: "Active Conversation", color: "bg-indigo-500", label: "Active Conversation" },
  { key: "Offer / Commit Talk", color: "bg-purple-500", label: "Offered" },
  { key: "Not a Fit / Closed", color: "bg-gray-500", label: "Closed" },
];

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
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          <span className="text-white/60 text-sm">Loading dashboard...</span>
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

  // Get offers count
  const offersCount = programs.filter(p => p.recruiting_status === "Offer / Commit Talk").length;

  // Group follow-ups by date
  const nextActions = followUps.slice(0, 5);

  // Get top active schools (those with recent activity or high priority)
  const topSchools = programs
    .filter(p => p.priority === "High" || p.priority === "Very High")
    .slice(0, 4);

  return (
    <div data-testid="dashboard" className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-white">Recruiting Dashboard</h1>
        <Button 
          onClick={() => navigate("/pipeline")}
          className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" /> Add School
        </Button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}>
          <p className="text-4xl font-bold text-white">{data.total_schools}</p>
          <p className="text-white/60 text-sm mt-1">Active Schools</p>
        </div>
        <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(168, 85, 247, 0.2)" }}>
          <p className="text-4xl font-bold text-white">{offersCount} <span className="text-lg font-normal text-white/60">Offers</span></p>
          <p className="text-white/60 text-sm mt-1">Priority</p>
        </div>
        <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}>
          <p className="text-4xl font-bold text-white">{data.follow_ups_due} <span className="text-lg font-normal text-white/60">6</span></p>
          <p className="text-white/60 text-sm mt-1">Follow-Ups Due</p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white/80 text-sm focus:outline-none">
          <option>Division ▼</option>
          <option>D1</option>
          <option>D2</option>
          <option>D3</option>
        </select>
        <select className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white/80 text-sm focus:outline-none">
          <option>Region ▼</option>
          <option>Northeast</option>
          <option>Southeast</option>
          <option>Midwest</option>
          <option>West</option>
        </select>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm">
          Priority |within - Attention| ×
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm">
          Prerensced enerls ×
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Funnel & Insights */}
        <div className="col-span-4 space-y-6">
          {/* Progress Funnel */}
          <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(30, 30, 50, 0.6)" }}>
            <h3 className="font-heading text-lg font-semibold text-white mb-4">Progress Funnel</h3>
            <div className="space-y-3">
              {funnelData.map((stage) => (
                <div key={stage.key} className="flex items-center gap-3">
                  <div className="w-32 text-right">
                    <span className="text-white/70 text-sm">{stage.label}</span>
                  </div>
                  <div className="flex-1 h-6 rounded bg-white/5 overflow-hidden relative">
                    <div 
                      className={`h-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${(stage.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 text-right">
                    <span className="text-white font-semibold">{stage.count}</span>
                    {stage.key === "No Response Yet" && stage.count > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-orange-500/30 text-orange-300">0 overdue</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white/30"></span> Week ensign un
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span> Emails this week: 7
              </span>
            </div>
          </div>

          {/* Key Insights Chart */}
          <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(30, 30, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-white">Key Insights</h3>
              <div className="flex items-center gap-2 text-xs text-white/50">
                <span>All</span>
                <span className="text-white">● Acravps ▼</span>
              </div>
            </div>
            <div className="h-32 flex items-end justify-between gap-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const heights = [40, 50, 60, 70, 80, 65, 55];
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full rounded-t bg-gradient-to-t from-purple-600 to-indigo-400 transition-all"
                      style={{ height: `${heights[i]}%` }}
                    />
                    <span className="text-[10px] text-white/40">{day}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span> Emails this week : 7
            </div>
          </div>
        </div>

        {/* Middle Column - Next Actions */}
        <div className="col-span-4 space-y-6">
          {/* Next Actions List */}
          <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(30, 30, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-white">Next Actions</h3>
              <button 
                onClick={() => navigate("/follow-ups")}
                className="text-xs text-white/50 hover:text-white flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {nextActions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-white/60 text-sm">All caught up!</p>
                </div>
              ) : (
                nextActions.map((action, i) => (
                  <div key={action.program_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-xs">{action.next_action_due || 'No date'}</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <span className="text-white text-sm">Send Follow-Up</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button className="mt-3 text-xs text-white/40 hover:text-white/60">
              See all 2% ▼
            </button>
          </div>

          {/* Key Insights Mini Calendar */}
          <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(30, 30, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-white">Key Insights</h3>
              <div className="flex gap-1">
                {[1,2,3,4,5,6].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center text-xs">
              <div className="text-white/40">Kost</div>
              <div className="text-white/40">Moore</div>
              <div className="text-white/40">Yes</div>
              <div className="text-white/40">2%</div>
              <div></div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                <div key={day} className="text-white/40 py-1">{day}</div>
              ))}
              {[0,3,3,1,3,2,3,7,0,9,3,4,5,7,0].map((val, i) => (
                <div 
                  key={i} 
                  className={`py-1 rounded ${val > 5 ? 'bg-purple-500/50 text-white' : val > 2 ? 'bg-purple-500/30 text-white/80' : 'text-white/40'}`}
                >
                  {val}
                </div>
              ))}
              <div className="text-white/30 text-[10px]">+15</div>
              <div className="text-white/30 text-[10px]">+1</div>
              <div className="text-white/30 text-[10px]">15</div>
              <div className="text-white/30 text-[10px]">38</div>
              <div className="text-white/30 text-[10px]">12</div>
            </div>
          </div>
        </div>

        {/* Right Column - Schools & Emails */}
        <div className="col-span-4 space-y-6">
          {/* Next Actions Cards */}
          <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(30, 30, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-white">Next Actions</h3>
              <button className="text-xs text-white/50 hover:text-white flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {programs.slice(0, 4).map((prog) => (
                <div key={prog.program_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {prog.university_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{prog.university_name}</p>
                    <p className="text-white/50 text-xs">{prog.next_action_due || 'No date'} - {prog.recruiting_status}</p>
                  </div>
                  <button className="px-3 py-1 rounded-full bg-purple-500/30 text-purple-300 text-xs hover:bg-purple-500/50 transition-colors">
                    Send Follow-Up
                  </button>
                  <span className="text-white/40 text-xs">{prog.next_action_due?.slice(5) || ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Emails */}
          <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(30, 30, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-white">Recent Emails</h3>
              <button className="text-xs text-white/50 hover:text-white flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {data.recent_interactions?.slice(0, 2).map((int, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold">
                    {int.university_name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">
                      {int.university_name?.split(' ')[0] || 'Coach'} <span className="text-white/50 font-normal">| {int.type}</span>
                    </p>
                    <p className="text-white/50 text-xs truncate">{int.outcome || 'Message preview...'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-xs">Last email 2d ago</p>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/30 text-blue-300">{int.type}</span>
                  </div>
                </div>
              )) || (
                <p className="text-white/40 text-sm text-center py-4">No recent emails</p>
              )}
            </div>
          </div>

          {/* Top Active Schools */}
          <div className="rounded-xl p-5 border border-white/10" style={{ backgroundColor: "rgba(30, 30, 50, 0.6)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-white">Top Active Schools</h3>
              <button 
                onClick={() => navigate("/knowledge-base")}
                className="text-xs text-white/50 hover:text-white flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {topSchools.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">No high priority schools</p>
              ) : (
                topSchools.map((school) => (
                  <div 
                    key={school.program_id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/programs/${school.program_id}`)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                      {school.university_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{school.university_name}</p>
                      <p className="text-white/50 text-xs">Last email done responsing</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40 text-xs">Last email 2d ago <ChevronRight className="w-3 h-3 inline" /></p>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-orange-500/30 text-orange-300">
                        {school.reply_status === "No Reply" ? "17 days without responding" : "Active"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
