import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Building2, User, Mail, Plus, ExternalLink, X, Check, Sparkles, ChevronDown, GraduationCap, DollarSign, Users, Award, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { RiskBadgeRow, RiskBadgeEmpty } from "../RiskBadges";

const DIV_COLORS = {
  D1: "bg-slate-500/15 text-teal-700",
  D2: "bg-blue-500/15 text-blue-600",
  D3: "bg-violet-500/15 text-violet-600",
  NAIA: "bg-orange-500/15 text-orange-600",
  JUCO: "bg-yellow-500/15 text-yellow-600",
};

const DIV_FULL = { D1: "NCAA I", D2: "NCAA II", D3: "NCAA III" };

function ScorecardStat({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-lg p-2.5 flex items-center gap-2.5" style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-bold leading-tight" style={{ color: "var(--t-text)" }}>{value}</div>
        <div className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

export default function SchoolGridCard({ uni, adding, addToBoard, boardSchools, isExpanded, onToggleExpand, onRiskBadgeClick }) {
  const isOnBoard = boardSchools.has(uni.university_name);
  const divColor = DIV_COLORS[uni.division] || "bg-gray-500/15 text-gray-600";
  const navigate = useNavigate();

  // Expanded view
  if (isExpanded) {
    return (
      <div
        className="col-span-full rounded-xl border-2 overflow-hidden shadow-lg transition-all duration-300 animate-in fade-in"
        style={{ borderColor: "var(--t-accent, #0d9488)", backgroundColor: "var(--t-surface)" }}
        data-testid={`expanded-card-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #0d9488, #14b8a6)" }} />
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left panel */}
          <div className="p-7 border-r" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-start justify-between mb-1">
              <span className="font-heading text-3xl font-extrabold text-gray-800">
                {uni.match_score ? `${uni.match_score}%` : ""}
              </span>
            </div>
            <h3 className="font-heading text-2xl font-extrabold uppercase tracking-tight leading-none mt-3" style={{ color: "var(--t-text)" }}>
              {uni.university_name}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: "var(--t-text-muted)" }}>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${divColor}`}>{uni.division}</span>
              {uni.region && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {uni.region}</span>}
              {uni.conference && <span>· {DIV_FULL[uni.division] || uni.division} | {uni.conference}</span>}
            </div>

            {/* Coaching Staff */}
            {(uni.primary_coach || uni.recruiting_coordinator) && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-widest mt-5 mb-2" style={{ color: "var(--t-text-muted)" }}>Coaching Staff</div>
                <div className="space-y-2">
                  {uni.primary_coach && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--t-surface-alt)", border: "1px solid var(--t-border)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                        {uni.primary_coach.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[13px]" style={{ color: "var(--t-text)" }}>{uni.primary_coach}</div>
                        <div className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>Head Coach</div>
                      </div>
                      {uni.coach_email && (
                        <a href={`mailto:${uni.coach_email}`} className="text-slate-500 hover:text-teal-600" data-testid="expanded-coach-email">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                  {uni.recruiting_coordinator && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--t-surface-alt)", border: "1px solid var(--t-border)" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                        {uni.recruiting_coordinator.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-[13px]" style={{ color: "var(--t-text)" }}>{uni.recruiting_coordinator}</div>
                        <div className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>Recruiting Coordinator</div>
                      </div>
                      {uni.coordinator_email && (
                        <a href={`mailto:${uni.coordinator_email}`} className="text-slate-500 hover:text-teal-600">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right panel */}
          <div className="p-7" style={{ backgroundColor: "var(--t-surface-alt)" }}>
            {uni.match_reasons?.length > 0 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-text-muted)" }}>Why This School?</div>
                <div className="rounded-lg p-4 mb-4 text-[13px] leading-relaxed bg-gray-50 border border-gray-200" style={{ color: "var(--t-text-secondary)" }}>
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-gray-500" />
                  {uni.match_reasons.some(r => ["Strong Academic Fit", "Good Academic Fit"].includes(r))
                    ? <><strong style={{ color: "var(--t-text)" }}>{uni.university_name} is a strong match</strong> because it aligns with your preferences in {uni.match_reasons.join(", ").toLowerCase()}.</>
                    : uni.match_reasons.some(r => r === "Slight Reach")
                    ? <><strong style={{ color: "var(--t-text)" }}>{uni.university_name}</strong> matches your preferences but is a <strong>slight academic reach</strong>. Your test scores are a bit below the school average.</>
                    : uni.match_reasons.some(r => ["Reach", "High Reach"].includes(r))
                    ? <><strong style={{ color: "var(--t-text)" }}>{uni.university_name}</strong> matches your preferences but is an <strong>academic reach</strong>. Your test scores are below this school's typical admitted students.</>
                    : <><strong style={{ color: "var(--t-text)" }}>{uni.university_name}</strong> aligns with your preferences in {uni.match_reasons.join(", ").toLowerCase()}.</>
                  }
                  {uni.primary_coach && ` Coach ${uni.primary_coach.split(" ")[1] || uni.primary_coach} leads the program.`}
                </div>
              </>
            )}

            {uni.match_reasons?.length > 0 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--t-text-muted)" }}>Match Reasons</div>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {uni.match_reasons.map(r => {
                    const isReach = ["Reach", "High Reach"].includes(r);
                    const isSlightReach = r === "Slight Reach";
                    const isStrongFit = r === "Strong Academic Fit";
                    const isGoodFit = r === "Good Academic Fit";
                    return (
                      <span key={r} className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                        isReach ? "bg-red-50 text-red-700 border-red-200" :
                        isSlightReach ? "bg-amber-50 text-amber-700 border-amber-200" :
                        isStrongFit ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        isGoodFit ? "bg-teal-50 text-teal-700 border-teal-200" :
                        "bg-gray-100 text-gray-600 border-gray-200"
                      }`}>
                        {r}
                      </span>
                    );
                  })}
                </div>
                <p className="text-[10px] mb-5" style={{ color: "var(--t-text-muted)" }}>
                  Academic fit reflects admission realism based on your GPA, SAT, and ACT vs. school averages. It is not a guarantee of admission.
                </p>
              </>
            )}

            {/* ── Scorecard Data ── */}
            {uni.scorecard && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: "var(--t-text-muted)" }}>
                  <GraduationCap className="w-3.5 h-3.5" /> School Profile & Admissions
                </div>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {uni.scorecard.admission_rate != null && (
                    <ScorecardStat icon={BarChart3} label="Acceptance Rate" value={`${(uni.scorecard.admission_rate * 100).toFixed(0)}%`} color="#0d9488" />
                  )}
                  {uni.scorecard.graduation_rate != null && (
                    <ScorecardStat icon={Award} label="Graduation Rate" value={`${(uni.scorecard.graduation_rate * 100).toFixed(0)}%`} color="#10b981" />
                  )}
                  {uni.scorecard.retention_rate != null && (
                    <ScorecardStat icon={Users} label="Retention Rate" value={`${(uni.scorecard.retention_rate * 100).toFixed(0)}%`} color="#3b82f6" />
                  )}
                  {uni.scorecard.student_faculty_ratio != null && (
                    <ScorecardStat icon={User} label="Student-Faculty" value={`${uni.scorecard.student_faculty_ratio}:1`} color="#8b5cf6" />
                  )}
                  {uni.scorecard.sat_avg != null && (
                    <ScorecardStat icon={GraduationCap} label="Avg SAT" value={uni.scorecard.sat_avg} color="#f59e0b" />
                  )}
                  {uni.scorecard.act_midpoint != null && (
                    <ScorecardStat icon={GraduationCap} label="Avg ACT" value={uni.scorecard.act_midpoint} color="#f59e0b" />
                  )}
                  {uni.scorecard.tuition_in_state != null && (
                    <ScorecardStat icon={DollarSign} label="Tuition (In-State)" value={`$${Number(uni.scorecard.tuition_in_state).toLocaleString()}`} color="#6b7280" />
                  )}
                  {uni.scorecard.tuition_out_of_state != null && (
                    <ScorecardStat icon={DollarSign} label="Tuition (Out-of-State)" value={`$${Number(uni.scorecard.tuition_out_of_state).toLocaleString()}`} color="#6b7280" />
                  )}
                  {uni.scorecard.student_size != null && (
                    <ScorecardStat icon={Users} label="Enrollment" value={Number(uni.scorecard.student_size).toLocaleString()} color="#6b7280" />
                  )}
                </div>
              </>
            )}

            <div className="flex gap-3 mt-5">
              <Button
                onClick={() => addToBoard(uni)}
                disabled={adding[uni.university_name] || isOnBoard}
                data-testid={`expanded-add-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
                className={`flex-1 h-10 text-sm font-semibold gap-2 ${isOnBoard ? "bg-teal-700 hover:bg-teal-700 text-white" : "bg-gray-800 hover:bg-gray-900 text-white"}`}
              >
                {isOnBoard ? (<><Check className="w-4 h-4" /> On Your Board</>) : (<><Plus className="w-4 h-4" />{adding[uni.university_name] ? "Adding..." : "Add to Board"}</>)}
              </Button>
              {uni.domain && (
                <Button variant="outline" className="h-10 gap-2 text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
                  onClick={() => navigate(`/school/${uni.domain}`)} data-testid={`view-details-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}>
                  <ArrowRight className="w-4 h-4" /> Details
                </Button>
              )}
              <Button variant="outline" className="h-10 w-10 p-0" style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}
                onClick={onToggleExpand} data-testid="expanded-close">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact grid card
  return (
    <div
      className="rounded-xl p-5 border cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden group"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      onClick={onToggleExpand}
      data-testid={`grid-card-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
    >
      {/* Top accent line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(90deg, #0d9488, #14b8a6)" }} />

      <div className="flex items-start justify-between mb-3">
        {uni.match_score && (
          <span className={`font-heading text-xl font-extrabold ${uni.match_score >= 80 ? "text-gray-800" : uni.match_score >= 60 ? "text-gray-500" : "text-gray-400"}`}>
            {uni.match_score}%
          </span>
        )}
      </div>

      <h3 className="font-semibold text-[14px] leading-tight mb-1" style={{ color: "var(--t-text)" }}>{uni.university_name}</h3>
      <div className="flex items-center gap-1.5 text-[12px] mb-3" style={{ color: "var(--t-text-muted)" }}>
        <MapPin className="w-3 h-3" /> {uni.region} {uni.conference && `· ${uni.conference}`}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${divColor}`}>{uni.division}</span>
        {uni.conference && (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: "var(--t-surface-alt)", border: "1px solid var(--t-border)", color: "var(--t-text-muted)" }}>
            {uni.conference}
          </span>
        )}
      </div>

      {uni.risk_badges?.length > 0 ? (
        <div className="mb-3">
          <RiskBadgeRow badges={uni.risk_badges} max={2} onBadgeClick={(b) => onRiskBadgeClick?.(uni, b)} />
        </div>
      ) : uni.match_score ? (
        <div className="mb-3"><RiskBadgeEmpty /></div>
      ) : null}

      <button
        className={`w-full py-2 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 border ${
          isOnBoard
            ? "border-slate-500/30 text-teal-700 bg-slate-50/50 cursor-default"
            : "border-[var(--t-border)] text-[var(--t-text-secondary)] hover:border-slate-500 hover:text-teal-600 hover:bg-slate-50/50"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isOnBoard) addToBoard(uni);
        }}
        disabled={adding[uni.university_name] || isOnBoard}
        data-testid={`add-to-board-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
      >
        {isOnBoard ? (<><Check className="w-3.5 h-3.5" /> On Your Board</>) : (<><Plus className="w-3.5 h-3.5" />{adding[uni.university_name] ? "Adding..." : "Add to Board"}</>)}
      </button>
    </div>
  );
}
