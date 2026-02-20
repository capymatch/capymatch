import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useSubscription, canAccess } from "../lib/subscription";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Mail, ExternalLink, Users, User,
  Check, Loader2, Lock, Activity, GraduationCap, DollarSign, BookOpen, Phone
} from "lucide-react";

/* ── Match Ring (dark hero) ── */
function MatchRing({ score }) {
  const pct = score || 0;
  const r = 44, c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex-shrink-0 w-[100px] h-[100px]" data-testid="match-score-ring">
      <svg width="100" height="100" viewBox="0 0 100 100" className="absolute inset-0">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#2ec4b6" strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-extrabold text-[#2ec4b6] leading-none">{pct}%</span>
        <span className="text-[9px] font-semibold text-white/35 uppercase tracking-[1px] mt-0.5">Match</span>
      </div>
    </div>
  );
}

/* ── Stat Card (dark mockup layout, light theme) ── */
function StatCard({ value, label, subtitle, accent }) {
  const isEmpty = !value && value !== 0;
  return (
    <div className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-5 flex flex-col items-center text-center" data-testid={`stat-card-${label?.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className={`text-[26px] sm:text-[30px] font-black tracking-tight leading-none mb-2 ${
        isEmpty ? "text-[var(--t-text-muted)]" : accent ? "text-[#2ec4b6]" : "text-[var(--t-text)]"
      }`}>
        {isEmpty ? "N/A" : value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-0.5">{label}</div>
      {subtitle && <div className="text-[11px] text-slate-400/80">{subtitle}</div>}
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ icon: Icon, title, testId }) {
  return (
    <div className="flex items-center gap-2 mb-4" data-testid={testId}>
      {Icon && <Icon className="w-4 h-4 text-[#2ec4b6]" />}
      <h3 className="text-[13px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--t-text-muted)" }}>{title}</h3>
    </div>
  );
}

/* ── Reusable Section Card ── */
function SectionCard({ title, icon, children, testId }) {
  return (
    <div className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-5 sm:p-6" data-testid={testId}>
      {title && <SectionHeader icon={icon} title={title} />}
      {children}
    </div>
  );
}

/* ── Overview Field ── */
function OverviewField({ label, value, isLink, gated }) {
  const linkText = label === "Recruiting Questionnaire" ? "Fill out questionnaire" : "Visit website";
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mb-1.5">{label}</div>
      {gated ? (
        <span className="text-[13px] text-[#2ec4b6] cursor-pointer hover:underline font-medium">Subscribe to view</span>
      ) : isLink && value ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer"
          className="text-[13px] text-[#2ec4b6] font-semibold hover:underline inline-flex items-center gap-1">
          {linkText} <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{value || "—"}</div>
      )}
    </div>
  );
}

/* ── Helpers ── */
function selectivityLabel(rate) {
  if (rate == null) return null;
  if (rate < 0.15) return "Highly selective";
  if (rate < 0.30) return "Selective";
  if (rate < 0.60) return "Moderate";
  return "Open admission";
}

function sizeLabel(size) {
  if (size == null) return null;
  if (size < 2000) return "Small";
  if (size < 10000) return "Medium-sized";
  return "Large";
}

function gradLabel(rate) {
  if (rate == null) return null;
  if (rate > 0.75) return "Excellent";
  if (rate > 0.50) return "Good";
  return "Fair";
}

export default function SchoolInfoPage() {
  const { domain } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { subscription } = useSubscription();
  const hasCoachAccess = canAccess(subscription, "coach_contacts");

  useEffect(() => {
    api.get(`/knowledge-base/school/${domain}`)
      .then(res => setSchool(res.data))
      .catch(() => { toast.error("School not found"); navigate("/knowledge-base"); })
      .finally(() => setLoading(false));
  }, [domain, navigate]);

  const addToBoard = async () => {
    if (!school) return;
    setAdding(true);
    try {
      await api.post("/knowledge-base/add-to-board", { university_name: school.university_name });
      toast.success(`${school.university_name} added to your board!`);
      setSchool(prev => ({ ...prev, on_board: true }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.error === "subscription_limit") toast.error(detail.message || "School limit reached.");
      else toast.error(typeof detail === "string" ? detail : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-[#2ec4b6] animate-spin" />
      </div>
    );
  }
  if (!school) return null;

  const coaches = school.coaches_scraped?.length
    ? school.coaches_scraped
    : [
        school.primary_coach && { name: school.primary_coach, title: "Head Coach", email: school.coach_email },
        school.recruiting_coordinator && { name: school.recruiting_coordinator, title: "Recruiting Coordinator", email: school.coordinator_email },
      ].filter(Boolean);

  const sc = school.scorecard || {};
  const divLabel = { D1: "NCAA D1", D2: "NCAA D2", D3: "NCAA D3", NAIA: "NAIA", JUCO: "JUCO" };

  const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : null;
  const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString()}` : null;
  const fmtRatio = (v) => v != null ? `${v}:1` : null;

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 pb-16" data-testid="school-info-page">
      {/* Back link */}
      <button onClick={() => navigate(-1)} data-testid="back-button"
        className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 font-semibold mb-5 hover:text-[#2ec4b6] transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Find Schools
      </button>

      {/* ══════ DARK Hero Card ══════ */}
      <div className="rounded-[20px] overflow-hidden mb-6 border border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #1e2640 60%, #2a1a2e 100%)" }}
        data-testid="school-hero">
        <div className="p-5 sm:p-9 flex flex-col sm:flex-row gap-4 sm:gap-7 items-center sm:items-start">
          {school.match_score != null && school.match_score > 0 && (
            <div className="flex flex-col items-center order-first sm:order-last mb-2 sm:mb-0">
              <MatchRing score={school.match_score} />
              {school.match_reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {school.match_reasons.map(r => (
                    <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-[5px] font-medium"
                      style={{ backgroundColor: "rgba(46,196,182,0.1)", color: "rgba(46,196,182,0.7)", border: "1px solid rgba(46,196,182,0.15)" }}>{r}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-xl sm:text-[28px] font-extrabold text-white tracking-tight mb-1.5 leading-tight" data-testid="school-name">
              {school.university_name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mb-3 justify-center sm:justify-start">
              {school.division && (
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold" data-testid="school-division"
                  style={{ backgroundColor: "rgba(46,196,182,0.2)", color: "#2ec4b6" }}>{school.division}</span>
              )}
              {school.conference && (
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{school.conference}</span>
              )}
              {school.region && (
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{school.region}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button onClick={addToBoard} disabled={adding || school.on_board} data-testid="add-to-board-btn"
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-[10px] text-[12px] sm:text-[13px] font-bold inline-flex items-center gap-1.5 text-white transition-all border-none"
                style={school.on_board
                  ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
                  : { background: "linear-gradient(135deg, #2ec4b6, #25a99e)" }}>
                {school.on_board ? <><Check className="w-4 h-4" /> On Your Board</> : <><Plus className="w-4 h-4" /> {adding ? "Adding..." : "Add to Board"}</>}
              </button>
              {school.website && (
                <a href={school.website} target="_blank" rel="noreferrer" data-testid="visit-website-btn"
                  className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-[10px] text-[12px] sm:text-[13px] font-bold inline-flex items-center gap-1.5 transition-all"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <ExternalLink className="w-4 h-4" /> Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════ KEY STATISTICS — Card Row ══════ */}
      <div className="mb-6" data-testid="key-statistics-section">
        <SectionHeader icon={Activity} title="Key Statistics" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            value={fmtMoney(sc.tuition_out_of_state)}
            label="Tuition"
            subtitle="Out-of-state"
          />
          <StatCard
            value={fmtPct(sc.admission_rate)}
            label="Acceptance Rate"
            subtitle={selectivityLabel(sc.admission_rate)}
            accent={sc.admission_rate != null && sc.admission_rate < 0.30}
          />
          <StatCard
            value={sc.student_size ? Number(sc.student_size).toLocaleString() : null}
            label="Undergrads"
            subtitle={sizeLabel(sc.student_size)}
          />
          <StatCard
            value={fmtPct(sc.graduation_rate)}
            label="Graduation Rate"
            subtitle={gradLabel(sc.graduation_rate)}
            accent={sc.graduation_rate != null && sc.graduation_rate > 0.50}
          />
        </div>
      </div>

      {/* ══════ LIGHT Sections ══════ */}
      <div className="flex flex-col gap-5">

        {/* ── Program Overview ── */}
        <SectionCard title="Program Overview" icon={BookOpen} testId="program-overview-section">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 pb-4 border-b" style={{ borderColor: "var(--t-border)" }}>
            <OverviewField label="Division" value={
              school.division ? <span className="inline-block px-2 py-0.5 rounded text-[12px] font-bold border border-[#2ec4b6]/20 text-[#2ec4b6] bg-[#2ec4b6]/5">{divLabel[school.division] || school.division}</span> : "—"
            } />
            <OverviewField label="Conference" value={school.conference || "—"} />
            <OverviewField label="Program Website" value={school.website} isLink />
            <OverviewField label="Academic Website" value={school.domain ? `https://${school.domain}` : null} isLink />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <OverviewField label="Recruiting Questionnaire" value={school.questionnaire_url} isLink />
            <OverviewField label="Twitter/X" value={school.twitter_url} isLink />
            <OverviewField label="Instagram" value={school.instagram_url} isLink />
            <OverviewField label="Facebook" value={school.facebook_url} isLink />
          </div>
        </SectionCard>

        {/* ── Coaching Staff ── */}
        <div data-testid="coaching-staff-section">
          <SectionHeader icon={Users} title="Coaching Staff" />
          {coaches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {coaches.map((c, i) => (
                <div key={i} className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-5" data-testid={`coach-card-${i}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(46,196,182,0.1)" }}>
                      <User className="w-5 h-5 text-[#2ec4b6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>{c.name}</div>
                      <div className="text-[12px] text-slate-400 mt-0.5">{c.title || "Coach"}</div>
                    </div>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2.5 mt-4">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[13px] text-[#2ec4b6] font-medium">{c.email}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400 mb-4">No coaching staff data available.</p>
          )}
        </div>

        {/* ── School Profile ── */}
        <div data-testid="school-profile-section">
          <SectionHeader icon={GraduationCap} title="School Profile" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard value={fmtPct(sc.graduation_rate)} label="Graduation Rate" subtitle={gradLabel(sc.graduation_rate)} accent={sc.graduation_rate > 0.50} />
            <StatCard value={fmtPct(sc.retention_rate)} label="Retention Rate" />
            <StatCard value={fmtRatio(sc.student_faculty_ratio)} label="Student-Faculty Ratio" />
            <StatCard value={sc.student_size ? Number(sc.student_size).toLocaleString() : null} label="Undergrad Students" subtitle={sizeLabel(sc.student_size)} />
          </div>
        </div>

        {/* ── Admissions ── */}
        <div data-testid="admissions-section">
          <SectionHeader icon={BookOpen} title="Admissions" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatCard value={sc.avg_gpa || null} label="Average GPA" />
            <StatCard value={sc.act_midpoint ? String(sc.act_midpoint) : null} label="ACT" />
            <StatCard value={sc.sat_avg ? String(sc.sat_avg) : null} label="SAT" />
            <StatCard value={fmtPct(sc.admission_rate)} label="Acceptance Rate" subtitle={selectivityLabel(sc.admission_rate)} accent={sc.admission_rate != null && sc.admission_rate < 0.30} />
          </div>
          {sc.test_requirements && (
            <div className="pt-3 border-t" style={{ borderColor: "var(--t-border)" }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 mb-1">Test Requirements</div>
              <div className="text-[13px] leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>{sc.test_requirements}</div>
            </div>
          )}
        </div>

        {/* ── Financial ── */}
        <div data-testid="financial-section">
          <SectionHeader icon={DollarSign} title="Financial" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard value={fmtMoney(sc.tuition_out_of_state)} label="Out-of-State Tuition" />
            <StatCard value={fmtMoney(sc.tuition_in_state)} label="In-State Tuition" />
            <StatCard value={fmtMoney(sc.median_debt)} label="Median Debt" subtitle="At graduation" />
            <StatCard value={fmtMoney(sc.monthly_loan_payment)} label="Monthly Loan" subtitle="After graduation" />
            <StatCard value={fmtMoney(sc.median_earnings)} label="Median Earnings" subtitle="After graduation" accent />
          </div>
        </div>

        {/* ── Additional Details ── */}
        {(school.mascot || school.scholarship_type || school.region) && (
          <div data-testid="additional-details-section">
            <SectionHeader title="Additional Details" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {school.region && (
                <div className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">Location</div>
                  <div className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>{school.region}</div>
                </div>
              )}
              {school.mascot && (
                <div className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">Mascot</div>
                  <div className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>{school.mascot}</div>
                </div>
              )}
              {school.scholarship_type && (
                <div className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">Scholarship</div>
                  <div className="text-[15px] font-bold" style={{ color: "var(--t-text)" }}>{school.scholarship_type}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
