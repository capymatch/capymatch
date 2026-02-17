import { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Crown, Trash2, Loader2, Mail, X, ArrowUpRight, ChevronDown, ChevronUp, Shield, Pencil, Info } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import { useSubscription } from "../lib/subscription";

function HowItWorks({ isOwner }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-5 rounded-xl border overflow-hidden" style={{ borderColor: "rgba(139,92,246,0.2)", backgroundColor: "rgba(139,92,246,0.04)" }} data-testid="team-how-it-works">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
        data-testid="team-how-it-works-toggle"
      >
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span className="text-sm font-medium text-violet-300">How team collaboration works</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4 text-violet-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3" data-testid="team-how-it-works-content">
          {isOwner ? (
            <>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>You are the Owner</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                    You manage billing, subscriptions, and team members. Only you can invite or remove people.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <UserPlus className="w-3.5 h-3.5 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>How to invite</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                    Enter their email below and click Invite. They'll see a banner on their dashboard to accept. If they don't have an account yet, they'll need to sign up first with that same email.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>What members can do</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                    Members get full access to your recruiting dashboard — they can add schools, manage the pipeline, use AI tools, and edit everything. They just can't change billing or manage the team.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>You are a Member</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                    You have full access to the team's recruiting dashboard — add schools, manage the pipeline, use AI tools, and collaborate on everything.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>What's managed by the Owner</p>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                    Billing, subscription plan, and team membership are controlled by the account owner. You can leave the team anytime to return to your own account.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BasicPlanUpgradeCard() {
  return (
    <div className="rounded-xl border border-dashed p-5" style={{ borderColor: "rgba(244,63,94,0.25)", backgroundColor: "rgba(244,63,94,0.03)" }} data-testid="team-upgrade-card">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-pink-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--t-text)" }}>
            Want to collaborate with a parent, advisor, or teammate?
          </p>
          <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--t-text-muted)" }}>
            Upgrade to <span className="text-pink-400 font-medium">Pro</span> to invite 1 collaborator who gets full access to your recruiting dashboard — they can add schools, manage your pipeline, and help with outreach. <span className="text-amber-400 font-medium">Premium</span> gives you unlimited team members.
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="text-[11px] font-medium" style={{ color: "var(--t-text-secondary)" }}>Pro — 2 members</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-medium" style={{ color: "var(--t-text-secondary)" }}>Premium — Unlimited</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamSection() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const { subscription } = useSubscription();

  const fetchTeam = useCallback(async () => {
    try {
      const res = await api.get("/team");
      setTeam(res.data);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post("/team/invite", { email: inviteEmail.trim() });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      fetchTeam();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") toast.error(detail);
      else if (detail?.message) toast.error(detail.message);
      else toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await api.delete(`/team/invitations/${inviteId}`);
      toast.success("Invitation cancelled");
      fetchTeam();
    } catch {
      toast.error("Failed to cancel invitation");
    }
  };

  const handleRemoveMember = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    try {
      await api.delete(`/team/members/${userId}`);
      toast.success(`${name} removed from team`);
      fetchTeam();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this team? You'll return to your own individual account.")) return;
    try {
      await api.post("/team/leave");
      toast.success("You've left the team");
      setTimeout(() => window.location.reload(), 500);
    } catch {
      toast.error("Failed to leave team");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-pink-600" />
          <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Loading team...</span>
        </div>
      </div>
    );
  }

  if (!team) return null;

  const isOwner = team.current_user_role === "owner";
  const maxMembers = team.limits.max_members;
  const currentCount = team.limits.current_count;
  const canInvite = isOwner && (maxMembers === -1 || (currentCount + team.pending_invitations.length) < maxMembers);
  const atLimit = isOwner && maxMembers !== -1 && currentCount >= maxMembers && team.pending_invitations.length === 0;
  const tierLabel = subscription?.label || "Basic";
  const isBasic = false; // Starter now has all Pro features

  return (
    <div className="rounded-xl p-6 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="team-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h2 className="font-semibold text-lg" style={{ color: "var(--t-text)" }}>Team</h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
              {maxMembers === -1 ? "Unlimited members" : `${currentCount} of ${maxMembers} member${maxMembers !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {maxMembers !== -1 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-muted)" }}>
            {tierLabel} Plan
          </div>
        )}
      </div>

      {/* How it works */}
      <HowItWorks isOwner={isOwner} />

      {/* Team Members */}
      <div className="space-y-2 mb-4">
        {/* Owner */}
        {team.owner && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }} data-testid="team-owner-row">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {team.owner.name?.charAt(0) || "O"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{team.owner.name}</p>
                {isOwner && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5" style={{ color: "var(--t-text-muted)" }}>You</span>}
              </div>
              <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }}>{team.owner.email}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
              <Crown className="w-3 h-3" /> Owner
            </div>
          </div>
        )}

        {/* Members */}
        {team.members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }} data-testid={`team-member-${m.user_id}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {m.name?.charAt(0) || "M"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{m.name}</p>
                {!isOwner && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5" style={{ color: "var(--t-text-muted)" }}>You</span>}
              </div>
              <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }}>{m.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400">
                Member
              </span>
              {isOwner && (
                <button
                  onClick={() => handleRemoveMember(m.user_id, m.name)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-white/30 hover:text-red-400"
                  data-testid={`remove-member-${m.user_id}`}
                  title="Remove member"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending Invitations */}
      {team.pending_invitations.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--t-text-muted)" }}>Pending Invitations</p>
          {team.pending_invitations.map((inv) => (
            <div key={inv.invite_id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed" style={{ borderColor: "var(--t-border)" }} data-testid={`pending-invite-${inv.invite_id}`}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                <Mail className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--t-text-secondary)" }}>{inv.email}</p>
                <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>Waiting for them to accept</p>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleCancelInvite(inv.invite_id)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ color: "var(--t-text-muted)" }}
                  data-testid={`cancel-invite-${inv.invite_id}`}
                  title="Cancel invitation"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite Form or Upgrade Card */}
      {isOwner && (
        <>
          {canInvite ? (
            <>
              <p className="text-xs mb-2" style={{ color: "var(--t-text-muted)" }}>
                They'll need to create an account with this email to accept.
              </p>
              <form onSubmit={handleInvite} className="flex gap-2" data-testid="invite-form">
                <div className="flex-1 relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                  <input
                    type="email"
                    placeholder="Enter email to invite..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    data-testid="invite-email-input"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-pink-500/50 transition-colors"
                    style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviting}
                  data-testid="invite-submit-btn"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
                </button>
              </form>
            </>
          ) : atLimit && isBasic ? (
            <BasicPlanUpgradeCard />
          ) : atLimit ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-dashed" style={{ borderColor: "rgba(244,63,94,0.3)", backgroundColor: "rgba(244,63,94,0.05)" }}>
              <p className="text-sm" style={{ color: "var(--t-text-secondary)" }}>
                Your {tierLabel} plan is at its team limit. Upgrade for more members.
              </p>
              <span className="flex items-center gap-1 text-xs font-semibold text-pink-400">
                Upgrade <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          ) : null}
        </>
      )}

      {/* Leave button for members */}
      {!isOwner && (
        <button
          onClick={handleLeave}
          className="w-full mt-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
          data-testid="leave-team-btn"
        >
          Leave Team
        </button>
      )}
    </div>
  );
}
