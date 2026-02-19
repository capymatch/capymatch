import { useState, useMemo } from "react";
import { Calendar, Clock, AlertCircle, FileText, GraduationCap, Award, Eye, Tent } from "lucide-react";

const DIVISIONS = ["D1", "D2", "D3", "NAIA"];

const PERIOD_TYPES = {
  contact: { label: "Contact", dot: "bg-[#3d9e8f]", desc: "Coaches can call, text, and email you directly", dotStyle: { backgroundColor: "#3d9e8f" } },
  dead: { label: "Dead", dot: "bg-[#c45555]", desc: "No in-person or off-campus contact allowed", dotStyle: { backgroundColor: "#c45555" } },
  evaluation: { label: "Evaluation", dot: "bg-[#5568a8]", desc: "Coaches can watch you compete but can't contact you off-campus", dotStyle: { backgroundColor: "#5568a8" } },
  quiet: { label: "Quiet", dot: "bg-[#d4a23c]", desc: "Limited contact — coaches can only talk to you on campus", dotStyle: { backgroundColor: "#d4a23c" } },
};

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const MONTH_MAP = { Sep: 8, Oct: 9, Nov: 10, Dec: 11, Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7 };

// NCAA D1 Women's Volleyball Recruiting Calendar 2025-26
const TIMELINE_DATA = {
  D1: {
    season: "2025-26",
    periods: [
      { type: "contact", startMonth: 0, startFrac: 0, endMonth: 2, endFrac: 0.4, label: "Contact" },
      { type: "dead", startMonth: 2, startFrac: 0.4, endMonth: 2, endFrac: 0.65, label: "Dead" },
      { type: "contact", startMonth: 2, startFrac: 0.65, endMonth: 5, endFrac: 0, label: "Contact" },
      { type: "dead", startMonth: 5, startFrac: 0, endMonth: 5, endFrac: 0.25, label: "Dead" },
      { type: "contact", startMonth: 5, startFrac: 0.25, endMonth: 7, endFrac: 0.5, label: "Contact" },
      { type: "quiet", startMonth: 7, startFrac: 0.5, endMonth: 8, endFrac: 1, label: "Quiet" },
      { type: "evaluation", startMonth: 9, startFrac: 0, endMonth: 10, endFrac: 0, label: "Evaluation" },
      { type: "contact", startMonth: 10, startFrac: 0, endMonth: 11, endFrac: 1, label: "Contact" },
    ],
    keyDates: [
      { name: "NLI Early Signing Period", range: "Nov 13 - Nov 20, 2025", icon: "file", status: "passed" },
      { name: "Transfer Portal Window", range: "Apr 15 - Apr 30, 2026", icon: "grad", status: "upcoming", daysAway: null },
      { name: "Spring Evaluation Period", range: "Apr 16 - May 31, 2026", icon: "eye", status: "upcoming", daysAway: null },
      { name: "Summer Camp Season", range: "Jun 1 - Aug 1, 2026", icon: "camp", status: "upcoming", daysAway: null },
      { name: "NLI Regular Signing Period", range: "Apr 15 - Aug 1, 2026", icon: "file", status: "upcoming", daysAway: null },
      { name: "Fall Contact Period Begins", range: "Sep 1, 2026", icon: "calendar", status: "upcoming", daysAway: null },
    ],
  },
  D2: {
    season: "2025-26",
    periods: [
      { type: "contact", startMonth: 0, startFrac: 0, endMonth: 2, endFrac: 0.4, label: "Contact" },
      { type: "dead", startMonth: 2, startFrac: 0.4, endMonth: 2, endFrac: 0.65, label: "Dead" },
      { type: "contact", startMonth: 2, startFrac: 0.65, endMonth: 7, endFrac: 0.5, label: "Contact" },
      { type: "quiet", startMonth: 7, startFrac: 0.5, endMonth: 8, endFrac: 1, label: "Quiet" },
      { type: "evaluation", startMonth: 9, startFrac: 0, endMonth: 10, endFrac: 0, label: "Evaluation" },
      { type: "contact", startMonth: 10, startFrac: 0, endMonth: 11, endFrac: 1, label: "Contact" },
    ],
    keyDates: [
      { name: "NLI Early Signing Period", range: "Nov 13 - Nov 20, 2025", icon: "file", status: "passed" },
      { name: "Spring Evaluation Period", range: "Apr 16 - May 31, 2026", icon: "eye", status: "upcoming" },
      { name: "Summer Camp Season", range: "Jun 1 - Aug 1, 2026", icon: "camp", status: "upcoming" },
      { name: "NLI Regular Signing Period", range: "Apr 15 - Aug 1, 2026", icon: "file", status: "upcoming" },
    ],
  },
  D3: {
    season: "2025-26",
    periods: [
      { type: "contact", startMonth: 0, startFrac: 0, endMonth: 11, endFrac: 1, label: "Contact" },
    ],
    keyDates: [
      { name: "No NLI for D3", range: "D3 schools do not offer athletic scholarships or NLI", icon: "file", status: "info" },
      { name: "Summer Camp Season", range: "Jun 1 - Aug 1, 2026", icon: "camp", status: "upcoming" },
      { name: "Coaches can contact year-round", range: "No restricted periods for D3", icon: "calendar", status: "info" },
    ],
  },
  NAIA: {
    season: "2025-26",
    periods: [
      { type: "contact", startMonth: 0, startFrac: 0, endMonth: 11, endFrac: 1, label: "Contact" },
    ],
    keyDates: [
      { name: "NAIA Letter of Intent", range: "Can be signed anytime after receiving an offer", icon: "file", status: "info" },
      { name: "Coaches can contact year-round", range: "No restricted contact periods for NAIA", icon: "calendar", status: "info" },
      { name: "Summer Camp Season", range: "Jun 1 - Aug 1, 2026", icon: "camp", status: "upcoming" },
    ],
  },
};

function getCurrentMonthIndex() {
  const m = new Date().getMonth();
  // Map calendar month (0=Jan) to our Sep-Aug index (Sep=0)
  const map = { 0: 4, 1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11, 8: 0, 9: 1, 10: 2, 11: 3 };
  return map[m];
}

function getCurrentPeriod(division) {
  const data = TIMELINE_DATA[division];
  const nowIdx = getCurrentMonthIndex();
  const nowFrac = new Date().getDate() / 30;
  const nowPos = nowIdx + nowFrac;

  for (const p of data.periods) {
    const start = p.startMonth + p.startFrac;
    const end = p.endMonth + p.endFrac;
    if (nowPos >= start && nowPos <= end) {
      return p;
    }
  }
  return data.periods[0];
}

function daysUntilDate(dateStr) {
  const parts = dateStr.split(" - ")[0].replace(",", "").split(" ");
  const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const m = monthMap[parts[0]];
  const d = parseInt(parts[1]);
  const y = parseInt(parts[2] || "2026");
  const target = new Date(y, m, d);
  const diff = Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

const DATE_ICONS = {
  file: FileText,
  grad: GraduationCap,
  eye: Eye,
  camp: Tent,
  calendar: Calendar,
  award: Award,
};

const DATE_ICON_BG = {
  file: "bg-[#d5e8e6]",
  grad: "bg-[#d5d8e8]",
  eye: "bg-[#dde0e4]",
  camp: "bg-[#e8e0cc]",
  calendar: "bg-[#dde0e4]",
  award: "bg-[#dde0e4]",
};

function StatusTag({ status, range }) {
  if (status === "passed") return <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: "#e0e4e8", color: "#4a5568" }}>Passed</span>;
  if (status === "info") return <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: "#5568a8", color: "#ffffff" }}>Info</span>;
  const days = daysUntilDate(range);
  if (days <= 0) return <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: "#3d9e8f", color: "#ffffff" }}>Active Now</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: "#d4a23c", color: "#ffffff" }}>{days} days away</span>;
}

// ── Visual Timeline Bar ──
function TimelineBar({ periods, division }) {
  const currentIdx = getCurrentMonthIndex();
  const nowFrac = new Date().getDate() / 30;
  const nowPercent = ((currentIdx + nowFrac) / 12) * 100;

  // Build a full 12-month row of colored segments
  const segments = useMemo(() => {
    const segs = [];
    let covered = 0;
    const sorted = [...periods].sort((a, b) => (a.startMonth + a.startFrac) - (b.startMonth + b.startFrac));

    for (const p of sorted) {
      const start = p.startMonth + p.startFrac;
      const end = p.endMonth + p.endFrac;
      if (start > covered) {
        segs.push({ type: "gap", width: ((start - covered) / 12) * 100 });
      }
      segs.push({ type: p.type, width: ((end - start) / 12) * 100, label: p.label });
      covered = end;
    }
    if (covered < 12) {
      segs.push({ type: "gap", width: ((12 - covered) / 12) * 100 });
    }
    return segs;
  }, [periods]);

  const barColors = {
    contact: "rounded-sm",
    dead: "rounded-sm",
    evaluation: "rounded-sm",
    quiet: "rounded-sm",
    gap: "rounded-sm",
  };

  const barBgStyles = {
    contact: { backgroundColor: "#5bb8ac" },
    dead: { backgroundColor: "#d07070" },
    evaluation: { backgroundColor: "#7080b8" },
    quiet: { backgroundColor: "#d8b050" },
    gap: { backgroundColor: "#edf0f4" },
  };

  const textColors = {
    contact: "text-white",
    dead: "text-white",
    evaluation: "text-white",
    quiet: "text-white",
  };

  return (
    <div className="rounded-xl border p-4 sm:p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="ncaa-timeline-bar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--t-text)" }}>
          <Calendar className="w-4 h-4 text-slate-600" />
          NCAA {division} Recruiting Calendar
        </h3>
        <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{TIMELINE_DATA[division].season} Season</span>
      </div>

      {/* Month labels */}
      <div className="flex mb-1.5 overflow-x-auto">
        {MONTHS.map((m, i) => (
          <div key={m} className={`flex-1 text-center text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider min-w-[2rem] ${i === currentIdx ? "text-slate-500" : ""}`}
            style={i !== currentIdx ? { color: "var(--t-text-muted)" } : {}}>
            {m}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="relative mb-3">
        <div className="flex gap-[2px] h-8 sm:h-9 rounded-md overflow-hidden">
          {segments.map((s, i) => (
            <div key={i} className={`${barColors[s.type]} flex items-center justify-center overflow-hidden`}
              style={{ width: `${s.width}%`, ...barBgStyles[s.type] }}>
              {s.type !== "gap" && s.width > 6 && (
                <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wide ${textColors[s.type]}`}>{s.label}</span>
              )}
            </div>
          ))}
        </div>
        {/* NOW marker */}
        <div className="absolute top-[-6px] bottom-[-6px] w-[2px] bg-slate-700 z-10" style={{ left: `${nowPercent}%` }}>
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[7px] font-extrabold tracking-wider text-slate-600 bg-[var(--t-surface)] px-1.5 py-0.5 rounded border border-slate-400/40">NOW</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 sm:gap-5 flex-wrap pt-2 border-t" style={{ borderColor: "var(--t-border)" }}>
        {Object.entries(PERIOD_TYPES).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={val.dotStyle} />
            <span className="text-[10px] sm:text-[11px]" style={{ color: "var(--t-text-muted)" }}>{val.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──
export default function NcaaTimeline() {
  const [division, setDivision] = useState("D1");
  const data = TIMELINE_DATA[division];
  const currentPeriod = getCurrentPeriod(division);
  const periodInfo = PERIOD_TYPES[currentPeriod.type];

  // Calculate days remaining in current period
  const nowIdx = getCurrentMonthIndex();
  const endPos = currentPeriod.endMonth + currentPeriod.endFrac;
  const daysRemaining = Math.max(0, Math.round((endPos - nowIdx) * 30));

  return (
    <div className="space-y-5" data-testid="ncaa-timeline">
      {/* Current Period Banner */}
      <div className="rounded-xl border-l-4 border p-4 sm:p-5" style={{
        backgroundColor: "var(--t-surface)",
        borderColor: "var(--t-border)",
        borderLeftColor: currentPeriod.type === "contact" ? "#3d9e8f" :
          currentPeriod.type === "dead" ? "#c45555" :
          currentPeriod.type === "evaluation" ? "#5568a8" : "#d4a23c"
      }} data-testid="current-period-banner">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{
              backgroundColor: currentPeriod.type === "contact" ? "#3d9e8f" :
                currentPeriod.type === "dead" ? "#c45555" :
                currentPeriod.type === "evaluation" ? "#5568a8" : "#d4a23c"
            }} />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{
                color: currentPeriod.type === "contact" ? "#2d7a6e" :
                  currentPeriod.type === "dead" ? "#993333" :
                  currentPeriod.type === "evaluation" ? "#3d4d88" : "#a07820"
              }}>Current Period - {division}</p>
              <p className="text-base sm:text-lg font-bold mt-0.5" style={{ color: "var(--t-text)" }}>{periodInfo.label} Period</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{periodInfo.desc}</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold self-start sm:self-auto flex-shrink-0" style={{
            backgroundColor: currentPeriod.type === "contact" ? "#3d9e8f" :
              currentPeriod.type === "dead" ? "#c45555" :
              currentPeriod.type === "evaluation" ? "#5568a8" : "#d4a23c",
            color: "#ffffff"
          }} data-testid="days-remaining-badge">
            {daysRemaining} days remaining
          </div>
        </div>
      </div>

      {/* Division Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--t-text-muted)" }}>Division:</span>
        {DIVISIONS.map(d => (
          <button key={d} onClick={() => setDivision(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              d === division ? "bg-slate-800/10 border-slate-600/30 text-slate-700" : "border-[var(--t-border)] hover:border-slate-400/40"
            }`}
            style={d !== division ? { color: "var(--t-text-muted)" } : {}}
            data-testid={`division-chip-${d}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Timeline Visual */}
      <TimelineBar periods={data.periods} division={division} />

      {/* Key NCAA Dates */}
      <div className="rounded-xl border p-4 sm:p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="key-ncaa-dates">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--t-text)" }}>
          <AlertCircle className="w-4 h-4 text-slate-600" />
          Key NCAA Dates & Deadlines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.keyDates.map((date, i) => {
            const Icon = DATE_ICONS[date.icon] || Calendar;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: "var(--t-border)", backgroundColor: "rgba(255,255,255,0.02)" }} data-testid={`key-date-${i}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${DATE_ICON_BG[date.icon] || "bg-gray-500/12"}`}>
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{date.name}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>{date.range}</p>
                  <div className="mt-1.5">
                    <StatusTag status={date.status} range={date.range} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
