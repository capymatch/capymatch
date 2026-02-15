import { useState, useEffect } from "react";
import { Users, Check, X, Loader2 } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function InvitationBanner() {
  const [invitations, setInvitations] = useState([]);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    api.get("/team/my-invitations")
      .then(res => setInvitations(res.data.invitations || []))
      .catch(() => {});
  }, []);

  if (invitations.length === 0) return null;

  const handleAccept = async (inviteId) => {
    setProcessing(inviteId);
    try {
      await api.post(`/team/invitations/${inviteId}/accept`);
      toast.success("You've joined the team! Reloading...");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to accept invitation");
      setProcessing(null);
    }
  };

  const handleDecline = async (inviteId) => {
    setProcessing(inviteId);
    try {
      await api.post(`/team/invitations/${inviteId}/decline`);
      setInvitations(prev => prev.filter(i => i.invite_id !== inviteId));
      toast.success("Invitation declined");
    } catch {
      toast.error("Failed to decline invitation");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-2 mb-4" data-testid="invitation-banner">
      {invitations.map((inv) => (
        <div
          key={inv.invite_id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ backgroundColor: "rgba(139, 92, 246, 0.08)", borderColor: "rgba(139, 92, 246, 0.25)" }}
          data-testid={`invitation-${inv.invite_id}`}
        >
          <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>
              <span className="text-violet-400">{inv.inviter_name}</span> invited you to join their team
            </p>
            <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>You'll share their recruiting dashboard and collaborate together</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => handleAccept(inv.invite_id)}
              disabled={processing === inv.invite_id}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-50"
              data-testid={`accept-invite-${inv.invite_id}`}
            >
              {processing === inv.invite_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Accept
            </button>
            <button
              onClick={() => handleDecline(inv.invite_id)}
              disabled={processing === inv.invite_id}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: "var(--t-text-muted)" }}
              data-testid={`decline-invite-${inv.invite_id}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
