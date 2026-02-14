import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  ChevronDown, ChevronRight, Search, Plus, AlertTriangle,
  Clock, Activity, Archive, Sparkles,
  MapPin, Building2, User, Mail, AlertCircle, CheckCircle2
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

/* ── New Dynamic Board Groups ── */
const BOARD_GROUPS = [
  { 
    key: "action_required", 
    label: "Action Required", 
    icon: AlertTriangle, 
    color: "from-rose-500 to-red-500", 
    bg: "bg-rose-50 dark:bg-rose-500/15", 
    text: "text-rose-700 dark:text-rose-400", 
    border: "border-l-rose-500",
    description: "Overdue, needs response, or stale"
  },
  { 
    key: "upcoming", 
    label: "Upcoming", 
    icon: Clock, 
    color: "from-amber-500 to-orange-500", 
    bg: "bg-amber-50 dark:bg-amber-500/15", 
    text: "text-amber-700 dark:text-amber-400", 
    border: "border-l-amber-500",
    description: "Follow-up due within 14 days"
  },
  { 
    key: "in_progress", 
    label: "In Progress", 
    icon: Activity, 
    color: "from-emerald-500 to-teal-500", 
    bg: "bg-emerald-50 dark:bg-emerald-500/15", 
    text: "text-emerald-700 dark:text-emerald-400", 
    border: "border-l-emerald-500",
    description: "Recently contacted or active conversation"
  },
  { 
    key: "closed", 
    label: "Closed", 
    icon: Archive, 
    color: "from-gray-400 to-slate-400", 
    bg: "bg-gray-50 dark:bg-gray-500/15", 
    text: "text-gray-600 dark:text-gray-300", 
    border: "border-l-gray-400",
    description: "Not a fit, committed, or archived"
  },
];

/* ── Visual config ── */
const DIVISION_BADGE = {
  D1: "bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100",
  D2: "bg-blue-50 text-blue-700 border border-blue-200 ring-1 ring-blue-100",
  D3: "bg-violet-50 text-violet-700 border border-violet-200 ring-1 ring-violet-100",
  NAIA: "bg-orange-50 text-orange-700 border border-orange-200",
  JUCO: "bg-yellow-50 text-yellow-700 border border-yellow-200",
};

/* ── Color maps ── */
const STATUS_COLORS = {
  "Not Contacted": { color: "text-rose-400" },
  "Contacted": { color: "text-emerald-400" },
  "No Response Yet": { color: "text-amber-400" },
  "Video Viewed": { color: "text-cyan-400" },
  "Some Interest": { color: "text-blue-400" },
  "Active Conversation": { color: "text-blue-300" },
  "Offer Received": { color: "text-amber-300" },
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

/* ── Group Funnel Summary ── */
function GroupFunnel({ groupedData, onFocusGroup, activeFilter }) {
  const { counts = {}, total = 0 } = groupedData;
  
  return (
    <div className="flex items-center gap-1 lg:gap-1.5 p-1.5 rounded-lg border overflow-x-auto" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="group-funnel">
      <div
        onClick={() => onFocusGroup(null)}
        className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-2 rounded-md justify-center cursor-pointer transition-all flex-shrink-0 ${!activeFilter ? "ring-1 ring-pink-600 bg-pink-600/10" : "hover:bg-[var(--t-surface-alt)]"}`}
        data-testid="funnel-all"
      >
        <span className={`text-xs font-medium ${!activeFilter ? "text-pink-500" : ""}`} style={activeFilter ? { color: "var(--t-text-secondary)" } : {}}>All</span>
        <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{total}</span>
      </div>
      {BOARD_GROUPS.map((group) => {
        const count = counts[group.key] || 0;
        const isActive = activeFilter === group.key;
        const Icon = group.icon;
        return (
          <div
            key={group.key}
            onClick={() => onFocusGroup(group.key)}
            className={`flex items-center gap-1.5 lg:gap-2 px-2.5 lg:px-3 py-2 rounded-md flex-1 min-w-fit justify-center cursor-pointer transition-all flex-shrink-0 ${isActive ? "ring-1 ring-pink-600 bg-pink-600/10" : "hover:bg-[var(--t-surface-alt)]"}`}
            data-testid={`funnel-${group.key}`}
          >
            <Icon className={`w-3.5 h-3.5 ${group.text}`} />
            <span className="text-xs font-medium hidden sm:inline" style={{ color: "var(--t-text-secondary)" }}>{group.label}</span>
            <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{count}</span>
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

  // Due date logic
  const dueDateFormatted = p.next_action_due ? new Date(p.next_action_due).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;
  const daysUntil = p.next_action_due ? Math.ceil((new Date(p.next_action_due) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 14;

  return (
    <div
      className="rounded-lg p-3 lg:p-4 mb-3 lg:mb-4 transition-all duration-200 border"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`program-row-${p.program_id}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 lg:gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${divColor} text-xs font-bold`}>
            {p.division || "—"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(`/programs/${p.program_id}`)}
                data-testid={`program-link-${p.program_id}`}
                className="font-heading font-bold text-sm lg:text-base leading-tight truncate transition-colors hover:text-pink-500"
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
            {/* School info */}
            <div className="flex items-center gap-2 lg:gap-3 mt-1 text-xs lg:text-sm flex-wrap" style={{ color: "var(--t-text-muted)" }}>
              {p.region && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> {p.region}
                </span>
              )}
              {p.conference && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> <span className="hidden sm:inline">{divFull} |</span> {p.conference}
                </span>
              )}
            </div>
            {/* Coach info */}
            {p.primary_coach && (
              <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--t-text-muted)" }}>
                <User className="w-3 h-3" /> {p.primary_coach}
                {p.coach_email && (
                  <a href={`mailto:${p.coach_email}`} className="text-pink-500 hover:text-pink-400 ml-1" title={p.coach_email}>
                    <Mail className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Right side: inline alert + Journey button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Contextual alert inline */}
          {p.board_group === "action_required" && (() => {
            const alert = isOverdue
              ? { text: `Overdue since ${dueDateFormatted}`, color: "text-rose-400", Icon: AlertCircle }
              : p.recruiting_status === "Not Contacted"
              ? { text: "Not contacted yet", color: "text-rose-400", Icon: AlertCircle }
              : p.reply_status === "No Reply" && p.recruiting_status !== "Not Contacted"
              ? { text: "No reply yet", color: "text-amber-400", Icon: Clock }
              : p.reply_status === "Awaiting Reply"
              ? { text: "Awaiting reply", color: "text-amber-400", Icon: Clock }
              : { text: "Needs attention", color: "text-rose-400", Icon: AlertCircle };
            return (
              <div className="hidden sm:flex items-center gap-1.5">
                <alert.Icon className={`w-3 h-3 ${alert.color}`} />
                <span className={`text-[11px] font-medium ${alert.color} whitespace-nowrap`}>{alert.text}</span>
              </div>
            );
          })()}
          {p.board_group === "upcoming" && p.next_action_due && (
            <div className="hidden sm:flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-medium text-amber-400 whitespace-nowrap">Due {dueDateFormatted}</span>
            </div>
          )}
          {p.board_group === "in_progress" && (
            <div className="hidden sm:flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-400 whitespace-nowrap">
                {p.reply_status === "In Conversation" ? "Active conversation" : "Recently contacted"}
              </span>
            </div>
          )}
          <button
            onClick={() => navigate(`/journey/${p.program_id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-400 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/25 rounded-md transition-colors"
            data-testid={`view-journey-${p.program_id}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Journey
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Board ── */
export default function RecruitingBoard() {
  const [groupedData, setGroupedData] = useState({ groups: {}, counts: {}, total: 0 });
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

  // Focus on a specific group
  const focusGroup = (key) => {
    if (key === null || activeFilter === key) {
      setActiveFilter(null);
      setCollapsed({});
    } else {
      setActiveFilter(key);
      setCollapsed({});
    }
  };

  // Auto-focus group from URL hash
  useEffect(() => {
    if (!loading && location.hash) {
      const groupId = location.hash.replace("#", "");
      focusGroup(groupId);
    }
  }, [loading, location.hash]);

  const fetchPrograms = async () => {
    try {
      const params = { grouped: true };
      if (search) params.search = search;
      if (filterDivision && filterDivision !== "all") params.division = filterDivision;
      if (filterRegion && filterRegion !== "all") params.region = filterRegion;
      const res = await api.get("/programs", { params });
      setGroupedData(res.data);
    } catch {
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrograms(); }, [search, filterDivision, filterRegion]);

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

  const { groups = {} } = groupedData;

  return (
    <div data-testid="recruiting-board" className="space-y-6">
      {/* Group Funnel */}
      <GroupFunnel groupedData={groupedData} onFocusGroup={focusGroup} activeFilter={activeFilter} />

      {/* Divider */}
      <div className="border-t" style={{ borderColor: "var(--t-border)" }} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-3 border rounded-xl p-2 lg:p-3 shadow-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="board-filters">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
          <Input
            data-testid="board-search"
            placeholder="Search universities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border rounded-lg text-sm"
            style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          />
        </div>
        <div className="hidden lg:block w-px h-6" style={{ backgroundColor: "var(--t-border)" }} />
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger data-testid="filter-division" className="w-28 lg:w-36 rounded-lg text-xs lg:text-sm" style={{ backgroundColor: "var(--t-select-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger data-testid="filter-region" className="w-28 lg:w-40 rounded-lg text-xs lg:text-sm" style={{ backgroundColor: "var(--t-select-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <AddProgramDialog onAdd={fetchPrograms} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: "var(--t-border)" }} />

      {/* Groups */}
      <div>
        {BOARD_GROUPS.map((group, groupIdx) => {
          // Hide groups not matching the active filter
          if (activeFilter && activeFilter !== group.key) return null;

          const groupPrograms = groups[group.key] || [];
          const isCollapsed = collapsed[group.key];
          const isEmpty = groupPrograms.length === 0;
          const Icon = group.icon;

          return (
            <div key={group.key} id={`group-${group.key}`} data-testid={`section-${group.key}`}>
              {/* Section Header */}
              <button
                onClick={() => toggleSection(group.key)}
                data-testid={`toggle-${group.key}`}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg border transition-all duration-200 mb-3 ${groupIdx === 0 ? "" : "mt-10"} border-l-4 ${group.border}`}
                style={{ backgroundColor: isEmpty ? "var(--t-surface-alt)" : "var(--t-section-bg)", borderColor: "var(--t-border)" }}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                )}
                <Icon className={`w-4.5 h-4.5 ${isEmpty ? "text-gray-400" : group.text}`} />
                <div className="flex flex-col items-start">
                  <span className={`font-heading font-semibold text-base tracking-wide ${isEmpty ? "" : group.text}`} style={{ color: isEmpty ? "var(--t-text-muted)" : undefined }}>
                    {group.label}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{group.description}</span>
                </div>
                <Badge className={`ml-auto ${isEmpty ? "bg-gray-100 text-gray-400" : `${group.bg} ${group.text}`} text-xs px-2 py-0.5 font-bold`}>
                  {groupPrograms.length}
                </Badge>
              </button>

              {/* Programs in this group */}
              {!isCollapsed && (
                <>
                  {isEmpty ? (
                    <div className="py-4 text-center text-xs" style={{ color: "var(--t-text-muted)" }}>
                      No programs in this group
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {groupPrograms.map((p) => (
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
