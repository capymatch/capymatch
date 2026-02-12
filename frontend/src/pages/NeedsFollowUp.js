import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { DIVISION_COLORS, PRIORITY_COLORS } from "../lib/constants";
import { Bell, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

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
    return <div className="text-slate-400 text-center py-12" data-testid="followup-loading">Loading follow-ups...</div>;
  }

  return (
    <div data-testid="needs-follow-up" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-orange-400" />
          <h2 className="font-heading text-2xl font-bold text-white" data-testid="followup-title">Needs Follow-Up</h2>
          <Badge className="bg-orange-900 text-orange-200">{programs.length} due</Badge>
        </div>
      </div>

      {programs.length === 0 ? (
        <Card className="bg-[#1e293b] border-[#334155]">
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-slate-300 text-lg font-heading font-bold">All caught up!</p>
            <p className="text-slate-500 text-sm mt-1">No follow-ups due at this time</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {programs.map((p) => {
            const overdue = getDaysOverdue(p.next_action_due);
            return (
              <Card key={p.program_id} className="bg-[#1e293b] border-[#334155] hover:border-[#475569] transition-colors" data-testid={`followup-${p.program_id}`}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${DIVISION_COLORS[p.division] || "bg-slate-600 text-white"}`}>
                        {p.division}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/programs/${p.program_id}`)}
                        data-testid={`followup-link-${p.program_id}`}
                        className="text-white font-medium hover:text-blue-400 transition-colors text-sm truncate block"
                      >
                        {p.university_name}
                      </button>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span>{p.conference}</span>
                        {p.primary_coach && <span>| {p.primary_coach}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-400 text-xs">Due: {p.next_action_due}</span>
                      </div>
                      {overdue > 0 && (
                        <span className="text-red-400 text-xs font-bold">{overdue} day{overdue !== 1 ? "s" : ""} overdue</span>
                      )}
                      {overdue === 0 && (
                        <span className="text-orange-400 text-xs font-bold">Due today</span>
                      )}
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`text-xs font-bold ${PRIORITY_COLORS[p.priority] || "text-slate-400"}`}>{p.priority}</span>
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
                      className="text-xs border-[#334155] text-slate-300 hover:bg-[#334155] h-8"
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
  );
}
