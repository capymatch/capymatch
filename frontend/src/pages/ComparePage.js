import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import {
  ArrowLeft, Plus, X, Target, Send, Clock, MessageSquare, Archive,
  AlertTriangle, CheckCircle2, Search, GitCompare
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

const RAIL_STAGES = [
  { key: "added", label: "Added" },
  { key: "outreach", label: "Outreach" },
  { key: "in_conversation", label: "Replied" },
  { key: "campus_visit", label: "Visit" },
  { key: "offer", label: "Offer" },
  { key: "committed", label: "Committed" },
];

const STAGE_LABELS = {
  overdue: { label: "Overdue", color: "text-teal-600" },
  needs_outreach: { label: "Needs Outreach", color: "text-amber-400" },
  waiting_on_reply: { label: "Waiting on Reply", color: "text-blue-400" },
  in_conversation: { label: "In Conversation", color: "text-teal-600" },
  archived: { label: "Archived", color: "text-gray-400" },
};

const PULSE_LABELS = {
  active: { label: "Active", color: "text-teal-600", dot: "bg-slate-500" },
  cooling: { label: "Cooling", color: "text-amber-400", dot: "bg-amber-500" },
  cold: { label: "Going Cold", color: "text-teal-600", dot: "bg-slate-500" },
  neutral: { label: "New", color: "text-gray-400", dot: "bg-gray-500" },
};

function MiniRail({ rail }) {
  if (!rail) return null;
  const stages = rail.stages || {};
  const active = rail.active;
  return (
    <div className="flex items-center gap-0.5">
      {RAIL_STAGES.map((s) => (
        <div key={s.key} className={`w-2 h-2 rounded-full ${
          s.key === active ? "bg-slate-500 shadow-[0_0_6px_rgba(46,196,182,0.5)]"
          : stages[s.key] ? "bg-slate-500/60" : "bg-[var(--t-border)]"
        }`} title={s.label} />
      ))}
    </div>
  );
}

function CompareCard({ program, isCurrent, onRemove }) {
  const navigate = useNavigate();
  const signals = program.signals || {};
  const rail = program.journey_rail;
  const pulse = PULSE_LABELS[rail?.pulse] || PULSE_LABELS.neutral;
  const stage = STAGE_LABELS[program.board_group] || STAGE_LABELS.needs_outreach;

  const rows = [
    { label: "Match Score", value: program.match_score ? `${program.match_score}%` : "—", color: program.match_score >= 80 ? "text-teal-600" : program.match_score >= 60 ? "text-amber-400" : "text-gray-400" },
    { label: "Stage", value: stage.label, color: stage.color },
    { label: "Interactions", value: signals.total_interactions || 0 },
    { label: "Coach Reply", value: signals.has_coach_reply ? `Yes (${signals.days_since_reply}d ago)` : "—", color: signals.has_coach_reply ? "text-teal-600" : "text-gray-500" },
    { label: "Last Contact", value: signals.days_since_activity !== null ? `${signals.days_since_activity}d ago` : "Never" },
    { label: "Primary Coach", value: program.primary_coach || "—" },
    { label: "Priority", value: program.priority || "Medium" },
  ];

  return (
    <div className={`rounded-2xl border p-5 relative ${isCurrent ? "border-slate-500/40 shadow-[0_0_20px_rgba(46,196,182,0.08)]" : ""}`}
      style={{ backgroundColor: "var(--t-surface)", borderColor: isCurrent ? undefined : "var(--t-border)" }}
      data-testid={`compare-card-${program.program_id}`}>
      {isCurrent && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-500 text-white">Current</div>
      )}
      <button onClick={onRemove} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-[var(--t-surface-alt)]" data-testid={`remove-compare-${program.program_id}`}>
        <X className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
      </button>

      <div className="text-center mb-4">
        <button onClick={() => navigate(`/journey/${program.program_id}`)} className="hover:underline">
          <h3 className="text-base font-bold" style={{ color: "var(--t-text)" }}>{program.university_name}</h3>
        </button>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>{program.division} · {program.conference || "—"} · {program.region || "—"}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="relative flex h-2 w-2"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${pulse.dot}`} /><span className={`relative inline-flex rounded-full h-2 w-2 ${pulse.dot}`} /></span>
          <span className={`text-[10px] font-semibold ${pulse.color}`}>{pulse.label}</span>
        </div>
        <div className="flex justify-center mt-2"><MiniRail rail={rail} /></div>
      </div>

      <div className="space-y-0">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between py-2 border-t" style={{ borderColor: "var(--t-border)" }}>
            <span className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{r.label}</span>
            <span className={`text-xs font-semibold ${r.color || ""}`} style={r.color ? {} : { color: "var(--t-text)" }}>{r.value}</span>
          </div>
        ))}
      </div>

      <Button className="w-full mt-4 bg-teal-700 hover:bg-teal-800 text-white text-xs h-8" onClick={() => navigate(`/journey/${program.program_id}`)}
        data-testid={`view-journey-${program.program_id}`}>
        View Journey
      </Button>
    </div>
  );
}

export default function ComparePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSelected = searchParams.get("selected") || "";

  const [allPrograms, setAllPrograms] = useState([]);
  const [selectedIds, setSelectedIds] = useState(initialSelected ? [initialSelected] : []);
  const [compareData, setCompareData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Fetch all programs for selection
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/programs");
        setAllPrograms(res.data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  // Fetch comparison data when selection changes
  const fetchCompare = useCallback(async () => {
    if (selectedIds.length === 0) { setCompareData([]); return; }
    try {
      const res = await api.post("/programs/compare", { program_ids: selectedIds });
      setCompareData(res.data || []);
    } catch {}
  }, [selectedIds]);

  useEffect(() => { fetchCompare(); }, [fetchCompare]);

  const addSchool = (id) => {
    if (selectedIds.includes(id) || selectedIds.length >= 5) return;
    setSelectedIds(prev => [...prev, id]);
  };

  const removeSchool = (id) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const available = allPrograms.filter(p =>
    !selectedIds.includes(p.program_id) &&
    (search === "" || p.university_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5" data-testid="compare-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-[var(--t-surface-alt)]" style={{ color: "var(--t-text-muted)" }} data-testid="compare-back-btn">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Compare Schools</h1>
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Select up to 5 schools to compare side by side</p>
        </div>
      </div>

      {/* School Selector */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="school-selector">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selected pills */}
          {selectedIds.map(id => {
            const p = allPrograms.find(x => x.program_id === id);
            return p ? (
              <span key={id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-600/10 text-slate-500 border border-teal-600/20">
                {p.university_name}
                <button onClick={() => removeSchool(id)} className="hover:text-slate-300"><X className="w-3 h-3" /></button>
              </span>
            ) : null;
          })}
          {/* Add button / search */}
          {selectedIds.length < 5 && (
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
              <Input placeholder="Search schools to add..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs" style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                data-testid="compare-search-input" />
              {search && available.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-xl max-h-48 overflow-auto" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                  {available.slice(0, 8).map(p => (
                    <button key={p.program_id} onClick={() => { addSchool(p.program_id); setSearch(""); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--t-surface-alt)] flex items-center justify-between"
                      style={{ color: "var(--t-text-secondary)" }} data-testid={`add-compare-${p.program_id}`}>
                      <span>{p.university_name}</span>
                      <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{p.division}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comparison Grid */}
      {compareData.length > 0 ? (
        <div className={`grid gap-5 ${
          compareData.length === 1 ? "grid-cols-1 max-w-md mx-auto"
          : compareData.length === 2 ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}>
          {compareData.map(p => (
            <CompareCard key={p.program_id} program={p}
              isCurrent={p.program_id === initialSelected}
              onRemove={() => removeSchool(p.program_id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border p-12 text-center" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: "var(--t-text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--t-text-muted)" }}>Select schools above to start comparing</p>
          <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>Compare match scores, coach responses, and recruiting progress</p>
        </div>
      )}
    </div>
  );
}
