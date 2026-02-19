import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import UniversityLogo from "../components/UniversityLogo";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Mail, ExternalLink, Users, User,
  Phone, Activity, Info, Check, Loader2
} from "lucide-react";

function MatchRing({ score }) {
  const r = 44, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="text-center flex-shrink-0" data-testid="match-score-ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e8628a" strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x="50" y="46" textAnchor="middle" fill="#e8628a" fontSize="24" fontWeight="800">{score}%</text>
        <text x="50" y="60" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="600" letterSpacing="1">MATCH</text>
      </svg>
    </div>
  );
}

function BentoCard({ value, label, sub, pink }) {
  return (
    <div className="rounded-[14px] p-4 text-center transition-colors border border-slate-200 hover:border-[#e8628a]/30 bg-white"
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className={`text-[22px] sm:text-[26px] font-extrabold mb-1 tracking-tight ${pink ? "text-[#e8628a]" : "text-slate-800"}`}>{value}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-[1px] font-semibold">{label}</div>
      {sub && <div className="text-[11px] text-slate-300 mt-1">{sub}</div>}
    </div>
  );
}

function CoachCard({ coach, onEmail }) {
  return (
    <div className="rounded-[14px] p-5 flex gap-3.5 items-start border border-slate-200 hover:border-[#e8628a]/30 transition-colors bg-white"
      data-testid={`coach-card-${coach.name?.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#e8628a]/10">
        <User className="w-5 h-5 text-[#e8628a]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-slate-800">{coach.name}</div>
        <div className="text-[11px] text-slate-400 mb-2.5">{coach.title || "Coach"}</div>
        <div className="flex flex-col gap-1">
          {coach.email && (
            <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <Mail className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              <a href={`mailto:${coach.email}`} className="text-[#e8628a] hover:underline truncate">{coach.email}</a>
            </div>
          )}
          {coach.phone && (
            <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <Phone className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              {coach.phone}
            </div>
          )}
        </div>
        {coach.email && (
          <button onClick={() => onEmail(coach)} data-testid={`email-coach-${coach.name?.replace(/\s+/g, "-").toLowerCase()}`}
            className="mt-3 px-3.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors bg-[#e8628a]/10 text-[#e8628a] border border-[#e8628a]/20 hover:bg-[#e8628a]/20">
            <Mail className="w-3 h-3" /> Send Email
          </button>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value, isLink }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-b-0">
      <span className="text-[12px] text-slate-400 font-medium">{label}</span>
      {isLink ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer"
          className="text-[13px] text-[#e8628a] font-semibold hover:underline truncate max-w-[200px]">{value.replace(/^https?:\/\//, "")}</a>
      ) : (
        <span className="text-[13px] text-slate-700 font-semibold">{value}</span>
      )}
    </div>
  );
}

export default function SchoolInfoPage() {
  const { domain } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

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
        <Loader2 className="w-6 h-6 text-[#e8628a] animate-spin" />
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
  const hasScorecardStats = sc.tuition_out_of_state || sc.admission_rate != null || sc.student_size || sc.graduation_rate != null;
  const divFull = { D1: "NCAA Division I", D2: "NCAA Division II", D3: "NCAA Division III", NAIA: "NAIA", JUCO: "JUCO" };

  const getSizeLabel = (size) => {
    if (!size) return "";
    if (size > 15000) return "Large university";
    if (size > 5000) return "Medium-sized";
    return "Small college";
  };
  const getSelectivityLabel = (rate) => {
    if (rate == null) return "";
    if (rate < 0.15) return "Highly selective";
    if (rate < 0.40) return "Selective";
    if (rate < 0.70) return "Moderately selective";
    return "Open admission";
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 pb-16" data-testid="school-info-page">
      {/* Back link */}
      <button onClick={() => navigate(-1)} data-testid="back-button"
        className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 font-semibold mb-5 hover:text-[#e8628a] transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Find Schools
      </button>

      {/* ── DARK Hero Card ── */}
      <div className="rounded-[20px] overflow-hidden mb-6 border border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #1e2640 60%, #2a1a2e 100%)" }}
        data-testid="school-hero">
        <div className="p-6 sm:p-9 flex flex-col sm:flex-row gap-5 sm:gap-7 items-center sm:items-start">
          <UniversityLogo domain={school.domain} name={school.university_name} size={80}
            className="rounded-2xl border border-white/[0.06]" />
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight mb-2 leading-tight" data-testid="school-name">
              {school.university_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mb-4 justify-center sm:justify-start">
              {school.division && (
                <span className="px-3 py-1 rounded-lg text-[12px] font-bold" data-testid="school-division"
                  style={{ backgroundColor: "rgba(232,98,138,0.2)", color: "#e8628a" }}>{school.division}</span>
              )}
              {school.conference && (
                <span className="px-3 py-1 rounded-lg text-[12px] font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{school.conference}</span>
              )}
              {school.region && (
                <span className="px-3 py-1 rounded-lg text-[12px] font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{school.region}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <button onClick={addToBoard} disabled={adding || school.on_board} data-testid="add-to-board-btn"
                className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-1.5 text-white transition-all border-none"
                style={school.on_board
                  ? { background: "rgba(16,185,129,0.2)", color: "#10b981" }
                  : { background: "linear-gradient(135deg, #e8628a, #d63659)" }}>
                {school.on_board ? <><Check className="w-4 h-4" /> On Your Board</> : <><Plus className="w-4 h-4" /> {adding ? "Adding..." : "Add to Board"}</>}
              </button>
              {coaches[0]?.email && (
                <a href={`mailto:${coaches[0].email}`} data-testid="email-coach-hero-btn"
                  className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-1.5 transition-all"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Mail className="w-4 h-4" /> Email Coach
                </a>
              )}
              {school.website && (
                <a href={school.website} target="_blank" rel="noreferrer" data-testid="visit-website-btn"
                  className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold inline-flex items-center gap-1.5 transition-all"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <ExternalLink className="w-4 h-4" /> Visit Website
                </a>
              )}
            </div>
          </div>
          {school.match_score > 0 && (
            <div className="flex flex-col items-center">
              <MatchRing score={school.match_score} />
              {school.match_reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center mt-1.5">
                  {school.match_reasons.map(r => (
                    <span key={r} className="text-[9px] px-1.5 py-0.5 rounded-[5px] font-medium"
                      style={{ backgroundColor: "rgba(232,98,138,0.1)", color: "rgba(232,98,138,0.7)", border: "1px solid rgba(232,98,138,0.15)" }}>{r}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── LIGHT: Key Statistics ── */}
      {hasScorecardStats && (
        <div className="mb-7" data-testid="key-statistics-section">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[1.5px] uppercase text-slate-400 mb-3.5">
            <Activity className="w-3.5 h-3.5 text-[#e8628a]" /> Key Statistics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {sc.tuition_out_of_state && <BentoCard value={`$${Number(sc.tuition_out_of_state).toLocaleString()}`} label="Tuition" sub="Out-of-state" />}
            {sc.admission_rate != null && <BentoCard value={`${(sc.admission_rate * 100).toFixed(0)}%`} label="Acceptance Rate" sub={getSelectivityLabel(sc.admission_rate)} pink />}
            {sc.student_size && <BentoCard value={Number(sc.student_size).toLocaleString()} label="Undergrads" sub={getSizeLabel(sc.student_size)} />}
            {sc.graduation_rate != null && <BentoCard value={`${(sc.graduation_rate * 100).toFixed(0)}%`} label="Graduation Rate" sub={sc.graduation_rate >= 0.8 ? "Excellent" : sc.graduation_rate >= 0.6 ? "Good" : ""} pink />}
          </div>
        </div>
      )}

      {/* ── LIGHT: Coaches + School Details ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {coaches.length > 0 && (
          <div data-testid="coaching-staff-section">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[1.5px] uppercase text-slate-400 mb-3.5">
              <Users className="w-3.5 h-3.5 text-[#e8628a]" /> Coaching Staff
            </div>
            <div className="flex flex-col gap-2.5">
              {coaches.map((c, i) => (
                <CoachCard key={i} coach={c} onEmail={(coach) => window.location.href = `mailto:${coach.email}`} />
              ))}
            </div>
          </div>
        )}

        <div data-testid="school-details-section">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[1.5px] uppercase text-slate-400 mb-3.5">
            <Info className="w-3.5 h-3.5 text-[#e8628a]" /> School Details
          </div>
          <div className="rounded-[14px] p-5 border border-slate-200 bg-white">
            {school.region && <DetailRow label="Location" value={school.region} />}
            {school.division && <DetailRow label="Division" value={divFull[school.division] || school.division} />}
            {school.conference && <DetailRow label="Conference" value={school.conference} />}
            {school.mascot && <DetailRow label="Mascot" value={school.mascot} />}
            {school.scholarship_type && <DetailRow label="Scholarship" value={school.scholarship_type} />}
            {sc.tuition_in_state && <DetailRow label="In-State Tuition" value={`$${Number(sc.tuition_in_state).toLocaleString()}`} />}
            {sc.tuition_out_of_state && <DetailRow label="Out-of-State Tuition" value={`$${Number(sc.tuition_out_of_state).toLocaleString()}`} />}
            {school.website && <DetailRow label="Program Website" value={school.website} isLink />}
            {school.domain && <DetailRow label="School Website" value={school.domain} isLink />}
          </div>
        </div>
      </div>
    </div>
  );
}
