import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  ChevronRight, Search, Plus, AlertTriangle,
  Clock, Activity, Archive, Sparkles,
  MapPin, Building2, User, Mail, AlertCircle, CheckCircle2
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

/* ── Board Groups Config ── */
const BOARD_GROUPS = [
  { key: "action_required", label: "Action Required", icon: AlertTriangle, dot: "bg-gray-800 dark:bg-gray-300", countBg: "bg-gray-100 dark:bg-gray-700/40", countText: "text-gray-700 dark:text-gray-300", accentBar: "bg-gray-800 dark:bg-gray-400", description: "Overdue, needs response, or stale" },
  { key: "upcoming", label: "Upcoming", icon: Clock, dot: "bg-gray-500", countBg: "bg-gray-100 dark:bg-gray-700/40", countText: "text-gray-600 dark:text-gray-400", accentBar: "bg-gray-500", description: "Follow-up due within 14 days" },
  { key: "in_progress", label: "In Progress", icon: Activity, dot: "bg-gray-400 dark:bg-gray-500", countBg: "bg-gray-100 dark:bg-gray-700/40", countText: "text-gray-600 dark:text-gray-400", accentBar: "bg-gray-400 dark:bg-gray-500", description: "Recently contacted or active conversation" },
  { key: "closed", label: "Closed", icon: Archive, dot: "bg-gray-300 dark:bg-gray-600", countBg: "bg-gray-100 dark:bg-gray-700/40", countText: "text-gray-500 dark:text-gray-500", accentBar: "bg-gray-300 dark:bg-gray-600", description: "Not a fit, committed, or archived" },
];

/* ── Group Funnel ── */
function GroupFunnel({ groupedData, onFocusGroup, activeFilter }) {
  const { counts = {}, total = 0 } = groupedData;
  return (
    <div className="flex items-center gap-1 p-1 rounded-[10px] border overflow-x-auto" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="group-funnel">
      <div
        onClick={() => onFocusGroup(null)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg justify-center cursor-pointer transition-all flex-shrink-0 ${!activeFilter ? "bg-gray-900 dark:bg-white/10" : "hover:bg-[var(--t-surface-alt)]"}`}
        data-testid="funnel-all"
      >
        <span className={`text-xs font-medium ${!activeFilter ? "text-white dark:text-gray-200" : ""}`} style={activeFilter ? { color: "var(--t-text-secondary)" } : {}}>All</span>
        <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{total}</span>
      </div>
      {BOARD_GROUPS.map((group) => {
        const count = counts[group.key] || 0;
        const isActive = activeFilter === group.key;
        return (
          <div
            key={group.key}
            onClick={() => onFocusGroup(group.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-fit justify-center cursor-pointer transition-all flex-shrink-0 ${isActive ? "ring-1 ring-pink-600 bg-pink-600/10" : "hover:bg-[var(--t-surface-alt)]"}`}
            data-testid={`funnel-${group.key}`}
          >
            <span className={`text-xs font-medium hidden sm:inline ${group.countText}`}>{group.label}</span>
            <span className="text-sm font-bold" style={{ color: "var(--t-text)" }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Program Row ── */
function ProgramRow({ p, navigate, matchScore, accentColor }) {
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
  const isOverdue = daysUntil !== null && daysUntil < 0;

  return (
    <div
      className="flex items-center gap-3 lg:gap-3.5 px-3 lg:px-4 py-2.5 lg:py-3 border-b transition-colors hover:bg-white/[0.02]"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
      data-testid={`program-row-${p.program_id}`}
    >
      {/* Accent bar */}
      <div className={`w-[3px] h-9 rounded-sm flex-shrink-0 ${accentColor}`} />

      {/* Division badge */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${divColor} text-[11px] font-bold`}>
        {p.division || "—"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => navigate(`/programs/${p.program_id}`)}
            data-testid={`program-link-${p.program_id}`}
            className="font-semibold text-[13px] leading-tight truncate transition-colors hover:text-pink-400"
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
        <div className="flex items-center gap-2.5 mt-0.5 text-[11px] flex-wrap" style={{ color: "var(--t-text-muted)" }}>
          {p.region && <span>{p.region}</span>}
          {p.conference && <span><span className="hidden sm:inline">{divFull} | </span>{p.conference}</span>}
          {p.primary_coach && (
            <span className="flex items-center gap-1">
              {p.primary_coach}
              {p.coach_email && (
                <a href={`mailto:${p.coach_email}`} className="text-pink-500 hover:text-pink-400" title={p.coach_email}>
                  <Mail className="w-3 h-3" />
                </a>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Right: status + journey */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {p.board_group === "action_required" && (() => {
          const alert = isOverdue
            ? { text: `Overdue since ${dueDateFormatted}`, color: "text-rose-400" }
            : p.recruiting_status === "Not Contacted"
            ? { text: "Not contacted yet", color: "text-rose-400" }
            : p.reply_status === "No Reply" && p.recruiting_status !== "Not Contacted"
            ? { text: "No reply yet", color: "text-amber-400" }
            : p.reply_status === "Awaiting Reply"
            ? { text: "Awaiting reply", color: "text-amber-400" }
            : { text: "Needs attention", color: "text-rose-400" };
          return <span className={`hidden sm:block text-[11px] font-medium whitespace-nowrap ${alert.color}`}>{alert.text}</span>;
        })()}
        {p.board_group === "upcoming" && p.next_action_due && (
          <span className="hidden sm:block text-[11px] font-medium text-amber-400 whitespace-nowrap">Due {dueDateFormatted}</span>
        )}
        {p.board_group === "in_progress" && (
          <span className="hidden sm:block text-[11px] font-medium text-emerald-400 whitespace-nowrap">
            {p.reply_status === "In Conversation" ? "Active conversation" : "Recently contacted"}
          </span>
        )}
        <button
          onClick={() => navigate(`/journey/${p.program_id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-pink-400 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/25 rounded-md transition-colors"
          data-testid={`view-journey-${p.program_id}`}
        >
          Journey
        </button>
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
  const [collapsed, setCollapsed] = useState({ closed: true });
  const [activeFilter, setActiveFilter] = useState(null);
  const [matchScores, setMatchScores] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.get("/match-scores").then(res => {
      if (res.data?.scores) {
        const map = {};
        res.data.scores.forEach(s => { map[s.program_id] = s; });
        setMatchScores(map);
      }
    }).catch(() => {});
  }, []);

  const focusGroup = (key) => {
    if (key === null || activeFilter === key) {
      setActiveFilter(null);
      setCollapsed({ closed: true });
    } else {
      setActiveFilter(key);
      setCollapsed({});
    }
  };

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
    <div data-testid="recruiting-board" className="space-y-4">
      {/* Group Funnel */}
      <GroupFunnel groupedData={groupedData} onFocusGroup={focusGroup} activeFilter={activeFilter} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-3" data-testid="board-filters">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
          <Input
            data-testid="board-search"
            placeholder="Search universities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border rounded-lg text-sm"
            style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          />
        </div>
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger data-testid="filter-division" className="w-28 lg:w-36 rounded-lg text-xs lg:text-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger data-testid="filter-region" className="w-28 lg:w-40 rounded-lg text-xs lg:text-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          data-testid="add-school-btn"
          onClick={() => navigate("/knowledge-base")}
          className="bg-slate-700 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all ml-auto"
        >
          <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} /> Add School
        </Button>
      </div>

      {/* Groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {BOARD_GROUPS.map((group) => {
          if (activeFilter && activeFilter !== group.key) return null;
          const groupPrograms = groups[group.key] || [];
          const isCollapsed = collapsed[group.key];
          const isEmpty = groupPrograms.length === 0;

          return (
            <div key={group.key} id={`group-${group.key}`} data-testid={`section-${group.key}`} className="pb-2">
              {/* Accordion header */}
              <button
                onClick={() => toggleSection(group.key)}
                data-testid={`toggle-${group.key}`}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 border transition-all duration-200 ${
                  !isCollapsed && !isEmpty
                    ? "rounded-t-[10px] border-b-0"
                    : "rounded-[10px]"
                }`}
                style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
              >
                <ChevronRight
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${!isCollapsed ? "rotate-90" : ""}`}
                  strokeWidth={1.5}
                />
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${group.dot}`} />
                <span className="font-semibold text-[13px]" style={{ color: isEmpty ? "var(--t-text-muted)" : "var(--t-text)" }}>
                  {group.label}
                </span>
                <span className="text-[11px] hidden sm:inline" style={{ color: "var(--t-text-muted)" }}>
                  {group.description}
                </span>
                <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isEmpty ? "bg-gray-500/15 text-gray-500" : `${group.countBg} ${group.countText}`}`}>
                  {groupPrograms.length}
                </span>
              </button>

              {/* Connected cards container */}
              {!isCollapsed && (
                <div
                  className="border border-t-0 rounded-b-[10px] overflow-hidden"
                  style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
                >
                  {isEmpty ? (
                    <div className="py-5 text-center text-xs" style={{ color: "var(--t-text-muted)" }}>
                      No programs in this group
                    </div>
                  ) : (
                    groupPrograms.map((p) => (
                      <ProgramRow
                        key={p.program_id}
                        p={p}
                        navigate={navigate}
                        matchScore={matchScores[p.program_id]}
                        accentColor={group.accentBar}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
