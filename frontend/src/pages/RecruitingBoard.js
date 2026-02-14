import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import { STATUS_GROUPS, RECRUITING_STATUSES, REPLY_STATUSES, PRIORITIES, DIVISIONS, REGIONS } from "../lib/constants";
import {
  ChevronDown, ChevronRight, Search, Plus, Target,
  Send, MessageCircle, Trophy, Archive, ExternalLink, Sparkles,
  MapPin, Building2, User, Mail
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

/* ── Visual config ── */
const DIVISION_BADGE = {
  D1: "bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100",
  D2: "bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-100",
  D3: "bg-violet-50 text-violet-700 border border-violet-200 ring-1 ring-violet-100",
  NAIA: "bg-orange-50 text-orange-700 border border-orange-200",
  JUCO: "bg-yellow-50 text-yellow-700 border border-yellow-200",
};

const PIPELINE = [
  { key: "not_contacted", label: "Not Contacted", icon: Target, color: "from-rose-500 to-pink-500", bg: "bg-rose-50 dark:bg-rose-500/15", text: "text-rose-700 dark:text-rose-400", border: "border-l-rose-500", dot: "bg-rose-400", statuses: ["Not Contacted"] },
  { key: "contacted", label: "Contacted", icon: Send, color: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-400", border: "border-l-amber-500", dot: "bg-amber-400", statuses: ["Contacted", "No Response Yet", "Video Viewed", "Applied"] },
  { key: "active", label: "Active", icon: MessageCircle, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50 dark:bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-l-blue-500", dot: "bg-blue-400", statuses: ["Some Interest", "Active Conversation", "Camp Attended"] },
  { key: "offers", label: "Offers", icon: Trophy, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-400", border: "border-l-emerald-500", dot: "bg-emerald-400", statuses: ["Offer / Commit Talk", "Offer Received", "Committed"] },
  { key: "closed", label: "Closed", icon: Archive, color: "from-gray-400 to-slate-400", bg: "bg-gray-50 dark:bg-gray-500/15", text: "text-gray-600 dark:text-gray-300", border: "border-l-gray-400", dot: "bg-gray-400", statuses: ["Not a Fit / Closed", "Not Interested"] },
];

const PRIORITY_DOT = {
  Low: "bg-gray-300",
  Medium: "bg-blue-400",
  High: "bg-orange-400",
  "Very High": "bg-red-500 animate-pulse",
};

/* ── Color maps ── */
const STATUS_COLORS = {
  "Not Contacted": { color: "text-rose-400" },
  "Contacted": { color: "text-emerald-400" },
  "No Response Yet": { color: "text-amber-400" },
  "Video Viewed": { color: "text-cyan-400" },
  "Some Interest": { color: "text-blue-400" },
  "Active Conversation": { color: "text-blue-300" },
  "Offer / Commit Talk": { color: "text-amber-300" },
  "Not a Fit / Closed": { color: "text-gray-400" },
};

const REPLY_COLORS = {
  "No Reply": { color: "text-rose-400" },
  "Awaiting Reply": { color: "text-orange-400" },
  "Reply Received": { color: "text-emerald-400" },
  "In Conversation": { color: "text-blue-400" },
};

const PRIORITY_INLINE_COLORS = {
  "Low": { color: "text-gray-400" },
  "Medium": { color: "text-blue-400" },
  "High": { color: "text-orange-400" },
  "Very High": { color: "text-red-400" },
};

const ACTION_COLORS = {
  "Send Email": { bg: "bg-sky-200", text: "text-sky-800", hover: "hover:bg-sky-300" },
  "Follow Up": { bg: "bg-violet-200", text: "text-violet-800", hover: "hover:bg-violet-300" },
  "Send Video": { bg: "bg-pink-200", text: "text-pink-800", hover: "hover:bg-pink-300" },
  "Schedule Visit": { bg: "bg-teal-200", text: "text-teal-800", hover: "hover:bg-teal-300" },
  "Application": { bg: "bg-amber-200", text: "text-amber-800", hover: "hover:bg-amber-300" },
  "Phone Call": { bg: "bg-emerald-200", text: "text-emerald-800", hover: "hover:bg-emerald-300" },
  "Other": { bg: "bg-gray-200", text: "text-gray-700", hover: "hover:bg-gray-300" },
};

function getColorMap(options) {
  if (options === RECRUITING_STATUSES) return STATUS_COLORS;
  if (options === REPLY_STATUSES) return REPLY_COLORS;
  if (options === PRIORITIES) return PRIORITY_INLINE_COLORS;
  if (options === NEXT_ACTIONS) return ACTION_COLORS;
  return null;
}


/* ── Read-only status badge ── */
function StatusBadge({ value, colorMap }) {
  const color = colorMap && value ? colorMap[value] : null;
  return (
    <span
      className={`text-[11px] font-semibold ${color ? color.color : "text-gray-500"}`}
      data-testid={`status-badge-${(value || "").replace(/\s+/g, "-").toLowerCase()}`}
    >
      {value || "—"}
    </span>
  );
}

/* ── Read-only due date badge ── */
function DueDateBadge({ value }) {
  if (!value) return <span className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>—</span>;
  const now = new Date();
  const due = new Date(value);
  const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  const formatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  let colorClass = "text-slate-300";
  if (daysUntil < 0) colorClass = "text-red-400 font-semibold";
  else if (daysUntil <= 14) colorClass = "text-orange-400 font-semibold";
  return <span className={`text-[11px] ${colorClass}`} data-testid="due-date-display">{formatted}</span>;
}

/* ── Inline editable components ── */
function InlineSelect({ value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef(null);
  const colorMap = getColorMap(options);

  React.useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const currentColor = colorMap && value ? colorMap[value] : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-all whitespace-nowrap flex items-center gap-1 ${
          currentColor
            ? `${currentColor.bg} ${currentColor.text} ${currentColor.hover} shadow-sm`
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        {value || "Select"}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""} ${currentColor ? "opacity-70" : "opacity-40"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 min-w-[190px] rounded-xl border p-3 flex flex-col gap-2 animate-in fade-in-0 zoom-in-95 duration-100" style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)", boxShadow: "var(--t-dropdown-shadow)" }}>
          <button
            type="button"
            onClick={() => { onChange(""); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs rounded-lg transition-colors border-b pb-3 mb-1"
            style={{ color: "var(--t-text-muted)", borderColor: "var(--t-border)" }}
          >
            - Clear -
          </button>
          {options.map((o) => {
            const c = colorMap ? colorMap[o] : null;
            return (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-xs font-medium rounded-lg transition-all ${
                  c
                    ? `${c.bg} ${c.text} ${c.hover}`
                    : `text-gray-700 hover:bg-gray-50 ${value === o ? "bg-gray-100 font-semibold" : ""}`
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlineDateInput({ value, onChange, style: extraStyle }) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="t-input border rounded-md px-2 py-1 text-xs focus:outline-none cursor-pointer transition-all"
      style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)", ...extraStyle }}
    />
  );
}

/* ── Add Program Dialog ── */
function AddProgramDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ university_name: "", division: "D1", conference: "", region: "" });

  const handleSubmit = async () => {
    if (!form.university_name.trim()) { toast.error("University name required"); return; }
    try {
      await api.post("/programs", form);
      toast.success("Program added to your board");
      setOpen(false);
      setForm({ university_name: "", division: "D1", conference: "", region: "" });
      onAdd();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="add-program-btn" className="bg-slate-700 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} /> Add Program
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Add New Program</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label style={{ color: "var(--t-text-secondary)" }} className="text-sm">University Name *</Label>
            <Input data-testid="add-university-name" value={form.university_name} onChange={(e) => setForm({ ...form, university_name: e.target.value })} placeholder="e.g. Stanford University" className="mt-1.5" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label style={{ color: "var(--t-text-secondary)" }} className="text-sm">Division</Label>
              <select data-testid="add-division" value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} className="w-full border rounded-md px-3 py-2 mt-1.5 text-sm focus:outline-none" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label style={{ color: "var(--t-text-secondary)" }} className="text-sm">Conference</Label>
              <Input data-testid="add-conference" value={form.conference} onChange={(e) => setForm({ ...form, conference: e.target.value })} className="mt-1.5" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />
            </div>
            <div>
              <Label style={{ color: "var(--t-text-secondary)" }} className="text-sm">Region</Label>
              <select data-testid="add-region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full border rounded-md px-3 py-2 mt-1.5 text-sm focus:outline-none" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                <option value="">Select</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <Button data-testid="submit-add-program" onClick={handleSubmit} className="w-full bg-slate-700 hover:bg-slate-800 text-white mt-2">Add to Board</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Pipeline Funnel ── */
function PipelineFunnel({ programs, onFocusSection, activeFilter }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="pipeline-funnel">
      <div
        onClick={() => onFocusSection(null)}
        className={`flex items-center gap-3 px-5 py-4 rounded-lg justify-center cursor-pointer transition-all ${!activeFilter ? "ring-1 ring-purple-500 bg-purple-500/10" : "hover:bg-[var(--t-surface-alt)]"}`}
        data-testid="funnel-all"
      >
        <span className={`text-sm font-medium ${!activeFilter ? "text-purple-400" : ""}`} style={activeFilter ? { color: "var(--t-text-secondary)" } : {}}>All</span>
        <span className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{programs.length}</span>
      </div>
      {PIPELINE.map((stage) => {
        const count = programs.filter((p) => stage.statuses.includes(p.recruiting_status)).length;
        const isActive = activeFilter === stage.key;
        return (
          <div
            key={stage.key}
            onClick={() => onFocusSection(stage.key)}
            className={`flex items-center gap-3 px-5 py-4 rounded-lg flex-1 justify-center cursor-pointer transition-all ${isActive ? "ring-1 ring-purple-500 bg-purple-500/10" : "hover:bg-[var(--t-surface-alt)]"}`}
            data-testid={`funnel-${stage.key}`}
          >
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${stage.color} flex-shrink-0`} />
            <span className="text-sm font-medium" style={{ color: "var(--t-text-secondary)" }}>{stage.label}</span>
            <span className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Program Card ── */
function ProgramCard({ p, navigate, matchScore }) {
  const divColor = {
    D1: "bg-emerald-500/20 text-emerald-400",
    D2: "bg-blue-500/20 text-blue-400",
    D3: "bg-violet-500/20 text-violet-400",
    NAIA: "bg-orange-500/20 text-orange-400",
    JUCO: "bg-yellow-500/20 text-yellow-400",
  }[p.division] || "bg-gray-500/20 text-gray-400";
  const divFull = p.division === "D1" ? "NCAA I" : p.division === "D2" ? "NCAA II" : p.division === "D3" ? "NCAA III" : p.division;

  const scoreColor = matchScore?.match_score >= 80 ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
    : matchScore?.match_score >= 60 ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
    : "text-gray-400 bg-gray-500/15 border-gray-500/30";

  const dueDateFormatted = p.next_action_due ? new Date(p.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  const daysUntil = p.next_action_due ? Math.ceil((new Date(p.next_action_due) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const dueDateColor = daysUntil !== null && daysUntil < 0 ? "text-red-400" : daysUntil !== null && daysUntil <= 14 ? "text-orange-400" : "text-slate-400";

  const statusColor = STATUS_COLORS[p.recruiting_status]?.color || "text-gray-500";
  const priorityColor = PRIORITY_INLINE_COLORS[p.priority]?.color || "text-gray-500";

  return (
    <div
      className="rounded-lg p-4 transition-all duration-200 border"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`program-row-${p.program_id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${divColor} text-xs font-bold`}>
            {p.division || "—"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/programs/${p.program_id}`)}
                data-testid={`program-link-${p.program_id}`}
                className="font-heading font-bold text-base leading-tight truncate transition-colors hover:text-purple-400"
                style={{ color: "var(--t-text)" }}
              >
                {p.university_name}
              </button>
              {matchScore && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${scoreColor}`} data-testid={`match-score-${p.program_id}`}>
                  {matchScore.match_score}%
                </span>
              )}
            </div>
            {/* School info - same as Schools page */}
            <div className="flex items-center gap-3 mt-1 text-sm flex-wrap" style={{ color: "var(--t-text-muted)" }}>
              {p.region && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {p.region}
                </span>
              )}
              {p.conference && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> {divFull} | {p.conference}
                </span>
              )}
            </div>
            {/* Coach info */}
            {p.primary_coach && (
              <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--t-text-muted)" }}>
                <User className="w-3 h-3" /> {p.primary_coach}
                {p.coach_email && (
                  <a href={`mailto:${p.coach_email}`} className="text-purple-400 hover:text-purple-300 ml-1" title={p.coach_email}>
                    <Mail className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Right side: key dates + Journey */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            onClick={() => navigate(`/journey/${p.program_id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 rounded-md transition-colors"
            data-testid={`view-journey-${p.program_id}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Journey
          </button>
          {(p.next_action_due || p.next_action) && (
            <div className="text-right">
              {p.next_action_due && (
                <div className={`flex items-center gap-1 text-[11px] font-semibold ${dueDateColor}`}>
                  <AlertCircle className="w-3 h-3" />
                  {p.next_action ? p.next_action : "Follow-up"} due {dueDateFormatted}
                </div>
              )}
              {p.next_action && !p.next_action_due && (
                <div className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                  {p.next_action}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Quick Add Row ── */
function QuickAddRow({ onAdd }) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await api.post("/programs", { university_name: name.trim() });
      toast.success(`${name.trim()} added`);
      setName("");
      onAdd();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") setName("");
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 mt-1">
      <Plus className="w-4 h-4 text-gray-300 flex-shrink-0" strokeWidth={1.5} />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (name.trim()) handleAdd(); }}
        placeholder="Add university name"
        disabled={adding}
        data-testid="quick-add-input"
        className="bg-transparent text-sm placeholder:opacity-40 focus:opacity-100 outline-none border-none w-64 py-0.5"
        style={{ color: "var(--t-text-secondary)" }}
      />
    </div>
  );
}

/* ── Main Board ── */
export default function RecruitingBoard() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [collapsed, setCollapsed] = useState({});
  const [activeFilter, setActiveFilter] = useState(null);
  const [matchScores, setMatchScores] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch match scores
  useEffect(() => {
    api.get("/match-scores").then(res => {
      if (res.data?.scores) {
        const map = {};
        res.data.scores.forEach(s => { map[s.program_id] = s; });
        setMatchScores(map);
      }
    }).catch(() => {});
  }, []);

  // Filter to show only one status section (or all)
  const focusSection = (key) => {
    if (key === null || activeFilter === key) {
      setActiveFilter(null);
      setCollapsed({});
    } else {
      setActiveFilter(key);
      setCollapsed({});
    }
  };

  // Auto-focus section from URL hash (when coming from Dashboard)
  useEffect(() => {
    if (!loading && location.hash) {
      const sectionId = location.hash.replace("#", "");
      focusSection(sectionId);
    }
  }, [loading, location.hash]);

  const fetchPrograms = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterDivision && filterDivision !== "all") params.division = filterDivision;
      if (filterRegion && filterRegion !== "all") params.region = filterRegion;
      const res = await api.get("/programs", { params });
      setPrograms(res.data);
    } catch {
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrograms(); }, [search, filterDivision, filterRegion]);

  const handleInlineUpdate = async (programId, field, value) => {
    try {
      await api.put(`/programs/${programId}`, { [field]: value });
      fetchPrograms();
    } catch {
      toast.error("Update failed");
    }
  };

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading your board...</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="recruiting-board" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <AddProgramDialog onAdd={fetchPrograms} />
      </div>

      {/* Pipeline Funnel */}
      <PipelineFunnel programs={programs} onFocusSection={focusSection} activeFilter={activeFilter} />

      {/* Divider */}
      <div className="border-t" style={{ borderColor: "var(--t-border)" }} />

      {/* Filters */}
      <div className="flex items-center gap-3 border rounded-xl p-3 shadow-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="board-filters">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
          <Input
            data-testid="board-search"
            placeholder="Search universities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border rounded-lg"
            style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          />
        </div>
        <div className="w-px h-6" style={{ backgroundColor: "var(--t-border)" }} />
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger data-testid="filter-division" className="w-36 rounded-lg" style={{ backgroundColor: "var(--t-select-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger data-testid="filter-region" className="w-40 rounded-lg" style={{ backgroundColor: "var(--t-select-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: "var(--t-border)" }} />

      {/* Sections */}
      <div>
        {PIPELINE.map((stage, stageIdx) => {
          // Hide sections not matching the active filter
          if (activeFilter && activeFilter !== stage.key) return null;

          const stagePrograms = programs.filter((p) => stage.statuses.includes(p.recruiting_status));
          const isCollapsed = collapsed[stage.key];
          const isEmpty = stagePrograms.length === 0;

          return (
            <div key={stage.key} id={`pipeline-${stage.key}`} data-testid={`section-${stage.key}`}>
              {/* Section Header — standalone divider */}
              <button
                onClick={() => toggleSection(stage.key)}
                data-testid={`toggle-${stage.key}`}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border transition-all duration-200 mb-4 ${stageIdx === 0 ? "" : "mt-14"} border-l-4 ${stage.border}`}
                style={{ backgroundColor: isEmpty ? "var(--t-surface-alt)" : "var(--t-section-bg)", borderColor: "var(--t-border)" }}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                )}
                <span className={`font-heading font-bold text-xl tracking-wide ${isEmpty ? "" : stage.text}`} style={{ color: isEmpty ? "var(--t-text-muted)" : undefined }}>
                  {stage.label === "Not Contacted" ? "Active - Not Contacted" :
                   stage.label === "Contacted" ? "Contacted - Awaiting Reply" :
                   stage.label === "Active" ? "Active Conversations" :
                   stage.label === "Offers" ? "Offers / Serious Interest" :
                   "Closed / Archived"}
                </span>
                <Badge className={`ml-auto ${isEmpty ? "bg-gray-100 text-gray-400" : `${stage.bg} ${stage.text}`} text-xs px-2 py-0.5 font-bold`}>
                  {stagePrograms.length}
                </Badge>
              </button>

              {/* Column headers + rows — separate from the section header */}
              {!isCollapsed && (
                <>
                  {isEmpty ? (
                    <div className="py-4 text-center text-xs" style={{ color: "var(--t-text-muted)" }}>No programs in this stage</div>
                  ) : (
                    <div className="space-y-2">
                      {stagePrograms.map((p) => (
                        <ProgramCard
                          key={p.program_id}
                          p={p}
                          navigate={navigate}
                          matchScore={matchScores[p.program_id]}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
