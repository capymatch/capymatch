import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  ChevronRight, Search, Plus, AlertTriangle,
  Clock, MessageSquare, Archive, Sparkles, Zap,
  MapPin, Building2, User, Mail, AlertCircle, CheckCircle2, Send
} from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

/* ── Board Groups Config (5-stage funnel) ── */
const BOARD_GROUPS = [
  { key: "overdue", label: "Overdue", icon: AlertTriangle, dot: "bg-rose-500", countBg: "bg-rose-500/15", countText: "text-rose-400", accentBar: "bg-rose-500", description: "Follow-up date has passed — handle these first" },
  { key: "needs_outreach", label: "Needs Outreach", icon: Send, dot: "bg-amber-500", countBg: "bg-amber-500/15", countText: "text-amber-400", accentBar: "bg-amber-500", description: "Haven't contacted yet" },
  { key: "waiting_on_reply", label: "Waiting on Reply", icon: Clock, dot: "bg-blue-500", countBg: "bg-blue-500/15", countText: "text-blue-400", accentBar: "bg-blue-500", description: "Reached out, waiting to hear back" },
  { key: "in_conversation", label: "In Conversation", icon: MessageSquare, dot: "bg-emerald-500", countBg: "bg-emerald-500/15", countText: "text-emerald-400", accentBar: "bg-emerald-500", description: "Coach has responded" },
  { key: "archived", label: "Archived", icon: Archive, dot: "bg-gray-500", countBg: "bg-gray-500/15", countText: "text-gray-400", accentBar: "bg-gray-500", description: "Not pursuing" },
];

/* ── Group Funnel ── */
function GroupFunnel({ groupedData, onFocusGroup, activeFilter }) {
  const { counts = {}, total = 0 } = groupedData;
  return (
    <div className="flex items-center gap-1 p-1 rounded-[10px] border overflow-x-auto" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="group-funnel">
      <div
        onClick={() => onFocusGroup(null)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg justify-center cursor-pointer transition-all flex-shrink-0 ${!activeFilter ? "ring-1 ring-pink-600 bg-pink-600/10" : "hover:bg-[var(--t-surface-alt)]"}`}
        data-testid="funnel-all"
      >
        <span className={`text-xs font-medium ${!activeFilter ? "text-pink-500" : ""}`} style={activeFilter ? { color: "var(--t-text-secondary)" } : {}}>All</span>
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
function ProgramRow({ p, navigate, matchScore, accentColor, groupKey }) {
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

  // Compute next step from data-driven signals
  const signals = p.signals || {};
  const nextStep = (() => {
    // Priority 1: Overdue follow-up
    if (p.next_action_due && daysUntil !== null && daysUntil < 0) {
      return { title: `Follow-up is ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`, sub: "Send your follow-up email now", urgent: true };
    }
    // Priority 2: Upcoming follow-up
    if (p.next_action_due && daysUntil !== null && daysUntil <= 7) {
      return { title: `Follow-up due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`, sub: p.next_action || "Send a follow-up email with your updated stats", urgent: daysUntil <= 2 };
    }
    // Priority 3: No outreach yet
    if (signals.outreach_count === 0 && signals.total_interactions === 0) {
      return { title: "Send your first email", sub: "Introduce yourself with a personalized email", urgent: false };
    }
    // Priority 4: Coach replied but stale
    if (signals.has_coach_reply && signals.days_since_reply > 7) {
      return { title: `Coach replied ${signals.days_since_reply} days ago`, sub: "Keep the conversation going with a follow-up", urgent: signals.days_since_reply > 14 };
    }
    // Priority 5: Outreach sent, no reply
    if (signals.outreach_count > 0 && !signals.has_coach_reply) {
      return { title: "No reply yet — send a follow-up", sub: "A polite follow-up shows genuine interest", urgent: false };
    }
    // Priority 6: Has interactions but no specific action
    if (signals.total_interactions > 0 && !p.next_action_due) {
      return { title: "Set a follow-up date", sub: "Schedule your next action to stay on track", urgent: false };
    }
    return null;
  })();

  return (
    <div
      className="flex items-center gap-3 lg:gap-3.5 px-3 lg:px-4 py-2.5 lg:py-3 border-b transition-colors hover:bg-white/[0.02]"
      style={{ borderColor: "var(--t-border)" }}
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

      {/* Next Step - only in Action Required group */}
      {nextStep && groupKey === "action_required" && (
      <div className="hidden md:flex items-start gap-2 flex-shrink-0 w-[320px]" data-testid={`next-step-${p.program_id}`}>
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${nextStep.urgent ? "bg-orange-500/10" : "bg-pink-600/10"}`}>
          {nextStep.urgent ? <AlertCircle className="w-3.5 h-3.5 text-orange-400" /> : <Zap className="w-3.5 h-3.5 text-pink-500" />}
        </div>
        <div className="min-w-0">
          <p className={`text-[9px] uppercase tracking-wider font-semibold ${nextStep.urgent ? "text-orange-400" : "text-pink-500"}`}>Next Step</p>
          <p className="text-[11px] font-semibold leading-snug" style={{ color: "var(--t-text)" }}>{nextStep.title}</p>
          <p className="text-[10px] leading-snug" style={{ color: "var(--t-text-muted)" }}>{nextStep.sub}</p>
        </div>
      </div>
      )}

      {/* Divider + Journey */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {nextStep && <div className="hidden md:block w-px h-10 bg-[var(--t-border)]" />}
        <button
          onClick={() => navigate(`/journey/${p.program_id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-pink-400 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-600/25 rounded-md transition-colors"
          data-testid={`view-journey-${p.program_id}`}
        >
          <Sparkles className="w-3.5 h-3.5" />Journey
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
      <div className="flex flex-col gap-5">
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
                        groupKey={group.key}
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
