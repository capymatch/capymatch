import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import {
  ArrowLeft, Mail, Phone, Clock, Target, DollarSign,
  MessageSquare, Users, Loader2, ChevronDown, ChevronUp,
  Plus, Edit2, Trash2, X, GitCompare, AlertCircle, Info,
  ClipboardCheck, ExternalLink, CheckCircle2, Send, Share2,
  Sparkles, Crown
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import NotesSidebar from "../components/NotesSidebar";
import UniversityLogo from "../components/UniversityLogo";
import { RiskExplainerDrawer } from "../components/RiskBadges";
import { CoachSocialLinks } from "../components/CoachSocialLinks";
import {
  ProgressRail, PulseIndicator, GettingStartedChecklist,
  CommittedHero, CelebrationHero, NextStepCard, ConversationBubble,
  StageLogModal, FloatingActionBar,
  CoachForm, LogInteractionForm, EmailComposer,
  FollowUpScheduler, MarkAsRepliedModal, STAGE_LABELS,
} from "../components/journey";

function SendProfileCard({ universityName, onSend }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="send-profile-card">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(26,138,128,0.15)" }}>
          <Share2 className="w-3.5 h-3.5" style={{ color: "#1a8a80" }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Share Profile</h3>
          <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>Send your recruiting profile to {universityName}'s coaches</p>
        </div>
      </div>
      <button onClick={onSend}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
        style={{ backgroundColor: "#1a8a80", color: "white" }}
        data-testid="send-profile-btn"
      >
        <Send className="w-3.5 h-3.5" />Send Profile to Coach
      </button>
    </div>
  );
}

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
  const [profileComplete, setProfileComplete] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [coachWatchAlert, setCoachWatchAlert] = useState(null);
  const [questLoading, setQuestLoading] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(true);
  const [schoolEngagement, setSchoolEngagement] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [activeForm, setActiveForm] = useState(null);
  const [editCoach, setEditCoach] = useState(null);
  const [emailInitial, setEmailInitial] = useState({});

  const closeForm = () => { setActiveForm(null); setEditCoach(null); setEmailInitial({}); };
  const openEmail = () => { setEmailInitial({}); setActiveForm(prev => prev === "email" ? null : "email"); };
  const openEmailWithProfile = async () => {
    try {
      const res = await api.get("/athlete-profile/sharing");
      let slug = res.data?.public_slug;
      if (!slug) {
        const createRes = await api.put("/athlete-profile/sharing", {});
        slug = createRes.data?.public_slug;
      }
      if (slug) {
        const profileUrl = `${window.location.origin}/p/${slug}`;
        const athleteName = program?.university_name || "your program";
        setEmailInitial({
          subject: `My Recruiting Profile — ${athleteName}`,
          body: `Coach,\n\nI wanted to share my recruiting profile with you. You can view it here:\n\n${profileUrl}\n\nIt includes my athletic measurables, academics, highlight video, and upcoming tournament schedule. I'd love the opportunity to discuss how I can contribute to your program.\n\nThank you for your time!`,
        });
        setActiveForm("email");
      }
    } catch {
      toast.error("Failed to get profile link");
    }
  };
  const openLog = () => { setActiveForm(prev => prev === "log" ? null : "log"); };
  const openReplied = () => { setActiveForm(prev => prev === "replied" ? null : "replied"); };
  const openCoach = () => { setActiveForm("coach"); };
  const openFollowup = () => { setActiveForm(prev => prev === "followup" ? null : "followup"); };

  const generateAI = async () => {
    if (!isPremium) return;
    setAiLoading(true);
    try {
      const res = await api.post("/ai/journey-summary", { program_id: programId });
      setAiSummary(res.data);
    } catch { toast.error("Failed to generate insights"); }
    finally { setAiLoading(false); }
  };

  const fetchData = useCallback(async () => {
    try {
      const [progRes, journeyRes, coachRes, profRes, notesRes, msRes, gmailRes, engRes] = await Promise.allSettled([
        api.get(`/programs/${programId}`),
        api.get(`/programs/${programId}/journey`),
        api.get(`/coaches?program_id=${programId}`),
        api.get("/athlete-profile"),
        api.get(`/programs/${programId}/notes`),
        !isBasic ? api.get("/match-scores") : Promise.resolve({ data: null }),
        api.get("/gmail/status"),
        api.get(`/engagement/school/${programId}`),
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
        }
      }
      setGmailConnected(gmailRes.status === "fulfilled" && gmailRes.value.data?.connected === true);
      if (engRes.status === "fulfilled") setSchoolEngagement(engRes.value.data);
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

  const toggleQuestionnaire = async () => {
    setQuestLoading(true);
    try {
      const newVal = !program.questionnaire_completed;
      await api.patch(`/programs/${programId}/questionnaire`, { completed: newVal });
      setProgram(prev => ({
        ...prev,
        questionnaire_completed: newVal,
        questionnaire_completed_at: newVal ? new Date().toISOString() : null,
      }));
      toast.success(newVal ? "Questionnaire marked complete" : "Questionnaire unmarked");
    } catch { toast.error("Failed to update"); }
    setQuestLoading(false);
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
  const [questNudgeDismissed, setQuestNudgeDismissed] = useState(false);
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
  const checklistComplete = profileComplete && coaches.some(c => c.email) && timeline.length > 0;
  const isNewSchool = !checklistComplete && !isCommitted;
  const latestIsCoachReply = timeline.length > 0 && ["email_received", "coach_reply"].includes(
    (timeline[0]?.event_type || timeline[0]?.type || "").toLowerCase().replace(/\s+/g, "_")
  );
  const isInConversation = !isCommitted && boardGroup === "in_conversation" && latestIsCoachReply;

  const latestEvent = timeline[0] || null;
  const latestEventDate = latestEvent?.date_time || latestEvent?.date || "";
  const isLatestEventPast = latestEventDate && new Date(latestEventDate) <= new Date();

  const nextDue = program.next_action_due || "";
  const today = new Date().toISOString().split("T")[0];
  const isFollowUpOverdue = !isCommitted && nextDue && nextDue <= today;
  const daysOverdue = isFollowUpOverdue ? Math.floor((new Date() - new Date(nextDue)) / 86400000) : 0;
  const daysUntilDue = !isCommitted && nextDue && nextDue > today
    ? Math.ceil((new Date(nextDue + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000)
    : 0;
  const isFollowUpSoon = daysUntilDue > 0 && daysUntilDue <= 5;

  const showNextStep = !isCommitted && !isNewSchool && !isInConversation && latestEvent
    && isLatestEventPast
    && !isFollowUpOverdue && !isFollowUpSoon
    && nextStepDismissed !== (latestEvent.id || latestEvent.date);

  return (
    <div data-testid="recruiting-journey" className="max-w-6xl mx-auto pb-24">
      {/* Header with Progress Rail */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#1e1e2e", position: "relative" }} data-testid="journey-header">
        <div style={{ height: 2, background: "linear-gradient(90deg, #1a8a80 0%, rgba(26,138,128,0.2) 100%)" }} />
        <div style={{ padding: "20px 24px 16px" }}>
          {/* Top row: Back + Name + Active toggle */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate("/pipeline")} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors" style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="back-btn"
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <UniversityLogo domain={program.domain} name={program.university_name} logoUrl={matchScore?.logo_url} size={28} />
              <h1 className="text-lg sm:text-xl font-extrabold truncate" style={{ color: "#ffffff", letterSpacing: "-0.3px" }} data-testid="journey-school-name">{program.university_name}</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="text-[11px] h-7 hidden sm:flex" onClick={() => navigate(`/compare?selected=${programId}`)}
                style={{ color: "rgba(255,255,255,0.45)", borderColor: "rgba(255,255,255,0.08)", background: "transparent" }} data-testid="compare-btn">
                <GitCompare className="w-3.5 h-3.5 mr-1.5" />Compare
              </Button>
              <button onClick={() => updateProgram({ is_active: !(program.is_active !== false) })}
                className="px-3 py-1 rounded-full text-[11px] font-semibold transition-colors"
                style={program.is_active !== false
                  ? { background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }
                  : { background: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.2)" }}
                data-testid="active-toggle">
                {program.is_active !== false ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          {/* Meta row: Status + Division + Match + Events */}
          <div className="flex items-center gap-2.5 flex-wrap ml-11 sm:ml-[44px] mb-2.5">
            {rail && <PulseIndicator pulse={rail.pulse} />}
            {program.division && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "rgba(13,148,136,0.15)", color: "#2dd4bf" }} data-testid="journey-division">{program.division}</span>
            )}
            {matchScore && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                matchScore.match_score >= 80 ? "text-teal-400" : matchScore.match_score >= 60 ? "text-amber-400" : "text-gray-400"
              }`} style={{ background: "rgba(255,255,255,0.06)" }} data-testid="journey-match-score">
                <Target className="w-3 h-3" /> {matchScore.match_score}% Match
              </span>
            )}
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              {program.conference}{program.region ? ` · ${program.region}` : ""}{" · "}{timeline.length} events
            </span>
            {/* Social links */}
            {program.social_links && Object.keys(program.social_links).length > 0 && (
              <span className="flex items-center gap-1.5 ml-1">
                {program.social_links.twitter && (
                  <a href={program.social_links.twitter} target="_blank" rel="noopener noreferrer" title="X / Twitter"
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="social-twitter">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
                {program.social_links.instagram && (
                  <a href={program.social_links.instagram} target="_blank" rel="noopener noreferrer" title="Instagram"
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="social-instagram">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                )}
                {program.social_links.facebook && (
                  <a href={program.social_links.facebook} target="_blank" rel="noopener noreferrer" title="Facebook"
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="social-facebook">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                )}
                {program.social_links.youtube && (
                  <a href={program.social_links.youtube} target="_blank" rel="noopener noreferrer" title="YouTube"
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="social-youtube">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </a>
                )}
                {program.social_links.tiktok && (
                  <a href={program.social_links.tiktok} target="_blank" rel="noopener noreferrer" title="TikTok"
                    className="w-5 h-5 rounded flex items-center justify-center transition-colors hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }} data-testid="social-tiktok">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                  </a>
                )}
              </span>
            )}
          </div>

          {/* Risk badges */}
          {matchScore && (
            <div className="ml-11 sm:ml-[44px] mb-4" data-testid="journey-risk-badges">
              {riskBadges.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {riskBadges.map((b) => {
                    const pillStyles = {
                      academic_reach: { bg: "rgba(234,88,12,0.15)", color: "#fb923c", border: "rgba(234,88,12,0.25)" },
                      roster_tight: { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "rgba(148,163,184,0.2)" },
                      timeline_risk: { bg: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "rgba(139,92,246,0.25)" },
                      funding_dependent: { bg: "rgba(34,197,94,0.15)", color: "#4ade80", border: "rgba(34,197,94,0.25)" },
                    };
                    const s = pillStyles[b.key] || pillStyles.roster_tight;
                    const IconMap = { academic_reach: AlertCircle, roster_tight: Users, timeline_risk: Clock, funding_dependent: DollarSign };
                    const Icon = IconMap[b.key] || Info;
                    return (
                      <button key={b.key} onClick={() => setRiskDrawer(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-opacity hover:opacity-80"
                        style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                        data-testid={`risk-badge-${b.key}`}>
                        <Icon className="w-3 h-3 flex-shrink-0" />{b.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.15)" }}
                  data-testid="risk-badge-clear">
                  <Target className="w-3 h-3" /> No major risks identified
                </span>
              )}
            </div>
          )}

          {/* Progress Rail */}
          <ProgressRail rail={rail} onStageClick={handleStageClick} />
        </div>
      </div>

      {/* ── Follow-Up Alert (pinned at top) ── */}
      {isFollowUpOverdue && !activeForm && (
        <div className="mt-4 rounded-xl overflow-hidden" style={{ background: "#1e1e2e" }} data-testid="overdue-followup-card">
          <div style={{ height: 2, background: "linear-gradient(90deg, #f97316, rgba(249,115,22,0.2))" }} />
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "rgba(249,115,22,0.15)" }}>
                <AlertCircle className="w-5 h-5" style={{ color: "#f97316" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#f97316" }}>
                  {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue` : "Due today"}
                </p>
                <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>
                  Follow up with {program.university_name}
                </h3>
                <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {program.next_action_label || "Send a follow-up to stay on their radar and show continued interest."}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={isBasic ? () => toast.error("Upgrade to send emails") : openEmail}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors shadow-md"
                    data-testid="overdue-email-btn">
                    <Mail className="w-3.5 h-3.5" /> Send Email
                  </button>
                  <button onClick={openFollowup}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                    style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                    data-testid="overdue-reschedule-btn">
                    <Clock className="w-3.5 h-3.5" /> Reschedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Upcoming Follow-Up Reminder (due within 3 days) ── */}
      {isFollowUpSoon && !isFollowUpOverdue && !activeForm && (
        <div className="mt-4 rounded-xl overflow-hidden" style={{ background: "#1e1e2e" }} data-testid="upcoming-followup-card">
          <div style={{ height: 2, background: "linear-gradient(90deg, #1a8a80, rgba(26,138,128,0.2))" }} />
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: "rgba(26,138,128,0.15)" }}>
                <Clock className="w-5 h-5" style={{ color: "#2dd4bf" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#2dd4bf" }}>
                  {daysUntilDue === 1 ? "Due tomorrow" : `Due in ${daysUntilDue} days`}
                </p>
                <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>
                  Follow up with {program.university_name}
                </h3>
                <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {program.next_action_label || "You have a follow-up coming up. Get ahead of it to show coaches you're organized and committed."}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={isBasic ? () => toast.error("Upgrade to send emails") : openEmail}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium text-white transition-colors shadow-md"
                    style={{ backgroundColor: "#1a8a80" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#158075"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "#1a8a80"}
                    data-testid="upcoming-email-btn">
                    <Mail className="w-3.5 h-3.5" /> Send Email
                  </button>
                  <button onClick={openFollowup}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                    style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                    data-testid="upcoming-reschedule-btn">
                    <Clock className="w-3.5 h-3.5" /> Reschedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Questionnaire Section ── */}
      {program.questionnaire_url && (
        <div className="mt-4 rounded-xl border p-4 sm:p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="questionnaire-section">
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${program.questionnaire_completed ? "bg-green-500/10" : "bg-teal-600/10"}`}>
                {program.questionnaire_completed
                  ? <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                  : <ClipboardCheck className="w-4.5 h-4.5 text-teal-600" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Recruiting Questionnaire</p>
                {program.questionnaire_completed ? (
                  <p className="text-xs text-green-500 mt-0.5">
                    Completed {program.questionnaire_completed_at ? new Date(program.questionnaire_completed_at).toLocaleDateString() : ""}
                  </p>
                ) : (
                  <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>Required by most programs — fill it out to show interest</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <a href={program.questionnaire_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
                style={{ color: "var(--t-accent)", borderColor: "var(--t-accent)" }}
                data-testid="questionnaire-open-link">
                <ExternalLink className="w-3.5 h-3.5" /> Open Form
              </a>
              <button onClick={toggleQuestionnaire} disabled={questLoading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  program.questionnaire_completed
                    ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                    : "text-white hover:opacity-90"
                }`}
                style={program.questionnaire_completed ? {} : { backgroundColor: "var(--t-accent)" }}
                data-testid="questionnaire-toggle-btn">
                {questLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {program.questionnaire_completed ? "Completed" : "Mark Complete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coach Engagement data merged into unified Coaches card below */}

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

      {/* School Intelligence Link — always visible */}
      {!isBasic && program?.domain && (
        <button
          onClick={() => navigate(`/school/${program.domain}`)}
          className="mt-5 w-full rounded-xl border p-4 flex items-center justify-between group transition-all hover:border-[#1a8a80]/40"
          style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
          data-testid="view-school-intel-btn"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(26,138,128,0.1)" }}>
              <Target className="w-4.5 h-4.5 text-[#1a8a80]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>School Intelligence</p>
              <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>Timeline, roster, scholarship, NIL, and more</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 -rotate-90 group-hover:translate-x-0.5 transition-transform" style={{ color: "var(--t-text-muted)" }} />
        </button>
      )}

      {/* Below-hero content */}
      {(!isCommitted || showJourneyDetails) && (<>

      {!isFollowUpOverdue && showNextStep && !activeForm && (
        <div className="mt-5">
          <NextStepCard latestEvent={latestEvent} universityName={program.university_name}
            onEmail={isBasic ? () => toast.error("Upgrade to send emails") : openEmail}
            onLog={openLog} onFollowup={openFollowup}
            onDismiss={() => setNextStepDismissed(latestEvent.id || latestEvent.date)} />
        </div>
      )}

      {/* Questionnaire Nudge */}
      {program.questionnaire_url && !program.questionnaire_completed && !questNudgeDismissed && !activeForm && (
        <div className="mt-5 rounded-2xl border p-5 relative overflow-hidden"
          style={{ borderColor: "rgba(245,158,11,0.3)", background: "#1e1e2e" }}
          data-testid="questionnaire-nudge">
          <button onClick={() => setQuestNudgeDismissed(true)}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "rgba(255,255,255,0.35)" }} data-testid="quest-nudge-dismiss">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "rgba(245,158,11,0.12)" }}>
              <ClipboardCheck className="w-5 h-5" style={{ color: "#f59e0b" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#f59e0b" }}>Action Required</p>
              <h3 className="text-sm font-bold mb-1" style={{ color: "#ffffff" }}>Complete {program.university_name}'s questionnaire</h3>
              <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                Filling out the recruiting questionnaire shows coaches you're genuinely interested. Most programs require it.
              </p>
              <div className="flex gap-2 flex-wrap">
                <a href={program.questionnaire_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-md"
                  data-testid="quest-nudge-open">
                  <ExternalLink className="w-3.5 h-3.5" /> Open Questionnaire
                </a>
                <button onClick={toggleQuestionnaire}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-colors"
                  style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
                  data-testid="quest-nudge-complete">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Forms */}
      {activeForm === "replied" && <MarkAsRepliedModal programId={programId} onSaved={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}
      {activeForm === "log" && <LogInteractionForm programId={programId} universityName={program.university_name} onSaved={() => { closeForm(); fetchData(); }} onCancel={closeForm} />}
      {activeForm === "email" && <EmailComposer coaches={coaches} programId={programId} universityName={program?.university_name} onSent={() => { closeForm(); fetchData(); }} onCancel={closeForm} initialSubject={emailInitial.subject} initialBody={emailInitial.body} />}
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
            {!gmailConnected && (
              <div className="flex items-start gap-3 rounded-xl p-3.5 mb-4" style={{ backgroundColor: "rgba(26,138,128,0.08)", border: "1px solid rgba(26,138,128,0.18)" }} data-testid="gmail-nudge-banner">
                <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#1a8a80" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: "var(--t-text)" }}>
                    Connect Gmail to automatically track your emails with coaches, detect replies, and get smart follow-up reminders.
                  </p>
                  <a href="/settings" className="inline-flex items-center gap-1 text-xs font-semibold mt-1.5 transition-colors hover:underline" style={{ color: "#1a8a80" }} data-testid="gmail-nudge-connect-btn">
                    Connect Gmail
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
            {timeline.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" style={{ color: "var(--t-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No interactions yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>Send an email or log an interaction to get started</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {timeline.map((event, i) => <ConversationBubble key={event.id || i} event={event} engagement={schoolEngagement} />)}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          {/* ── Next Steps Card ── */}
          {(program.next_action_due || isPremium || !isBasic) && (
            <div className="rounded-2xl border p-4 mb-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="next-steps-card">
              {program.next_action_due && (
                <div className="p-2.5 rounded-lg" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)" }} data-testid="follow-up-reminder">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f97316" }} />
                    <span className="text-[11px] font-semibold" style={{ color: "#f97316" }}>
                      Follow-up: {new Date(program.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {program.next_action && <p className="text-[10px] mt-1 ml-5" style={{ color: "var(--t-text-muted)" }}>{program.next_action}</p>}
                </div>
              )}
              {isPremium ? (
                <div className="rounded-lg p-2.5" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.06), rgba(26,138,128,0.04))", border: "1px solid rgba(168,85,247,0.15)" }} data-testid="ai-next-step">
                  {aiSummary ? (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: "#a855f7" }}>
                        <Sparkles className="w-3 h-3" />Next move
                      </p>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>{aiSummary.suggested_action}</p>
                      <button onClick={generateAI} disabled={aiLoading} className="text-[10px] font-medium flex items-center gap-1 disabled:opacity-50" style={{ color: "#a855f7" }}>
                        {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Refresh
                      </button>
                    </div>
                  ) : (
                    <button onClick={generateAI} disabled={aiLoading} className="w-full flex items-center gap-2 text-left disabled:opacity-50" data-testid="ai-generate-btn">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#a855f7" }} />
                      <span className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                        {aiLoading ? "Analyzing..." : "Get AI-powered next step"}
                      </span>
                      {aiLoading && <Loader2 className="w-3 h-3 animate-spin ml-auto" style={{ color: "#a855f7" }} />}
                    </button>
                  )}
                </div>
              ) : !isBasic ? (
                <div className="rounded-lg p-2.5" style={{ border: "1px solid rgba(168,85,247,0.12)" }}>
                  <div className="flex items-center gap-2">
                    <Crown className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(251,191,36,0.7)" }} />
                    <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>AI insights</span>
                    <a href="/account" className="ml-auto text-[10px] font-semibold hover:opacity-80" style={{ color: "#a855f7" }}>Upgrade</a>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Unified Coaches Card ── */}
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="unified-coach-card">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--t-border)" }}>
              <h3 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
                <Users className="w-4 h-4 text-teal-700" /> Coaches
              </h3>
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
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />Staff Stable
                    </span>
                    <Info className="w-3.5 h-3.5 cursor-help" style={{ color: "var(--t-text-faint, #b0b0c0)" }} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 rounded-lg text-[11px] leading-relaxed font-normal opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg"
                      style={{ background: "var(--t-text, #1a1a2e)", color: "#fff" }}>
                      Coach Watch monitors this school's staff page for changes. No recent changes detected.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px]" style={{ borderTopColor: "var(--t-text, #1a1a2e)" }} />
                    </div>
                  </div>
                )}
                <button onClick={openCoach} className="p-1 rounded-lg hover:bg-[var(--t-surface-alt)] transition-colors" data-testid="add-coach-btn">
                  <Plus className="w-4 h-4 text-teal-700" />
                </button>
              </div>
            </div>

            {/* Engagement Stats Strip */}
            {(schoolEngagement?.total_opens > 0 || schoolEngagement?.total_clicks > 0) && (
              <div className="grid grid-cols-3" style={{ borderBottom: "1px solid var(--t-border)" }} data-testid="engagement-stats-strip">
                <div className="px-3 py-2.5 text-center" style={{ borderRight: "1px solid var(--t-border)" }}>
                  <div className="text-base font-extrabold" style={{ color: "#10b981" }}>{schoolEngagement?.total_opens || 0}</div>
                  <div className="text-[9px] font-medium" style={{ color: "var(--t-text-muted)" }}>Opens</div>
                </div>
                <div className="px-3 py-2.5 text-center" style={{ borderRight: "1px solid var(--t-border)" }}>
                  <div className="text-base font-extrabold" style={{ color: "#3b82f6" }}>{schoolEngagement?.total_clicks || 0}</div>
                  <div className="text-[9px] font-medium" style={{ color: "var(--t-text-muted)" }}>Clicks</div>
                </div>
                <div className="px-3 py-2.5 text-center">
                  <div className="text-base font-extrabold" style={{ color: "#a855f7" }}>{schoolEngagement?.unique_opens || 0}</div>
                  <div className="text-[9px] font-medium" style={{ color: "var(--t-text-muted)" }}>Unique</div>
                </div>
              </div>
            )}

            {/* Staff Change Alert */}
            {coachWatchAlert && (
              <div className="mx-4 mt-3 p-2.5 rounded-lg" data-testid="coach-watch-alert-detail"
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

            {/* Coach List */}
            <div className="px-4 py-3">
              {coaches.length > 0 ? (
                <div className="space-y-2">
                  {coaches.map(c => (
                    <div key={c.coach_id} className="p-2.5 rounded-lg border group transition-colors hover:border-teal-700/20" style={{ borderColor: "var(--t-border)" }} data-testid={`coach-item-${c.coach_id}`}>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{c.coach_name}</p>
                          <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{c.role}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditCoach(c); setActiveForm("coach"); }} className="p-1 rounded hover:bg-[var(--t-surface-alt)]" data-testid={`edit-coach-${c.coach_id}`}>
                            <Edit2 className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                          </button>
                          <button onClick={() => deleteCoach(c.coach_id)} className="p-1 rounded hover:bg-red-500/10" data-testid={`delete-coach-${c.coach_id}`}>
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="text-[11px] text-teal-700 hover:text-teal-600 flex items-center gap-1 mt-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />{c.email}
                        </a>
                      )}
                      {c.phone && (
                        <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                          <Phone className="w-3 h-3" />{c.phone}
                        </p>
                      )}
                      <CoachSocialLinks coachName={c.coach_name} kbCoaches={program.kb_coaches} />
                    </div>
                  ))}
                </div>
              ) : (
                <button onClick={openCoach} className="w-full flex items-center gap-2.5 p-3 rounded-lg border border-dashed text-xs transition-colors hover:border-teal-700/30"
                  style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }} data-testid="add-first-coach-btn">
                  <Plus className="w-3.5 h-3.5" /> Add your first coach contact
                </button>
              )}
              {/* Head Coach Social Links from KB */}
              {(() => {
                const hc = program.kb_coaches?.find(kc => kc.role && /head/i.test(kc.role)) || program.kb_coaches?.[0];
                if (!hc || !hc.social_links || Object.values(hc.social_links).filter(Boolean).length === 0) return null;
                return (
                  <div className="mt-3 pt-3 flex items-center gap-2 flex-wrap" style={{ borderTop: "1px solid var(--t-border)" }} data-testid="head-coach-social">
                    <span className="text-[10px] font-medium" style={{ color: "var(--t-text-muted)" }}>{hc.name}</span>
                    <CoachSocialLinks coachName={hc.name} kbCoaches={program.kb_coaches} />
                  </div>
                );
              })()}
            </div>

          {/* Engagement badges now shown inline on sent emails in the timeline */}
          </div>

          {/* Send Profile to Coach */}
          <div className="mt-4">
            <SendProfileCard universityName={program.university_name} onSend={openEmailWithProfile} />
          </div>

          {/* KB Coaching Staff Social Media section removed — head coach social shown inside unified card */}
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
