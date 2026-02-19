import { useState, useEffect } from "react";
import { Users, Check, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function InvitationBanner() {
  const [invitations, setInvitations] = useState([]);
  const [processing, setProcessing] = useState(null);
  const [expanded, setExpanded] = useState(null);

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
    <div className="space-y-3 mb-5" data-testid="invitation-banner">
      {invitations.map((inv) => (
        <div
          key={inv.invite_id}
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "rgba(139, 92, 246, 0.06)", borderColor: "rgba(139, 92, 246, 0.2)" }}
          data-testid={`invitation-${inv.invite_id}`}
        >
          {/* Main banner */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>
                <span className="text-violet-400">{inv.inviter_name}</span> invited you to join their recruiting team
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                Collaborate on their dashboard with full access
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleAccept(inv.invite_id)}
                disabled={processing === inv.invite_id}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-50"
                data-testid={`accept-invite-${inv.invite_id}`}
              >
                {processing === inv.invite_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Join Team
              </button>
              <button
                onClick={() => handleDecline(inv.invite_id)}
                disabled={processing === inv.invite_id}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "var(--t-text-muted)" }}
                data-testid={`decline-invite-${inv.invite_id}`}
                title="Decline"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* What this means section */}
          <div className="border-t" style={{ borderColor: "rgba(139,92,246,0.12)" }}>
            <button
              onClick={() => setExpanded(expanded === inv.invite_id ? null : inv.invite_id)}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-medium transition-colors hover:bg-white/[0.02]"
              style={{ color: "var(--t-text-muted)" }}
              data-testid={`invite-details-toggle-${inv.invite_id}`}
            >
              What does this mean?
              {expanded === inv.invite_id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded === inv.invite_id && (
              <div className="px-5 pb-4 space-y-2" data-testid={`invite-details-${inv.invite_id}`}>
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
                    You'll <span style={{ color: "var(--t-text-secondary)" }}>share their recruiting dashboard</span> — see and edit the same schools, pipeline, calendar, and outreach.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
                    You get <span style={{ color: "var(--t-text-secondary)" }}>full access to all features</span> including AI tools, analytics, and email — based on their subscription plan.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
                    Your <span style={{ color: "var(--t-text-secondary)" }}>own account data stays safe</span>. You can leave the team anytime from Settings to return to your individual account.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
