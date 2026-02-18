import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import {
  Sparkles, ChevronRight,
  CheckCircle, Plus, Loader2, Mail, CheckCircle2, Shield
} from "lucide-react";
import { toast } from "sonner";
import UniversityLogo from "../../components/UniversityLogo";

/* ── Progress Step ── */
function ProgressStep({ num, label, done, current }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
          done ? "text-emerald-400" : current ? "border-[1.5px] border-pink-500 text-pink-400" : "border border-white/10 text-white/25"
        }`}
        style={done ? { backgroundColor: "rgba(16,185,129,0.12)" } : current ? { backgroundColor: "rgba(232,69,107,0.12)" } : { backgroundColor: "var(--t-surface)" }}
      >
        {done ? "✓" : num}
      </div>
      <span className={`text-xs ${current ? "font-semibold" : ""}`} style={{ color: current ? "var(--t-text)" : "var(--t-text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

/* ── Suggestion Card ── */
function SuggestionCard({ school, onAdd, adding }) {
  const scoreColor = school.match_score >= 80
    ? { bg: "rgba(16,185,129,0.12)", color: "#10b981" }
    : school.match_score >= 60
    ? { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" }
    : { bg: "rgba(107,114,128,0.12)", color: "#6b7280" };

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 border-b last:border-b-0 transition-colors"
      style={{ borderColor: "var(--t-border)" }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--t-surface-hover, rgba(255,255,255,0.02))"; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
      data-testid={`suggestion-${school.university_name}`}
    >
      <UniversityLogo domain={school.domain} name={school.university_name} size={48} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{school.university_name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>
          {school.division || "—"}{school.conference ? ` · ${school.conference}` : ""}{school.region ? ` · ${school.region}` : ""}
        </p>
        {school.match_reasons?.length > 0 && (
          <p className="text-[11px] mt-1 flex items-start gap-1" style={{ color: "var(--t-text-secondary)" }}>
            <span style={{ color: "#f59e0b", flexShrink: 0 }}>✦</span>
            {school.match_reasons.join(" · ")}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg" style={{ backgroundColor: scoreColor.bg, color: scoreColor.color }}>
          {school.match_score}%
        </span>
        <button
          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50"
          style={{ borderColor: "#e8456b", color: "#e8456b" }}
          onClick={(e) => { e.stopPropagation(); onAdd(school); }}
          disabled={adding}
          onMouseEnter={e => { if (!adding) { e.currentTarget.style.backgroundColor = "#e8456b"; e.currentTarget.style.color = "white"; }}}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#e8456b"; }}
          data-testid={`add-suggestion-${school.university_name}`}
        >
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add to Board
        </button>
      </div>
    </div>
  );
}

/* ── Ghost Board Column ── */
function GhostColumn({ label, cardCount }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-center px-3 py-2 rounded-lg mb-2" style={{ backgroundColor: "var(--t-surface-alt, var(--t-surface))", color: "var(--t-text-muted)" }}>
        {label}
      </div>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 mb-2" style={{ backgroundColor: "var(--t-surface-alt, var(--t-surface))", borderColor: "var(--t-border)" }}>
          <div className="h-2 rounded-full mb-1.5" style={{ width: i % 2 === 0 ? "80%" : "60%", backgroundColor: "var(--t-text-faint)", opacity: 0.25 }} />
          <div className="h-2 rounded-full mb-1.5" style={{ width: i % 2 === 0 ? "60%" : "80%", backgroundColor: "var(--t-text-faint)", opacity: 0.2 }} />
          <div className="h-1.5 rounded-full mt-2" style={{ width: "40%", backgroundColor: "var(--t-text-faint)", opacity: 0.15 }} />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Main Empty Board State Component ──    */
/* ══════════════════════════════════════════ */
export default function EmptyBoardState({ onSchoolAdded }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingSchool, setAddingSchool] = useState(null);
  const [gmailConnecting, setGmailConnecting] = useState(false);

  // Handle Gmail OAuth callback params
  useEffect(() => {
    const gmailResult = searchParams.get("gmail");
    if (gmailResult === "connected") {
      toast.success("Gmail connected successfully!");
      setGmailConnected(true);
      searchParams.delete("gmail");
      setSearchParams(searchParams, { replace: true });
    } else if (gmailResult === "error") {
      const reason = searchParams.get("reason") || "unknown";
      toast.error(`Gmail connection failed: ${reason}`);
      searchParams.delete("gmail");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    Promise.all([
      api.get("/athlete-profile").catch(() => ({ data: {} })),
      api.get("/suggested-schools").catch(() => ({ data: { suggestions: [] } })),
      api.get("/gmail/status").catch(() => ({ data: { connected: false } })),
      api.get("/dashboard").catch(() => ({ data: {} })),
    ]).then(([profRes, sugRes, gmailRes, dashRes]) => {
      const profileData = profRes.data || {};
      // athlete_name comes from the tenant (via dashboard), not from athlete_profiles
      if (dashRes.data?.athlete_name) {
        profileData.athlete_name = dashRes.data.athlete_name;
      }
      setProfile(profileData);
      setSuggestions(sugRes.data?.suggestions || []);
      setGmailConnected(gmailRes.data?.connected || false);
    }).finally(() => setLoading(false));
  }, []);

  const handleAddSchool = async (school) => {
    setAddingSchool(school.university_name);
    try {
      await api.post("/programs", {
        university_name: school.university_name,
        division: school.division,
        conference: school.conference,
      });
      toast.success(`${school.university_name} added to your board!`);
      setSuggestions(prev => prev.filter(s => s.university_name !== school.university_name));
      if (onSchoolAdded) onSchoolAdded();
      // Trigger guided tour after first school is added
      if (!localStorage.getItem("tour_completed")) {
        localStorage.setItem("show_tour", "true");
        window.dispatchEvent(new Event("trigger_tour"));
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to add school";
      toast.error(msg);
    } finally {
      setAddingSchool(null);
    }
  };

  const handleConnectGmail = async () => {
    setGmailConnecting(true);
    try {
      const res = await api.get("/gmail/connect?return_to=/pipeline");
      window.location.href = res.data.auth_url;
    } catch {
      toast.error("Failed to start Gmail connection");
      setGmailConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const athleteName = profile?.athlete_name || profile?.name || "";
  const firstName = athleteName.split(" ")[0] || "";
  // Profile is "done" when the essential fields coaches need are filled
  const essentialFields = [
    profile?.athlete_name,
    profile?.grad_year,
    profile?.position,
    profile?.height,
    profile?.city || profile?.state_loc,
    profile?.club_team || profile?.high_school,
  ];
  const filledCount = essentialFields.filter(Boolean).length;
  const profileDone = filledCount >= 5; // 5 of 6 essential fields
  const currentStep = !profileDone ? 1 : !gmailConnected ? 2 : 3;
  const divPref = profile?.division || "";
  const regionPref = (profile?.regions || []).join(", ") || "";

  return (
    <div className="flex flex-col gap-5" data-testid="empty-board-state">

      {/* ═══ Welcome Hero Card ═══ */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="welcome-hero">

        {/* Progress Strip */}
        <div className="flex items-center gap-4 px-5 py-3 border-b overflow-x-auto" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface-alt, var(--t-surface))" }}>
          <ProgressStep num={1} label="Create Profile" done={profileDone} current={!profileDone} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "var(--t-border)" }} />
          <ProgressStep num={2} label="Connect Gmail" done={gmailConnected} current={profileDone && !gmailConnected} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "var(--t-border)" }} />
          <ProgressStep num={3} label="Add Schools" done={false} current={profileDone && gmailConnected} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "var(--t-border)" }} />
          <ProgressStep num={4} label="Start Your Journey" done={false} current={false} />
        </div>

        {/* Hero Content */}
        <div className="relative px-6 pt-7 pb-4 lg:px-8">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at 20% 50%, rgba(232,69,107,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.04) 0%, transparent 50%)"
          }} />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "rgba(232,69,107,0.12)", color: "#e8456b" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#e8456b" }} />
              Step {currentStep} of 4
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight mb-2" style={{ color: "var(--t-text)" }}>
              {!profileDone
                ? <>First, let's set up <span style={{ color: "#e8628a" }}>the athlete profile</span></>
                : !gmailConnected
                ? <>Connect <span style={{ color: "#e8628a" }}>Gmail</span> to email coaches</>
                : (firstName ? <>Let's build <span style={{ color: "#e8628a" }}>{firstName}'s</span> target list</> : <>Let's build your <span style={{ color: "#e8628a" }}>target list</span></>)
              }
            </h2>
            <p className="text-sm leading-relaxed max-w-lg" style={{ color: "var(--t-text-secondary)" }}>
              {!profileDone
                ? "Add the athlete's name, position, key details, and highlight video so coaches know exactly who they're hearing from."
                : !gmailConnected
                ? "Link your Gmail so you can send and receive coach emails directly inside the app — no switching tabs."
                : "Browse programs, get AI-matched suggestions, or search by division and location. You can always add or remove schools later."
              }
            </p>
            {!profileDone && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: "#e8456b", color: "white" }}
                  onClick={() => navigate("/profile")}
                  data-testid="complete-profile-btn"
                >
                  Set Up Athlete Profile <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs" style={{ color: "var(--t-text-faint)" }}>· Takes about 3–5 minutes</span>
              </div>
            )}
            {profileDone && !gmailConnected && (
              <div className="mt-5 space-y-4">
                <button
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#e8456b", color: "white" }}
                  onClick={handleConnectGmail}
                  disabled={gmailConnecting}
                  data-testid="connect-gmail-btn"
                >
                  {gmailConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {gmailConnecting ? "Connecting..." : "Connect Gmail"} <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3 rounded-lg px-4 py-3" style={{ backgroundColor: "var(--t-surface-alt, rgba(255,255,255,0.03))" }}>
                  <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--t-text-muted)" }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}>Secure Google connection</p>
                    <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
                      We only request permission to send and read emails. You can disconnect anytime from Settings.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {profileDone && gmailConnected && (
              <p className="flex items-center gap-1.5 text-xs mt-3" style={{ color: "var(--t-text-muted)" }}>
                <span style={{ fontSize: "13px" }}>📊</span>
                Most families start with 8–15 schools across 2–3 divisions
              </p>
            )}
          </div>
        </div>

        {/* Action — only shown on Step 3 (Add Schools) */}
        {profileDone && gmailConnected && (
          <div className="px-6 pb-4 lg:px-8 flex items-center gap-4">
            <button
              className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: "#e8456b", color: "white" }}
              onClick={() => navigate("/knowledge-base?from=onboarding")}
              data-testid="find-schools-btn"
            >
              Find Schools <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>or add from the matches below</span>
          </div>
        )}
      </div>

      {/* ═══ AI Suggested Schools ═══ */}
      {profileDone && gmailConnected && suggestions.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="ai-suggestions">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(168,85,247,0.12)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "#a855f7" }} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
                  {firstName ? `Matched for ${firstName}` : "Matched for You"}
                </h3>
                <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                  Based on your profile{divPref ? `: ${divPref}` : ""}{regionPref ? ` · ${regionPref}` : ""}
                </p>
              </div>
            </div>
            <button onClick={() => navigate("/knowledge-base?tab=recommended")} className="text-xs font-semibold flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: "#e8628a" }} data-testid="view-all-matches-btn">
              View all matches <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {suggestions.map(s => (
              <SuggestionCard
                key={s.university_name}
                school={s}
                onAdd={handleAddSchool}
                adding={addingSchool === s.university_name}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 px-5 py-3.5 border-t" style={{ borderColor: "var(--t-border)" }}>
            <CheckCircle className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
            <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>
              Families using Recruiting HQ track an average of 12 schools and send their first coach email within 48 hours.
            </span>
          </div>
        </div>
      )}

      {/* ═══ Ghost Board Preview ═══ */}
      {profileDone && gmailConnected && (
      <div className="rounded-xl border overflow-hidden relative" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="ghost-board">
        <div className="p-6">
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-3" style={{ opacity: 0.25 }}>
            <GhostColumn label="Needs Outreach" cardCount={2} />
            <GhostColumn label="Contacted" cardCount={3} />
            <GhostColumn label="Waiting Reply" cardCount={1} />
            <div className="hidden lg:block"><GhostColumn label="In Conversation" cardCount={1} /></div>
            <div className="hidden lg:block"><GhostColumn label="Offer / Commit" cardCount={1} /></div>
          </div>
        </div>
        {/* Fade overlay */}
        <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent 0%, var(--t-bg) 75%)" }}>
          <div className="text-center pointer-events-auto">
            <p className="text-sm font-medium" style={{ color: "var(--t-text-secondary)" }}>
              This is where you'll track every school — from first contact to offer
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--t-text-faint)" }}>
              Add schools above to start building your board
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
