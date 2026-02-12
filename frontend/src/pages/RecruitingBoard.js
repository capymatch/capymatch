import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { STATUS_GROUPS, RECRUITING_STATUSES, REPLY_STATUSES, PRIORITIES, NEXT_ACTIONS, DIVISIONS, REGIONS } from "../lib/constants";
import {
  ChevronDown, ChevronRight, Search, Filter, ExternalLink, Plus, Target,
  Send, MessageCircle, Trophy, Archive, Circle, ArrowRight, Sparkles
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
  { key: "not_contacted", label: "Not Contacted", icon: Target, color: "from-rose-500 to-pink-500", bg: "bg-rose-50", text: "text-rose-700", border: "border-l-rose-500", dot: "bg-rose-400", statuses: ["Not Contacted"] },
  { key: "contacted", label: "Contacted", icon: Send, color: "from-amber-500 to-orange-500", bg: "bg-amber-50", text: "text-amber-700", border: "border-l-amber-500", dot: "bg-amber-400", statuses: ["Contacted", "No Response Yet", "Video Viewed"] },
  { key: "active", label: "Active", icon: MessageCircle, color: "from-blue-500 to-cyan-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-l-blue-500", dot: "bg-blue-400", statuses: ["Some Interest", "Active Conversation"] },
  { key: "offers", label: "Offers", icon: Trophy, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-l-emerald-500", dot: "bg-emerald-400", statuses: ["Offer / Commit Talk"] },
  { key: "closed", label: "Closed", icon: Archive, color: "from-gray-400 to-slate-400", bg: "bg-gray-50", text: "text-gray-600", border: "border-l-gray-400", dot: "bg-gray-400", statuses: ["Not a Fit / Closed"] },
];

const PRIORITY_DOT = {
  Low: "bg-gray-300",
  Medium: "bg-blue-400",
  High: "bg-orange-400",
  "Very High": "bg-red-500 animate-pulse",
};

/* ── Color maps ── */
const STATUS_COLORS = {
  "Not Contacted": { bg: "bg-rose-400", text: "text-white", hover: "hover:bg-rose-500" },
  "Contacted": { bg: "bg-emerald-400", text: "text-white", hover: "hover:bg-emerald-500" },
  "No Response Yet": { bg: "bg-amber-400", text: "text-white", hover: "hover:bg-amber-500" },
  "Video Viewed": { bg: "bg-cyan-400", text: "text-white", hover: "hover:bg-cyan-500" },
  "Some Interest": { bg: "bg-blue-400", text: "text-white", hover: "hover:bg-blue-500" },
  "Active Conversation": { bg: "bg-blue-500", text: "text-white", hover: "hover:bg-blue-600" },
  "Offer / Commit Talk": { bg: "bg-amber-500", text: "text-white", hover: "hover:bg-amber-600" },
  "Not a Fit / Closed": { bg: "bg-gray-400", text: "text-white", hover: "hover:bg-gray-500" },
};

const REPLY_COLORS = {
  "No Reply": { bg: "bg-rose-300", text: "text-white", hover: "hover:bg-rose-400" },
  "Awaiting Reply": { bg: "bg-orange-400", text: "text-white", hover: "hover:bg-orange-500" },
  "Reply Received": { bg: "bg-emerald-500", text: "text-white", hover: "hover:bg-emerald-600" },
};

const PRIORITY_INLINE_COLORS = {
  "Low": { bg: "bg-gray-200", text: "text-gray-700", hover: "hover:bg-gray-300" },
  "Medium": { bg: "bg-blue-200", text: "text-blue-800", hover: "hover:bg-blue-300" },
  "High": { bg: "bg-orange-300", text: "text-orange-900", hover: "hover:bg-orange-400" },
  "Very High": { bg: "bg-red-400", text: "text-white", hover: "hover:bg-red-500" },
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
        <div className="absolute z-50 mt-1 left-0 min-w-[160px] rounded-lg border py-1 animate-in fade-in-0 zoom-in-95 duration-100" style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)", boxShadow: "var(--t-dropdown-shadow)" }}>
          <button
            type="button"
            onClick={() => { onChange(""); setIsOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs transition-colors"
            style={{ color: "var(--t-text-muted)" }}
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
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-all ${
                  c
                    ? `${c.bg} ${c.text} ${c.hover} mx-1 my-0.5 rounded-md`
                    : `text-gray-700 hover:bg-gray-50 ${value === o ? "bg-gray-100 font-semibold" : ""}`
                }`}
                style={c ? { width: "calc(100% - 8px)" } : undefined}
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

function InlineDateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="t-input border rounded-md px-2 py-1 text-xs focus:outline-none cursor-pointer transition-all"
      style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
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
        <Button data-testid="add-program-btn" className="bg-slate-700 hover:bg-slate-800 text-white shadow-md shadow-slate-200 hover:shadow-lg hover:shadow-slate-200 transition-all">
          <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} /> Add Program
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Add New Program</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-gray-600 text-sm">University Name *</Label>
            <Input data-testid="add-university-name" value={form.university_name} onChange={(e) => setForm({ ...form, university_name: e.target.value })} placeholder="e.g. Stanford University" className="bg-white border-gray-300 text-gray-900 mt-1.5" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-600 text-sm">Division</Label>
              <select data-testid="add-division" value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} className="w-full bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 mt-1.5 text-sm focus:border-purple-400 focus:outline-none">
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-gray-600 text-sm">Conference</Label>
              <Input data-testid="add-conference" value={form.conference} onChange={(e) => setForm({ ...form, conference: e.target.value })} className="bg-white border-gray-300 text-gray-900 mt-1.5" />
            </div>
            <div>
              <Label className="text-gray-600 text-sm">Region</Label>
              <select data-testid="add-region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 mt-1.5 text-sm focus:border-purple-400 focus:outline-none">
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
function PipelineFunnel({ programs }) {
  const total = programs.length;
  return (
    <div className="grid grid-cols-5 gap-3" data-testid="pipeline-funnel">
      {PIPELINE.map((stage, i) => {
        const count = programs.filter((p) => stage.statuses.includes(p.recruiting_status)).length;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div
            key={stage.key}
            className={`relative p-4 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden`}
            style={{ backgroundColor: "var(--t-funnel-bg)", borderColor: "var(--t-border)" }}
            data-testid={`funnel-${stage.key}`}
          >
            {/* Top gradient bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stage.color}`} />
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${stage.bg} flex items-center justify-center`}>
                <stage.icon className={`w-4 h-4 ${stage.text}`} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider leading-tight" style={{ color: "var(--t-text-secondary)" }}>{stage.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-heading text-3xl font-black" style={{ color: "var(--t-text)" }}>{count}</span>
              {total > 0 && <span className="text-[11px] mb-1" style={{ color: "var(--t-text-muted)" }}>{pct}%</span>}
            </div>
            {/* Mini bar */}
            <div className="mt-2 w-full rounded-full h-1.5" style={{ backgroundColor: "var(--t-border)" }}>
              <div className={`h-1.5 rounded-full bg-gradient-to-r ${stage.color} transition-all duration-700`} style={{ width: `${Math.max(pct, 2)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Program Row ── */
function ProgramRow({ p, navigate, handleInlineUpdate }) {
  return (
    <div
      className="group grid grid-cols-[1.8fr_0.5fr_1fr_0.8fr_1.2fr_1fr_1.2fr_1fr_1fr_0.8fr_0.5fr] gap-1 items-center px-4 py-3 bg-white border border-gray-100 rounded-lg mb-1.5 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-default"
      data-testid={`program-row-${p.program_id}`}
    >
      {/* University Name */}
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${PRIORITY_DOT[p.priority] || "bg-gray-200"}`} />
        <div className="min-w-0">
          <button
            onClick={() => navigate(`/programs/${p.program_id}`)}
            data-testid={`program-link-${p.program_id}`}
            className="text-gray-900 hover:text-slate-600 font-semibold text-sm truncate block transition-colors"
          >
            {p.university_name}
          </button>
          <span className="text-[11px] text-gray-400">{p.mascot}</span>
        </div>
      </div>

      {/* Division */}
      <div>
        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${DIVISION_BADGE[p.division] || "bg-gray-100 text-gray-600"}`}>
          {p.division}
        </span>
      </div>

      {/* Conference + Region */}
      <div className="text-xs text-gray-500 truncate">
        {p.conference}
        {p.region && <span className="text-gray-300 mx-1">/</span>}
        <span className="text-gray-400">{p.region}</span>
      </div>

      {/* Coach */}
      <div className="text-xs text-gray-600 truncate">
        {p.primary_coach || <span className="text-gray-300 italic">No coach</span>}
      </div>

      {/* Status */}
      <div>
        <InlineSelect value={p.recruiting_status} options={RECRUITING_STATUSES} onChange={(v) => handleInlineUpdate(p.program_id, "recruiting_status", v)} />
      </div>

      {/* Initial Contact */}
      <div>
        <InlineDateInput value={p.initial_contact_sent} onChange={(v) => handleInlineUpdate(p.program_id, "initial_contact_sent", v)} />
      </div>

      {/* Reply */}
      <div>
        <InlineSelect value={p.reply_status} options={REPLY_STATUSES} onChange={(v) => handleInlineUpdate(p.program_id, "reply_status", v)} />
      </div>

      {/* Next Action */}
      <div>
        <InlineSelect value={p.next_action} options={NEXT_ACTIONS} onChange={(v) => handleInlineUpdate(p.program_id, "next_action", v)} />
      </div>

      {/* Due Date */}
      <div>
        <InlineDateInput value={p.next_action_due} onChange={(v) => handleInlineUpdate(p.program_id, "next_action_due", v)} />
      </div>

      {/* Priority */}
      <div>
        <InlineSelect value={p.priority} options={PRIORITIES} onChange={(v) => handleInlineUpdate(p.program_id, "priority", v)} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {p.website && (
          <a href={p.website} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-slate-600 rounded transition-colors">
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
          </a>
        )}
        <button
          onClick={() => navigate(`/programs/${p.program_id}`)}
          className="p-1 text-gray-400 hover:text-slate-600 rounded transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

/* ── Column Headers ── */
function ColumnHeaders() {
  const cols = ["University", "Div", "Conference / Region", "Coach", "Status", "Contact Sent", "Reply", "Next Action", "Due Date", "Priority", ""];
  return (
    <div className="grid grid-cols-[1.8fr_0.5fr_1fr_0.8fr_1.2fr_1fr_1.2fr_1fr_1fr_0.8fr_0.5fr] gap-1 items-center px-4 py-3 mb-2 bg-gray-50/80 border border-gray-200 rounded-lg">
      {cols.map((col, i) => (
        <span key={i} className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{col}</span>
      ))}
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
        className="bg-transparent text-sm text-gray-500 placeholder:text-gray-300 focus:text-gray-800 outline-none border-none w-64 py-0.5"
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
  const navigate = useNavigate();

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-3xl font-black text-gray-900 tracking-tight" data-testid="board-title">
            Recruiting Board
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">{programs.length} programs across your pipeline</p>
        </div>
        <AddProgramDialog onAdd={fetchPrograms} />
      </div>

      {/* Pipeline Funnel */}
      <PipelineFunnel programs={programs} />

      {/* Filters */}
      <div className="flex items-center gap-3 border rounded-xl p-3 shadow-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="board-filters">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            data-testid="board-search"
            placeholder="Search universities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border rounded-lg"
            style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          />
        </div>
        <div className="w-px h-6 bg-gray-200" />
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger data-testid="filter-division" className="w-36 bg-gray-50 border-gray-200 text-gray-700 rounded-lg">
            <Filter className="w-3 h-3 mr-1.5 text-gray-400" /><SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger data-testid="filter-region" className="w-40 bg-gray-50 border-gray-200 text-gray-700 rounded-lg">
            <Filter className="w-3 h-3 mr-1.5 text-gray-400" /><SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Sections */}
      <div>
        {PIPELINE.map((stage, stageIdx) => {
          const stagePrograms = programs.filter((p) => stage.statuses.includes(p.recruiting_status));
          const isCollapsed = collapsed[stage.key];
          const isEmpty = stagePrograms.length === 0;

          return (
            <div key={stage.key} data-testid={`section-${stage.key}`}>
              {/* Section Header — standalone divider */}
              <button
                onClick={() => toggleSection(stage.key)}
                data-testid={`toggle-${stage.key}`}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl border transition-all duration-200 mb-4 ${stageIdx === 0 ? "" : "mt-14"} ${
                  isEmpty
                    ? "bg-gray-50/80 border-gray-100 hover:bg-gray-50"
                    : "bg-white border-gray-100 hover:shadow-sm shadow-sm"
                } border-l-4 ${stage.border}`}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                )}
                <div className={`w-7 h-7 rounded-lg ${stage.bg} flex items-center justify-center`}>
                  <stage.icon className={`w-3.5 h-3.5 ${stage.text}`} strokeWidth={1.5} />
                </div>
                <span className={`font-heading font-bold text-sm tracking-wide ${isEmpty ? "text-gray-400" : "text-gray-800"}`}>
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
                    <div className="py-4">
                      <QuickAddRow onAdd={fetchPrograms} />
                    </div>
                  ) : (
                    <>
                      <ColumnHeaders />
                      <div className="space-y-1.5">
                        {stagePrograms.map((p) => (
                          <ProgramRow
                            key={p.program_id}
                            p={p}
                            navigate={navigate}
                            handleInlineUpdate={handleInlineUpdate}
                          />
                        ))}
                      </div>
                      <QuickAddRow onAdd={fetchPrograms} />
                    </>
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
