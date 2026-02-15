import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Bell, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import FeatureGate from "../components/FeatureGate";

const DIVISION_BADGE = {
  D1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  D2: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  D3: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  NAIA: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  JUCO: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const PRIORITY_COLORS = {
  Low: "var(--t-text-muted)",
  Medium: "#60a5fa",
  High: "#fb923c",
  "Very High": "#ef4444",
};

export default function NeedsFollowUp() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState({});
  const navigate = useNavigate();

  const fetchFollowUps = async () => {
    try {
      const res = await api.get("/follow-ups");
      setPrograms(res.data);
    } catch {
      toast.error("Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFollowUps(); }, []);

  const markSent = async (programId) => {
    setMarking((prev) => ({ ...prev, [programId]: true }));
    try {
      await api.post(`/follow-ups/${programId}/mark-sent`, { outcome: "No Response", reply_status: "No Reply" });
      toast.success("Follow-up marked as sent");
      fetchFollowUps();
    } catch {
      toast.error("Failed to mark follow-up");
    } finally {
      setMarking((prev) => ({ ...prev, [programId]: false }));
    }
  };

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.floor((today - due) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return <div className="text-center py-12" style={{ color: "var(--t-text-muted)" }} data-testid="followup-loading">Loading follow-ups...</div>;
  }

  return (
    <FeatureGate feature="follow_up_reminders">
    <div data-testid="needs-follow-up" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30">{programs.length} due</Badge>
        </div>
      </div>

      {programs.length === 0 ? (
        <Card className="shadow-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-heading font-bold" style={{ color: "var(--t-text)" }}>All caught up!</p>
            <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>No follow-ups due at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {programs.map((p) => {
            const overdue = getDaysOverdue(p.next_action_due);
            return (
              <Card key={p.program_id} className="shadow-sm transition-colors" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid={`followup-${p.program_id}`}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${DIVISION_BADGE[p.division] || "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
                        {p.division}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/programs/${p.program_id}`)}
                        data-testid={`followup-link-${p.program_id}`}
                        className="font-medium transition-colors text-sm truncate block"
                        style={{ color: "var(--t-text)" }}
                      >
                        {p.university_name}
                      </button>
                      <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--t-text-muted)" }}>
                        <span>{p.conference}</span>
                        {p.primary_coach && <span>| {p.primary_coach}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>Due: {p.next_action_due}</span>
                      </div>
                      {overdue > 0 && (
                        <span className="text-red-500 text-xs font-bold">{overdue} day{overdue !== 1 ? "s" : ""} overdue</span>
                      )}
                      {overdue === 0 && (
                        <span className="text-orange-500 text-xs font-bold">Due today</span>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: PRIORITY_COLORS[p.priority] || "var(--t-text-muted)" }}>{p.priority}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => markSent(p.program_id)}
                      disabled={marking[p.program_id]}
                      data-testid={`mark-sent-${p.program_id}`}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {marking[p.program_id] ? "Sending..." : "Mark Sent"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/programs/${p.program_id}`)}
                      data-testid={`followup-detail-${p.program_id}`}
                      className="text-xs h-8"
                      style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
                    >
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </FeatureGate>
  );
}
