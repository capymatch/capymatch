import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import {
  ArrowLeft, Mail, Phone, Clock, Target,
  MessageSquare, Users, Loader2, ChevronDown, ChevronUp,
  Plus, Edit2, Trash2, X, GitCompare, AlertCircle, Info
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import NotesSidebar from "../components/NotesSidebar";
import { RiskBadgeRow, RiskBadgeEmpty, RiskExplainerDrawer } from "../components/RiskBadges";
import { TimelineStatusCard } from "../components/TimelineIntelligence";
import { RosterRealityCard } from "../components/RosterOutlook";
import { ScholarshipStructureCard } from "../components/ScholarshipStructure";
import { NilReadinessCard } from "../components/NilReadiness";
import {
  ProgressRail, PulseIndicator, GettingStartedChecklist,
  CommittedHero, CelebrationHero, NextStepCard, ConversationBubble,
  AtAGlanceCard, StageLogModal, FloatingActionBar,
  CoachForm, LogInteractionForm, EmailComposer,
  FollowUpScheduler, MarkAsRepliedModal, STAGE_LABELS,
} from "../components/journey";

export default function RecruitingJourney() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const isBasic = false;
  const isPremium = subscription?.tier === "premium";

  const [program, setProgram] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchScore, setMatchScore] = useState(null);
  const [riskBadges, setRiskBadges] = useState([]);
  const [riskDrawer, setRiskDrawer] = useState(false);
  const [recruitingTimeline, setRecruitingTimeline] = useState(null);
  const [rosterOutlook, setRosterOutlook] = useState(null);
  const [scholarship, setScholarship] = useState(null);
  const [nilReadiness, setNilReadiness] = useState(null);
  const [profileComplete, setProfileComplete] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [coachWatchAlert, setCoachWatchAlert] = useState(null);

  const [activeForm, setActiveForm] = useState(null);
  const [editCoach, setEditCoach] = useState(null);

  const closeForm = () => { setActiveForm(null); setEditCoach(null); };
  const openEmail = () => { setActiveForm(prev => prev === "email" ? null : "email"); };
  const openLog = () => { setActiveForm(prev => prev === "log" ? null : "log"); };
  const openReplied = () => { setActiveForm(prev => prev === "replied" ? null : "replied"); };
  const openCoach = () => { setActiveForm("coach"); };
  const openFollowup = () => { setActiveForm(prev => prev === "followup" ? null : "followup"); };

  const fetchData = useCallback(async () => {
    try {
      const [progRes, journeyRes, coachRes, profRes, notesRes, msRes] = await Promise.allSettled([
        api.get(`/programs/${programId}`),
        api.get(`/programs/${programId}/journey`),
        api.get(`/coaches?program_id=${programId}`),
        api.get("/athlete-profile"),
        api.get(`/programs/${programId}/notes`),
        !isBasic ? api.get("/match-scores") : Promise.resolve({ data: null }),
      ]);
      if (progRes.status !== "fulfilled" || journeyRes.status !== "fulfilled") {
        throw new Error("Failed to load core data");
      }
      setProgram(progRes.value.data);
      setTimeline(journeyRes.value.data.timeline || []);
      setCoaches(coachRes.status === "fulfilled" ? (coachRes.value.data || []) : []);
      if (profRes.status === "fulfilled") {
        const p = profRes.value.data;
        const filled = [p.athlete_name, p.position, p.height, p.graduation_year, p.video_link].filter(Boolean);
        setProfileComplete(filled.length >= 5);
      } else { setProfileComplete(false); }
      if (notesRes.status === "fulfilled") {
        setNotesCount((notesRes.value.data.pinned?.length || 0) + (notesRes.value.data.recent?.length || 0));
      } else { setNotesCount(0); }
      if (msRes.status === "fulfilled" && msRes.value.data?.scores) {
        const found = msRes.value.data.scores.find(s => s.program_id === programId);
        if (found) {
          setMatchScore(found);
          setRiskBadges(found.risk_badges || []);
          setRecruitingTimeline(found.timeline || null);
          setRosterOutlook(found.roster || null);
          setScholarship(found.scholarship || null);
          setNilReadiness(found.nil || null);
        }
      }
      setLoading(false);
      if (!isBasic) {
        try {
          const cwRes = await api.get(`/ai/coach-watch/alert/${encodeURIComponent(progRes.value.data.university_name)}`);
          setCoachWatchAlert(cwRes.data?.alert || null);
        } catch { setCoachWatchAlert(null); }
      }
    } catch {
      toast.error("Failed to load journey data");
      setLoading(false);
    }
  }, [programId, isBasic]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateProgram = async (updates) => {
    try {
      const res = await api.put(`/programs/${programId}`, updates);
      setProgram(prev => ({ ...prev, ...res.data }));
      toast.success("Updated");
    } catch { toast.error("Failed to update"); }
  };

  const saveCoach = async (data) => {
    try {
      if (editCoach) await api.put(`/coaches/${editCoach.coach_id}`, data);
      else await api.post("/coaches", { ...data, university_name: program.university_name });
      toast.success(editCoach ? "Coach updated" : "Coach added");
      closeForm();
      const res = await api.get(`/coaches?program_id=${programId}`);
      setCoaches(res.data || []);
    } catch { toast.error("Failed to save coach"); }
  };

  const deleteCoach = async (coachId) => {
    try {
      await api.delete(`/coaches/${coachId}`);
      setCoaches(prev => prev.filter(c => c.coach_id !== coachId));
      toast.success("Coach removed");
    } catch { toast.error("Failed to delete"); }
  };

  const [pendingStage, setPendingStage] = useState(null);

  const handleStageClick = async (stageKey) => {
    const currentManual = program.journey_stage || "";
    if (currentManual === stageKey) {
      await updateProgram({ journey_stage: "" });
      const res = await api.get(`/programs/${programId}`);
      setProgram(res.data);
    } else {
      setPendingStage(stageKey);
    }
  };

  const confirmStageChange = async (note) => {
    if (!pendingStage) return;
    const fromLabel = STAGE_LABELS[rail?.active] || rail?.active || "\u2014";
    const toLabel = STAGE_LABELS[pendingStage] || pendingStage;
    try {
      await updateProgram({ journey_stage: pendingStage });
      await api.post("/interactions", {
        program_id: programId,
        type: "Stage Update",
        notes: note,
        outcome: `${fromLabel} \u2192 ${toLabel}`,
      });
      const res = await api.get(`/programs/${programId}`);
      setProgram(res.data);
      fetchData();
    } catch { toast.error("Failed to update stage"); }
    setPendingStage(null);
  };

  const [nextStepDismissed, setNextStepDismissed] = useState(null);
  const [showJourneyDetails, setShowJourneyDetails] = useState(false);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>;
  if (!program) return (
    <div className="text-center py-24">
      <p style={{ color: "var(--t-text-muted)" }}>Program not found</p>
      <Button onClick={() => navigate("/pipeline")} className="mt-4">Back to My Schools</Button>
    </div>
  );

  const rail = program.journey_rail;
  const boardGroup = program.board_group;
  const isCommitted = rail?.stages?.committed === true;
  const checklistComplete = profileComplete && coaches.some(c => c.email) && timeline.length > 0 && notesCount > 0;
  const isNewSchool = !checklistComplete && !isCommitted;
  const latestIsCoachReply = timeline.length > 0 && ["email_received", "coach_reply"].includes(
    (timeline[0]?.event_type || timeline[0]?.type || "").toLowerCase().replace(/\s+/g, "_")
  );
  const isInConversation = !isCommitted && boardGroup === "in_conversation" && latestIsCoachReply;

  const latestEvent = timeline[0] || null;
  const showNextStep = !isCommitted && !isNewSchool && !isInConversation && latestEvent
    && nextStepDismissed !== (latestEvent.id || latestEvent.date);

  const nextDue = program.next_action_due || "";
  const today = new Date().toISOString().split("T")[0];
  const isFollowUpOverdue = !isCommitted && nextDue && nextDue <= today;
  const daysOverdue = isFollowUpOverdue ? Math.floor((new Date() - new Date(nextDue)) / 86400000) : 0;

  return (
    <div data-testid="recruiting-journey" className="max-w-6xl mx-auto pb-24">
      {/* Header with Progress Rail */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#1e1e2e", padding: "0", position: "relative" }} data-testid="journey-header">
        <div style={{ height: 2, background: "linear-gradient(90deg, #2ec4b6 0%, rgba(46,196,182,0.2) 100%)" }} />
        <div style={{ padding: "20px 24px" }}>
        <div className="flex items-start gap-3 mb-4">
          <button onClick={() => navigate("/pipeline")} className="p-1.5 rounded-lg transition-colors mt-0.5" style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }} data-testid="back-btn"
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold" style={{ color: "#ffffff", letterSpacing: "-0.3px" }}>{program.university_name}</h1>
              {rail && <PulseIndicator pulse={rail.pulse} />}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {program.division && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-700/15 text-teal-700">{program.division}</span>}
              {matchScore && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  matchScore.match_score >= 80 ? "text-teal-600 bg-slate-500/15 border-slate-500/30"
                  : matchScore.match_score >= 60 ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
                  : "text-gray-400 bg-gray-500/15 border-gray-500/30"
                }`} data-testid="journey-match-score">
                  <Target className="w-3 h-3" /> {matchScore.match_score}% Match
                </span>
              )}
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{program.conference}{program.region ? ` · ${program.region}` : ""} · {timeline.length} events</span>
            </div>
            {matchScore && (
              <div className="mt-2">
                {riskBadges.length > 0 ? (
                  <RiskBadgeRow badges={riskBadges} max={4} onBadgeClick={(b) => setRiskDrawer(b)} />
                ) : (
                  <RiskBadgeEmpty />
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="text-[11px] h-8 hidden sm:flex" onClick={() => navigate(`/compare?selected=${programId}`)}
              style={{ color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.1)", background: "transparent" }} data-testid="compare-btn">
              <GitCompare className="w-3.5 h-3.5 mr-1.5" />Compare
            </Button>
            <button onClick={() => updateProgram({ is_active: !(program.is_active !== false) })}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${
                program.is_active !== false ? "bg-slate-500/15 text-teal-600 border-slate-500/30" : "bg-gray-500/15 text-gray-400 border-gray-500/30"
              }`} data-testid="active-toggle">
              {program.is_active !== false ? "Active" : "Inactive"}
            </button>
          </div>
        </div>
        <ProgressRail rail={rail} onStageClick={handleStageClick} />
        </div>
      </div>

      {/* Stage Log Modal */}
      {pendingStage && (
        <StageLogModal stageKey={pendingStage} currentStage={rail?.active || ""} universityName={program.university_name}
          onConfirm={confirmStageChange} onCancel={() => setPendingStage(null)} />
      )}

      {/* Contextual Hero */}
      {isCommitted ? (
        <div className="mt-5">
          <CommittedHero program={program} />
          <button onClick={() => setShowJourneyDetails(prev => !prev)}
            className="mx-auto mt-5 flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-medium transition-colors hover:bg-[var(--t-surface-alt)]"
            style={{ color: "var(--t-text-muted)", borderColor: "var(--t-border)" }}
            data-testid="toggle-journey-details">
            {showJourneyDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showJourneyDetails ? "Hide journey details" : "View full journey"}
          </button>
        </div>
      ) : isNewSchool ? (
        <div className="mt-5">
        <GettingStartedChecklist program={program} coaches={coaches} timeline={timeline}
          profileComplete={profileComplete} notesCount={notesCount} onAddCoach={openCoach}
          onSendEmail={isBasic ? () => toast.info("Email integration is available on Pro and Premium plans", { action: { label: "Upgrade", onClick: () => navigate("/settings") } }) : openEmail} onOpenNotes={() => setNotesOpen(true)} />
        </div>
      ) : isInConversation ? (
        <div className="mt-5">
        <CelebrationHero program={program} coaches={coaches} onEmail={isBasic ? null : openEmail} onLog={openLog} onCall={openLog} />
        </div>
      ) : null}

      {/* Below-hero content */}
      {(!isCommitted || showJourneyDetails) && (<>

      {/* Timeline Intelligence Card */}
      {recruitingTimeline && (
        <div className="mt-5" data-testid="journey-timeline-card">
          <TimelineStatusCard timeline={recruitingTimeline} />
        </div>
      )}

      {/* Roster Reality Card */}
      {rosterOutlook && (
        <div className="mt-4" data-testid="journey-roster-card">
          <RosterRealityCard roster={rosterOutlook} />
        </div>
      )}

      {/* Scholarship Structure Card */}
      {scholarship && (
        <div className="mt-4" data-testid="journey-scholarship-card">
          <ScholarshipStructureCard scholarship={scholarship} />
        </div>
      )}

      {/* NIL Readiness Card */}
      {nilReadiness && (
        <div className="mt-4" data-testid="journey-nil-card">
          <NilReadinessCard nil={nilReadiness} />
        </div>
      )}

      {isFollowUpOverdue && !activeForm && (
        <div className="mt-5 rounded-2xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "rgba(249,115,22,0.25)" }}
          data-testid="overdue-followup-card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "rgba(249,115,22,0.12)" }}>
              <Clock className="w-5 h-5" style={{ color: "#f97316" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#f97316" }}>Follow-up due</p>
              <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>
                Time to follow up{daysOverdue > 0 ? ` \u2014 ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : ""}
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>
                Send a follow-up to {program.university_name} to stay on their radar.
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={isBasic ? () => toast.error("Upgrade to send emails") : openEmail}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-700/15 text-teal-700 hover:bg-teal-700/25 transition-colors flex items-center gap-1.5"
                  data-testid="overdue-email-btn">
                  <Mail className="w-3.5 h-3.5" />Email Coach
                </button>
                <button onClick={openFollowup}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 hover:bg-white/5"
                  style={{ color: "var(--t-text-muted)" }} data-testid="overdue-reschedule-btn">
                  <Clock className="w-3.5 h-3.5" />Reschedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isFollowUpOverdue && showNextStep && !activeForm && (
        <div className="mt-5">
          <NextStepCard latestEvent={latestEvent} universityName={program.university_name}
            onEmail={isBasic ? () => toast.error("Upgrade to send emails") : openEmail}
            onLog={openLog} onFollowup={openFollowup}
            onDismiss={() => setNextStepDismissed(latestEvent.id || latestEvent.date)} />
        </div>
      )}

      {/* Inline Forms */}
      {activeForm === "replied" && <MarkAsRepliedModal programId={programId} onSaved={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}
      {activeForm === "log" && <LogInteractionForm programId={programId} universityName={program.university_name} onSaved={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}
      {activeForm === "email" && <EmailComposer coaches={coaches} programId={programId} universityName={program?.university_name} onSent={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}
      {activeForm === "coach" && <CoachForm initial={editCoach} programId={programId} onSave={saveCoach} onCancel={closeForm} />}
      {activeForm === "followup" && <FollowUpScheduler program={program} onSaved={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="conversation-timeline">
            <div className="mb-5">
              <h2 className="text-base font-bold tracking-wide" style={{ color: "var(--t-text)" }}>Timeline</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>Every email, reply, and interaction — all in one place</p>
            </div>
            {timeline.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" style={{ color: "var(--t-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No interactions yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>Send an email or log an interaction to get started</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {timeline.map((event, i) => <ConversationBubble key={event.id || i} event={event} />)}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <AtAGlanceCard program={program} coaches={coaches} isPremium={isPremium} isBasic={isBasic}
            programId={programId} onDraftEmail={openEmail} onAddCoach={openCoach} onScheduleFollowup={() => fetchData()} />

          {coaches.length > 0 ? (
            <div className="rounded-2xl border p-4 mt-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="coach-panel">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Users className="w-4 h-4 text-teal-700" />Coaches</h3>
                <div className="flex items-center gap-2">
                  {coachWatchAlert ? (
                    <div className="group relative inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
                        style={{ background: "rgba(245,158,11,0.1)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" }}
                        data-testid="coach-watch-badge-change">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />Staff Change
                      </span>
                      <Info className="w-3.5 h-3.5 cursor-help" style={{ color: "var(--t-text-faint, #b0b0c0)" }} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-lg text-[11px] leading-relaxed font-normal opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg"
                        style={{ background: "var(--t-text, #1a1a2e)", color: "#fff" }}>
                        Coach Watch detected a coaching staff change. Review and update your contacts.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px]" style={{ borderTopColor: "var(--t-text, #1a1a2e)" }} />
                      </div>
                    </div>
                  ) : (
                    <div className="group relative inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
                        style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}
                        data-testid="coach-watch-badge-stable">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />Staff Stable
                      </span>
                      <Info className="w-3.5 h-3.5 cursor-help" style={{ color: "var(--t-text-faint, #b0b0c0)" }} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-lg text-[11px] leading-relaxed font-normal opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg"
                        style={{ background: "var(--t-text, #1a1a2e)", color: "#fff" }}>
                        Coach Watch monitors this school's staff page for changes. No recent changes detected.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px]" style={{ borderTopColor: "var(--t-text, #1a1a2e)" }} />
                      </div>
                    </div>
                  )}
                  <button onClick={openCoach} className="p-1 rounded-lg hover:bg-[var(--t-surface-alt)]" data-testid="add-coach-btn"><Plus className="w-4 h-4 text-teal-700" /></button>
                </div>
              </div>
              {coachWatchAlert && (
                <div className="p-2.5 rounded-lg mb-3" data-testid="coach-watch-alert-detail"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <p className="text-[11px] font-semibold flex items-center gap-1" style={{ color: "#d97706" }}>
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {coachWatchAlert.alert_type === "new_coach" ? "New coach detected" :
                     coachWatchAlert.alert_type === "coach_departure" ? "Coach departure detected" : "Staff change detected"}
                  </p>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
                    {coachWatchAlert.summary || coachWatchAlert.details || `A coaching staff change was detected at ${program.university_name}. Review and update your contacts.`}
                  </p>
                  {coachWatchAlert.created_at && (
                    <p className="text-[9px] mt-1.5" style={{ color: "var(--t-text-faint, #b0b0c0)" }}>
                      Detected {new Date(coachWatchAlert.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {coaches.map(c => (
                  <div key={c.coach_id} className="p-2.5 rounded-lg border group" style={{ borderColor: "var(--t-border)" }}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{c.coach_name}</p>
                        <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{c.role}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditCoach(c); setActiveForm("coach"); }} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><Edit2 className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} /></button>
                        <button onClick={() => deleteCoach(c.coach_id)} className="p-1 rounded hover:bg-red-500/10"><Trash2 className="w-3 h-3 text-red-400" /></button>
                      </div>
                    </div>
                    {c.email && <a href={`mailto:${c.email}`} className="text-[11px] text-teal-700 hover:text-teal-600 flex items-center gap-1 mt-1 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</a>}
                    {c.phone && <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: "var(--t-text-muted)" }}><Phone className="w-3 h-3" />{c.phone}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </>)}

      {/* Floating Action Bar — hidden when any modal is open */}
      {!activeForm && (
        <FloatingActionBar onEmail={isBasic ? () => toast.error("Upgrade to send emails") : openEmail}
          onLog={openLog} onReplied={openReplied} onFollowup={openFollowup} isBasic={isBasic} activeAction={activeForm} />
      )}

      {/* Notes Sidebar */}
      <NotesSidebar programId={programId} universityName={program.university_name}
        externalOpen={notesOpen} onExternalClose={() => setNotesOpen(false)}
        onNoteChange={() => {
          api.get(`/programs/${programId}/notes`).then(r => {
            setNotesCount((r.data.pinned?.length || 0) + (r.data.recent?.length || 0));
          }).catch(() => {});
        }} />

      {riskDrawer && (
        <RiskExplainerDrawer
          badges={riskBadges}
          activeBadge={riskDrawer}
          onClose={() => setRiskDrawer(false)}
        />
      )}
    </div>
  );
}
