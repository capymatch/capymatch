import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import {
  Sparkles, ChevronRight,
  Plus, Loader2, Mail, CheckCircle2, Shield, PartyPopper
} from "lucide-react";
import { toast } from "sonner";

/* ── Progress Step ── */
function ProgressStep({ num, label, done, current }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
          done ? "text-teal-600" : current ? "border-[1.5px] border-teal-500 text-teal-600" : "border border-slate-300 text-slate-400"
        }`}
        style={done ? { backgroundColor: "rgba(16,185,129,0.15)" } : current ? { backgroundColor: "rgba(46,196,182,0.12)" } : { backgroundColor: "rgba(148,163,184,0.08)" }}
      >
        {done ? "✓" : num}
      </div>
      <span className={`text-xs ${current ? "font-semibold" : ""}`} style={{ color: current ? "var(--t-text)" : done ? "#10b981" : "#94a3b8" }}>
        {label}
      </span>
    </div>
  );
}

/* ── Suggestion Grid Card ── */
function SuggestionCard({ school, onAdd, adding }) {
  const isReach = (school.match_reasons || []).some(r => ["Reach", "High Reach"].includes(r));
  const isSlightReach = (school.match_reasons || []).includes("Slight Reach");
  const isStrongFit = (school.match_reasons || []).some(r => ["Strong Academic Fit", "Good Academic Fit"].includes(r));
  const tierLabel = isReach ? "Reach" : isSlightReach ? "Slight Reach" : isStrongFit ? "Strong Fit" : null;
  const tierColor = isReach ? "#ef4444" : isSlightReach ? "#f59e0b" : isStrongFit ? "#10b981" : null;

  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`suggestion-${school.university_name.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-[12px] truncate" style={{ color: "var(--t-text)" }}>{school.university_name}</span>
          {school.match_score && <span className="text-[11px] font-bold" style={{ color: "#2ec4b6" }}>{school.match_score}%</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {school.division && <span className="text-[9px] font-bold px-1.5 py-px rounded" style={{ background: "var(--t-surface-alt, #f5f5f5)", color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}>{school.division}</span>}
          {school.conference && <span className="text-[9px]" style={{ color: "var(--t-text-muted)" }}>{school.conference}</span>}
          {tierLabel && <span className="text-[9px] font-semibold px-1.5 py-px rounded" style={{ color: tierColor, background: `${tierColor}10`, border: `1px solid ${tierColor}20` }}>{tierLabel}</span>}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onAdd(school); }} disabled={adding}
        className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
        style={{ background: "#2ec4b6", color: "white" }}
        data-testid={`add-suggestion-${school.university_name.replace(/\s+/g, "-").toLowerCase()}`}
      >
        {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3 inline mr-0.5" />Add</>}
      </button>
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
  const [celebrating, setCelebrating] = useState(null);

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
      setSuggestions((sugRes.data?.suggestions || []).slice(0, 15));
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
      setSuggestions(prev => prev.filter(s => s.university_name !== school.university_name));
      setCelebrating(school.university_name);
      // Show celebration for 2.5 seconds, then transition to pipeline
      setTimeout(() => {
        setCelebrating(null);
        if (onSchoolAdded) onSchoolAdded();
      }, 2500);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to add school";
      toast.error(msg);
    } finally {
      setAddingSchool(null);
    }
  };

  const handleConnectGmail = async () => {
    setGmailConnecting(true);
    const authWindow = window.open('about:blank', '_blank');
    try {
      const res = await api.get("/gmail/connect?return_to=/pipeline");
      authWindow.location.href = res.data.auth_url;
    } catch {
      if (authWindow) authWindow.close();
      toast.error("Failed to start Gmail connection");
      setGmailConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
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

  // Celebration overlay
  if (celebrating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 animate-in fade-in duration-300" data-testid="celebration-overlay">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(46,196,182,0.12)" }}>
          <PartyPopper className="w-8 h-8" style={{ color: "#2ec4b6" }} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-extrabold" style={{ color: "var(--t-text)" }}>First school added!</h2>
          <p className="text-sm mt-2" style={{ color: "var(--t-text-muted)" }}>
            <span className="font-semibold" style={{ color: "#2ec4b6" }}>{celebrating}</span> is now on your board.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>Setting up your recruiting pipeline...</p>
        </div>
        <div className="w-8 h-8 mt-2">
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#2ec4b6" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" data-testid="empty-board-state">

      {/* ═══ Welcome Hero Card ═══ */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="welcome-hero">

        {/* Progress Strip */}
        <div className="flex items-center gap-4 px-5 py-3 border-b overflow-x-auto" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface-alt, var(--t-surface))" }}>
          <ProgressStep num={1} label="Create Profile" done={profileDone} current={!profileDone} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "#cbd5e1" }} />
          <ProgressStep num={2} label="Connect Gmail" done={gmailConnected} current={profileDone && !gmailConnected} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "#cbd5e1" }} />
          <ProgressStep num={3} label="Add Schools" done={false} current={profileDone && gmailConnected} />
          <div className="w-5 h-px flex-shrink-0" style={{ backgroundColor: "#cbd5e1" }} />
          <ProgressStep num={4} label="Start Your Journey" done={false} current={false} />
        </div>

        {/* Hero Content */}
        <div className="relative px-6 pt-7 pb-12 lg:px-8 lg:pb-14">
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at 20% 50%, rgba(46,196,182,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.04) 0%, transparent 50%)"
          }} />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full mb-4"
              style={{ backgroundColor: "rgba(46,196,182,0.12)", color: "#2ec4b6" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#2ec4b6" }} />
              Step {currentStep} of 4
            </div>
            <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight mb-3" style={{ color: "var(--t-text)" }}>
              {!profileDone
                ? <>First, let's set up <span style={{ color: "#2ec4b6" }}>the athlete profile</span></>
                : !gmailConnected
                ? <>Connect <span style={{ color: "#2ec4b6" }}>Gmail</span> to email coaches</>
                : (firstName ? <>Let's build <span style={{ color: "#2ec4b6" }}>{firstName}'s</span> target list</> : <>Let's build your <span style={{ color: "#2ec4b6" }}>target list</span></>)
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
              <div className="mt-6 flex items-center gap-3">
                <button
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: "#2ec4b6", color: "white" }}
                  onClick={() => navigate("/profile?from=onboarding")}
                  data-testid="complete-profile-btn"
                >
                  Set Up Athlete Profile <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs" style={{ color: "var(--t-text-faint)" }}>· Takes about 3–5 minutes</span>
              </div>
            )}
            {profileDone && !gmailConnected && (
              <div className="mt-6 space-y-4">
                <button
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#2ec4b6", color: "white" }}
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
          <div className="px-6 pb-10 lg:px-8 lg:pb-12 flex items-center gap-4">
            <button
              className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: "#2ec4b6", color: "white" }}
              onClick={() => navigate("/knowledge-base?from=onboarding")}
              data-testid="find-schools-btn"
            >
              Find Schools <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>or add from the matches below</span>
          </div>
        )}
      </div>

      {/* ═══ Top Matches Grid ═══ */}
      {profileDone && gmailConnected && suggestions.length > 0 && (
        <div data-testid="ai-suggestions">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2ec4b6]" />
                <span className="text-[14px] font-bold" style={{ color: "var(--t-text)" }}>Top matches for you</span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>Based on your profile and preferences. Scores reflect academic realism.</p>
            </div>
            <button onClick={() => navigate("/knowledge-base")} className="text-[11px] font-medium" style={{ color: "#2ec4b6" }} data-testid="see-all-schools">
              See all schools
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {suggestions.map(s => (
              <SuggestionCard
                key={s.university_name}
                school={s}
                onAdd={handleAddSchool}
                adding={addingSchool === s.university_name}
              />
            ))}
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
