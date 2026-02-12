import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { STATUS_GROUPS } from "../lib/constants";
import { BarChart3, Users, Bell, TrendingUp, ArrowRight, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

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
    return <div className="text-gray-400 text-center py-12" data-testid="dashboard-loading">Loading dashboard...</div>;
  }

  const statCards = [
    { label: "Total Schools", value: data.total_schools, icon: Users, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Follow-Ups Due", value: data.follow_ups_due, icon: Bell, color: "text-orange-600", bg: "bg-orange-100" },
  ];

  const GROUP_BAR_COLORS = {
    not_contacted: "bg-red-400",
    contacted: "bg-green-400",
    active: "bg-blue-400",
    offers: "bg-amber-400",
    closed: "bg-gray-400",
  };

  return (
    <div data-testid="dashboard" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-gray-900" data-testid="dashboard-title">
            {data.athlete_name ? `${data.athlete_name}'s Dashboard` : "Dashboard"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">Your recruiting overview at a glance</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stat-cards">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-white border-gray-200 shadow-sm" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider">{stat.label}</p>
                <p className="font-heading text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {Object.entries(data.status_counts || {}).slice(0, 2).map(([group, count]) => (
          <Card key={group} className="bg-white border-gray-200 shadow-sm" data-testid={`stat-group-${group.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider truncate max-w-[150px]">{group}</p>
                <p className="font-heading text-3xl font-bold text-gray-900">{count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Breakdown + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-white border-gray-200 shadow-sm" data-testid="status-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" /> Board Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.status_counts || {}).map(([group, count]) => {
              const groupInfo = STATUS_GROUPS.find((g) => g.label === group);
              const pct = data.total_schools > 0 ? Math.round((count / data.total_schools) * 100) : 0;
              return (
                <div key={group} className="flex items-center gap-3" data-testid={`breakdown-${group.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-700 text-xs">{group}</span>
                      <span className="text-gray-500 text-xs">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${GROUP_BAR_COLORS[groupInfo?.key] || "bg-gray-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => navigate("/board")}
              data-testid="go-to-board-btn"
              className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-xs mt-2 transition-colors"
            >
              Go to Recruiting Board <ArrowRight className="w-3 h-3" />
            </button>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm" data-testid="recent-activity">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_interactions && data.recent_interactions.length > 0 ? (
              <div className="space-y-2">
                {data.recent_interactions.map((int, i) => (
                  <div key={int.interaction_id || i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`activity-${i}`}>
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-xs font-medium truncate">{int.university_name}</p>
                      <p className="text-gray-500 text-xs">{int.type} {int.outcome ? `- ${int.outcome}` : ""}</p>
                    </div>
                    <span className="text-gray-400 text-[10px] whitespace-nowrap">
                      {int.date_time ? new Date(int.date_time).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm py-4 text-center">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/follow-ups")}
          data-testid="quick-follow-ups"
          className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm hover:bg-orange-100 transition-colors"
        >
          <Bell className="w-4 h-4" /> View Follow-Ups ({data.follow_ups_due})
        </button>
        <button
          onClick={() => navigate("/knowledge-base")}
          data-testid="quick-knowledge-base"
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition-colors"
        >
          Browse University Library
        </button>
      </div>
    </div>
  );
}
