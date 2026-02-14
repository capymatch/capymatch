import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Sparkles, Loader2, Target, Clock, Shield } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import api from "../lib/api";

const QUESTIONS = [
  {
    id: "position",
    emoji: "\uD83C\uDFD0",
    title: "What position do you play?",
    sub: "This helps us understand your playing style and match you with programs looking for your skill set.",
    type: "single",
    options: [
      { value: "Setter", icon: "\uD83C\uDFAF", desc: "Floor general" },
      { value: "Outside Hitter", icon: "\u26A1", desc: "Primary attacker" },
      { value: "Middle Blocker", icon: "\uD83D\uDEE1\uFE0F", desc: "Net presence" },
      { value: "Opposite Hitter", icon: "\uD83D\uDCA5", desc: "Right-side power" },
      { value: "Libero", icon: "\uD83D\uDC2C", desc: "Defensive specialist" },
      { value: "Defensive Specialist", icon: "\uD83E\uDDF1", desc: "Back-row expert" },
    ],
  },
  {
    id: "division",
    emoji: "\uD83C\uDFC6",
    title: "What division are you targeting?",
    sub: "Select the competition level that best matches your goals. You can always update this later.",
    type: "single",
    options: [
      { value: "D1", icon: "\uD83E\uDD47", label: "NCAA Division I", desc: "Highest competition level" },
      { value: "D2", icon: "\u26BD", label: "NCAA Division II", desc: "Competitive with scholarships" },
      { value: "D3", icon: "\uD83D\uDCDA", label: "NCAA Division III", desc: "Academics-first focus" },
      { value: "NAIA", icon: "\u2B50", label: "NAIA", desc: "Flexible eligibility" },
    ],
  },
  {
    id: "priorities",
    emoji: "\u2728",
    title: "What matters most to you?",
    sub: "Pick your top 3 priorities. We'll use these to match you with the right programs.",
    type: "multi",
    max: 3,
    options: [
      { value: "Strong Academics", icon: "\uD83C\uDF93" },
      { value: "Top Athletics Program", icon: "\uD83C\uDFC6" },
      { value: "Location / Region", icon: "\uD83D\uDCCD" },
      { value: "Scholarship Availability", icon: "\uD83D\uDCB0" },
      { value: "Campus Life & Culture", icon: "\uD83C\uDFE0" },
      { value: "Coaching Staff Quality", icon: "\uD83D\uDC65" },
      { value: "Conference Level", icon: "\uD83C\uDFC8" },
      { value: "Playing Time / Roster Depth", icon: "\uD83D\uDCC8" },
    ],
  },
  {
    id: "regions",
    emoji: "\uD83D\uDCCD",
    title: "Where would you like to play?",
    sub: "Select all regions you're open to. This helps us match you with programs in your preferred areas.",
    type: "multi",
    max: 6,
    options: [
      { value: "Northeast", icon: "\uD83C\uDFD7\uFE0F", desc: "NY, MA, PA, CT, NJ..." },
      { value: "Southeast", icon: "\uD83C\uDF34", desc: "FL, GA, NC, VA, SC..." },
      { value: "Midwest", icon: "\uD83C\uDF3E", desc: "OH, IL, MI, IN, WI..." },
      { value: "Southwest", icon: "\uD83C\uDFDC\uFE0F", desc: "TX, AZ, NM, OK..." },
      { value: "Mountain West", icon: "\u26F0\uFE0F", desc: "CO, UT, MT, ID..." },
      { value: "West Coast", icon: "\uD83C\uDF0A", desc: "CA, OR, WA, HI..." },
    ],
    allowAll: true,
  },
  {
    id: "school_size",
    emoji: "\uD83C\uDFEB",
    title: "What school size do you prefer?",
    sub: "School size affects campus culture, class sizes, and the overall college experience.",
    type: "single",
    options: [
      { value: "Small (<5K)", icon: "\uD83C\uDFE1", desc: "Tight-knit community, smaller classes" },
      { value: "Medium (5K-15K)", icon: "\uD83C\uDFE2", desc: "Balanced experience" },
      { value: "Large (15K+)", icon: "\uD83C\uDFD9\uFE0F", desc: "Big campus, more resources" },
      { value: "No Preference", icon: "\uD83E\uDD37", desc: "Open to all sizes" },
    ],
  },
  {
    id: "academic_interests",
    emoji: "\uD83D\uDCDA",
    title: "What do you want to study?",
    sub: "Select your academic area of interest. We'll consider this when matching programs.",
    type: "single",
    options: [
      { value: "Business / Finance", icon: "\uD83D\uDCBC" },
      { value: "Engineering / Tech", icon: "\u2699\uFE0F" },
      { value: "Health Sciences", icon: "\uD83E\uDE7A" },
      { value: "Education", icon: "\uD83C\uDF4E" },
      { value: "Communications / Media", icon: "\uD83C\uDFA4" },
      { value: "Liberal Arts", icon: "\uD83C\uDFA8" },
      { value: "Sciences", icon: "\uD83D\uDD2C" },
      { value: "Undecided", icon: "\uD83E\uDD14" },
    ],
  },
  {
    id: "scholarship_priority",
    emoji: "\uD83D\uDCB0",
    title: "How important is scholarship?",
    sub: "This helps us understand your financial needs and match you with the right opportunities.",
    type: "single",
    options: [
      { value: "Full scholarship needed", icon: "\uD83C\uDF1F", desc: "Financial aid is essential" },
      { value: "Partial scholarship OK", icon: "\u2705", desc: "Some assistance would help" },
      { value: "Not a major factor", icon: "\uD83D\uDC4D", desc: "Academics and fit come first" },
    ],
  },
];

export default function AthleteProfileQuiz() {
  const navigate = useNavigate();
  const [step, setStep] = useState(-1); // Start at -1 for intro
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [matchScores, setMatchScores] = useState([]);

  const isIntro = step === -1;
  const q = isIntro ? null : QUESTIONS[step];
  const progress = isIntro ? 0 : ((step + 1) / QUESTIONS.length) * 100;
  const current = q ? answers[q.id] : null;

  const select = (value) => {
    if (q.type === "single") {
      setAnswers(p => ({ ...p, [q.id]: value }));
    } else {
      const arr = current || [];
      if (arr.includes(value)) {
        setAnswers(p => ({ ...p, [q.id]: arr.filter(v => v !== value) }));
      } else if (!q.max || arr.length < q.max) {
        setAnswers(p => ({ ...p, [q.id]: [...arr, value] }));
      }
    }
  };

  const selectAll = () => {
    const allValues = q.options.map(o => o.value);
    setAnswers(p => ({ ...p, [q.id]: allValues }));
  };

  const canProceed = isIntro ? true : (q?.type === "single" ? !!current : (current?.length || 0) > 0);

  const next = () => {
    if (isIntro) {
      setStep(0);
      return;
    }
    if (!canProceed) return;
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else saveProfile();
  };

  const back = () => { if (step > -1) setStep(step - 1); };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter" && canProceed) next();
      if (e.key === "Backspace" && step > -1 && !e.target.tagName.match(/INPUT|TEXTAREA/)) back();
      if (q?.type === "single") {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < q.options.length) select(q.options[idx].value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.post("/recruiting-profile", {
        position: answers.position,
        division: answers.division,
        priorities: answers.priorities || [],
        regions: answers.regions || [],
        school_size: answers.school_size,
        academic_interests: answers.academic_interests,
        scholarship_priority: answers.scholarship_priority,
      });
      const res = await api.get("/match-scores");
      setMatchScores((res.data?.scores || []).slice(0, 3));
      setShowComplete(true);
    } catch {
      toast.error("Failed to save profile");
    } finally { setSaving(false); }
  };

  // ─── Completion Screen ───
  if (showComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--t-bg)" }}>
        <div className="w-full max-w-xl">
          {/* Progress bar complete */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-purple-500">Your Volleyball Journey</span>
              <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>Complete!</span>
            </div>
            <div className="w-full h-[3px] rounded-full" style={{ backgroundColor: "var(--t-border)" }}>
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-400" style={{ width: "100%" }} />
            </div>
            <div className="flex gap-1.5 justify-center mt-2.5">
              {QUESTIONS.map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-500" />)}
            </div>
          </div>

          <div className="rounded-2xl border p-10 text-center relative overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="quiz-complete">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl" style={{ background: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(168,85,247,0.1))", boxShadow: "0 0 40px rgba(52,211,153,0.15)" }}>
              {"\uD83C\uDF89"}
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--t-text)" }}>
              Your profile is <span className="bg-gradient-to-r from-emerald-400 to-purple-500 bg-clip-text text-transparent">ready!</span>
            </h1>
            <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: "var(--t-text-muted)" }}>
              We've built your recruiting profile. Here's a preview of how we'll match you with programs.
            </p>

            {/* Profile summary */}
            <div className="rounded-xl border p-5 text-left mb-5" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-500 mb-4">Your Profile</p>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--t-text-muted)" }}>Position</p><p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{answers.position}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--t-text-muted)" }}>Division</p><p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{answers.division}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--t-text-muted)" }}>Regions</p><p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{(answers.regions || []).join(", ") || "Any"}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--t-text-muted)" }}>School Size</p><p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{answers.school_size}</p></div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--t-text-muted)" }}>Top Priorities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(answers.priorities || []).map(p => <span key={p} className="text-[10px] px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 font-medium">{p}</span>)}
                  </div>
                </div>
              </div>
            </div>

            {/* Match scores preview */}
            {matchScores.length > 0 && (
              <div className="rounded-xl border p-5 text-left" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-4 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />Top Matches from Your Pipeline
                </p>
                <div className="space-y-1">
                  {matchScores.map(m => (
                    <div key={m.program_id} className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "var(--t-border)" }}>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0 ${m.match_score >= 80 ? "bg-emerald-500/10 text-emerald-400" : m.match_score >= 60 ? "bg-yellow-500/10 text-yellow-400" : "bg-gray-500/10 text-gray-400"}`}>
                        {m.match_score}%
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{m.university_name}</p>
                        <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{m.division} {m.conference ? `\u2022 ${m.conference}` : ""} {m.region ? `\u2022 ${m.region}` : ""}</p>
                        {m.match_reasons?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {m.match_reasons.map(r => <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">{r}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white mt-8 h-11 px-8 text-sm font-semibold shadow-lg shadow-emerald-500/20" onClick={() => navigate("/pipeline")} data-testid="start-recruiting-btn">
              {"\uD83C\uDFC3"} Start Recruiting <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-[11px] mt-3 cursor-pointer hover:underline" style={{ color: "var(--t-text-muted)" }} onClick={() => navigate("/settings")}>
              Edit my profile later in Settings
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Intro Screen ───
  if (isIntro) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--t-bg)" }} data-testid="quiz-intro">
        <div className="w-full max-w-xl">
          {/* Progress header */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-purple-500">Your Volleyball Journey</span>
            </div>
            <div className="w-full h-[3px] rounded-full" style={{ backgroundColor: "var(--t-border)" }}>
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500" style={{ width: "0%" }} />
            </div>
            <div className="flex gap-1.5 justify-center mt-2.5">
              {QUESTIONS.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--t-border)" }} />
              ))}
            </div>
          </div>

          {/* Intro Card */}
          <div className="rounded-2xl border p-10 relative overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-5xl" 
              style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(139,92,246,0.1))", boxShadow: "0 0 40px rgba(168,85,247,0.1)" }}>
              🏐
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold mb-3 text-center" style={{ color: "var(--t-text)" }}>
              Let's Build Your <span className="bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent">Volleyball Journey</span>
            </h1>
            <p className="text-sm text-center mb-8 max-w-md mx-auto leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
              Answer 7 quick questions so we can match you with the right volleyball programs and coaches.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center bg-purple-500/10">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-text)" }}>Personalized Matches</p>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-text-muted)" }}>See schools that fit your playing style & goals</p>
              </div>
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center bg-emerald-500/10">
                  <Clock className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-text)" }}>Save Time</p>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-text-muted)" }}>Skip programs that aren't a good fit</p>
              </div>
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center bg-blue-500/10">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--t-text)" }}>Private & Secure</p>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--t-text-muted)" }}>Your info is never shared without permission</p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button onClick={next}
                className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-10 text-sm font-semibold shadow-lg shadow-purple-500/20"
                data-testid="quiz-start-btn">
                Get Started <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <p className="text-[11px] mt-4 flex items-center justify-center gap-1.5" style={{ color: "var(--t-text-muted)" }}>
                <Clock className="w-3 h-3" /> Takes about 2 minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Quiz Steps ───
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: "var(--t-bg)" }} data-testid="athlete-quiz">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-purple-500">Your Recruiting Profile</span>
            <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>{step + 1} of {QUESTIONS.length}</span>
          </div>
          <div className="w-full h-[3px] rounded-full" style={{ backgroundColor: "var(--t-border)" }}>
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex gap-1.5 justify-center mt-2.5">
            {QUESTIONS.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < step ? "bg-purple-600" : i === step ? "bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.5)]" : ""}`}
                style={i > step ? { backgroundColor: "var(--t-border)" } : {}} />
            ))}
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl border p-10 relative overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          <span className="text-4xl block mb-5">{q.emoji}</span>
          <p className="text-[10px] uppercase tracking-[1.5px] font-semibold mb-2" style={{ color: "var(--t-text-muted)" }}>Question {step + 1} of {QUESTIONS.length}</p>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--t-text)" }}>{q.title}</h1>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--t-text-muted)" }}>{q.sub}</p>

          {/* Options */}
          {q.type === "single" ? (
            <div className={`grid gap-2.5 ${q.options.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
              {q.options.map(opt => {
                const isSelected = current === opt.value;
                return (
                  <button key={opt.value} onClick={() => select(opt.value)}
                    className={`relative rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 ${isSelected ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.1)]" : "hover:border-[var(--t-border-strong)]"}`}
                    style={{ backgroundColor: isSelected ? "rgba(168,85,247,0.06)" : "var(--t-surface-alt)", borderColor: isSelected ? "rgb(168,85,247)" : "var(--t-border)" }}
                    data-testid={`option-${opt.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                    {isSelected && <div className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                    <span className="text-2xl block mb-2">{opt.icon}</span>
                    <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>{opt.label || opt.value}</p>
                    {opt.desc && <p className="text-[10px] mt-1" style={{ color: "var(--t-text-muted)" }}>{opt.desc}</p>}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {q.id === "regions" ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {q.options.map(opt => {
                    const isSelected = (current || []).includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => select(opt.value)}
                        className={`relative rounded-xl border p-4 text-center transition-all duration-200 hover:-translate-y-0.5 ${isSelected ? "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.1)]" : "hover:border-[var(--t-border-strong)]"}`}
                        style={{ backgroundColor: isSelected ? "rgba(168,85,247,0.06)" : "var(--t-surface-alt)", borderColor: isSelected ? "rgb(168,85,247)" : "var(--t-border)" }}
                        data-testid={`option-${opt.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                        {isSelected && <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                        <span className="text-xl block mb-1.5">{opt.icon}</span>
                        <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{opt.value}</p>
                        {opt.desc && <p className="text-[10px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>{opt.desc}</p>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {q.options.map(opt => {
                    const isSelected = (current || []).includes(opt.value);
                    return (
                      <button key={opt.value} onClick={() => select(opt.value)}
                        className={`flex items-center gap-2 rounded-full border px-4 py-2.5 transition-all duration-200 ${isSelected ? "border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.1)]" : "hover:border-[var(--t-border-strong)]"}`}
                        style={{ backgroundColor: isSelected ? "rgba(168,85,247,0.08)" : "var(--t-surface-alt)", borderColor: isSelected ? "rgb(168,85,247)" : "var(--t-border)" }}
                        data-testid={`option-${opt.value.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
                        <span className="text-base">{opt.icon}</span>
                        <span className="text-sm font-medium" style={{ color: isSelected ? "var(--t-text)" : "var(--t-text-secondary)" }}>{opt.value}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "bg-gradient-to-br from-purple-500 to-purple-600 border-purple-500" : ""}`}
                          style={isSelected ? {} : { borderColor: "var(--t-border-strong)" }}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {q.allowAll && (
                <button onClick={selectAll} className="w-full mt-3 py-3 rounded-xl border-2 border-dashed text-sm transition-colors hover:border-[var(--t-border-strong)]"
                  style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }} data-testid="select-all-regions">
                  {"\uD83C\uDF0E"} I'm open to anywhere
                </button>
              )}
              {q.max && <p className="text-[11px] mt-3 italic" style={{ color: "var(--t-text-muted)" }}>{(current || []).length} of {q.max} selected</p>}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button onClick={back} disabled={step === 0}
            className="flex items-center gap-1.5 text-sm font-medium disabled:opacity-0 transition-opacity" style={{ color: "var(--t-text-muted)" }}
            data-testid="quiz-back-btn">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <Button onClick={next} disabled={!canProceed || saving}
            className="bg-purple-600 hover:bg-purple-700 text-white h-10 px-7 text-sm font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50"
            data-testid="quiz-next-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
            {step === QUESTIONS.length - 1 ? "Finish" : "Continue"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <p className="text-center mt-5 text-[11px]" style={{ color: "var(--t-text-faint)" }}>
          Press <kbd className="px-1.5 py-0.5 rounded border text-[10px]" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>Enter</kbd> to continue
          {q?.type === "single" && <> or <kbd className="px-1.5 py-0.5 rounded border text-[10px]" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>1</kbd>-<kbd className="px-1.5 py-0.5 rounded border text-[10px]" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>{q.options.length}</kbd> to select</>}
        </p>
      </div>
    </div>
  );
}
