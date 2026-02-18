import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  Search, Plus, MapPin, Building2, BookmarkPlus, RotateCcw,
  ArrowUpDown, ChevronLeft, ChevronRight, User, Mail, Check,
  LayoutGrid, List, Star, Target, MapPinned, Reply, GraduationCap, X
} from "lucide-react";
import UniversityLogo from "../components/UniversityLogo";
import SpotlightHero from "../components/FindSchools/SpotlightHero";
import SchoolGridCard from "../components/FindSchools/SchoolGridCard";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const PER_PAGE = 48;

const SMART_BUCKETS = [
  { id: "all", label: "All Schools", icon: LayoutGrid },
  { id: "dream", label: "Dream Schools (D1)", icon: Star, filter: { division: "D1" } },
  { id: "strong", label: "Strong Match (80%+)", icon: Target, filter: { minScore: 80 } },
  { id: "close", label: "Close to Home", icon: MapPinned, filter: { closeToHome: true } },
  { id: "academics", label: "Strong Academics", icon: GraduationCap, filter: { academics: true } },
];

export default function UniversityKnowledgeBase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get("from") === "onboarding";

  // Data states
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [boardSchools, setBoardSchools] = useState(new Set());
  const [conferences, setConferences] = useState([]);
  const [regions, setRegions] = useState(REGIONS);

  // Filter states
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterConference, setFilterConference] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [activeBucket, setActiveBucket] = useState("all");

  // UI states
  const [adding, setAdding] = useState({});
  const [viewMode, setViewMode] = useState("grid");
  const [expandedCard, setExpandedCard] = useState(null);
  const [page, setPage] = useState(1);
  const [showAllConferences, setShowAllConferences] = useState(false);

  const stickyRef = useRef(null);
  const { subscription } = useSubscription();

  // Fetch filters + board schools
  useEffect(() => {
    api.get("/knowledge-base/filters").then(res => {
      if (res.data?.conferences) setConferences(res.data.conferences);
      if (res.data?.regions) setRegions(res.data.regions);
    }).catch(() => {});
    api.get("/programs").then(res => {
      setBoardSchools(new Set((res.data || []).map(p => p.university_name)));
    }).catch(() => {});
  }, []);

  // Fetch universities
  const fetchUniversities = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterRegion) params.region = filterRegion;
      if (filterDivision) params.division = filterDivision;
      if (filterConference) params.conference = filterConference;
      const res = await api.get("/knowledge-base", { params });
      setUniversities(res.data);
      setPage(1);
    } catch {
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  }, [search, filterRegion, filterDivision, filterConference]);

  useEffect(() => { fetchUniversities(); }, [fetchUniversities]);

  // Fetch suggestions
  useEffect(() => {
    api.get("/suggested-schools").then(res => {
      setSuggestions(res.data?.suggestions || []);
    }).catch(() => {}).finally(() => setSuggestionsLoading(false));
  }, []);

  // Add to board handler
  const addToBoard = async (uni) => {
    setAdding(prev => ({ ...prev, [uni.university_name]: true }));
    try {
      await api.post("/knowledge-base/add-to-board", { university_name: uni.university_name });
      toast.success(`${uni.university_name} added to your board`);
      setSuggestions(prev => prev.filter(s => s.university_name !== uni.university_name));
      setBoardSchools(prev => new Set([...prev, uni.university_name]));
      if (!localStorage.getItem("tour_completed")) {
        localStorage.setItem("show_tour", "true");
        window.dispatchEvent(new Event("trigger_tour"));
      }
      if (fromOnboarding) navigate("/pipeline?congrats=true");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.error === "subscription_limit") {
        toast.error(detail.message || "School limit reached. Upgrade your plan.");
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to add");
      }
    } finally {
      setAdding(prev => ({ ...prev, [uni.university_name]: false }));
    }
  };

  // Smart bucket handler
  const handleBucketClick = (bucket) => {
    setActiveBucket(bucket.id);
    if (bucket.id === "all") {
      setFilterDivision("");
      setFilterRegion("");
      setFilterConference("");
    } else if (bucket.filter?.division) {
      setFilterDivision(bucket.filter.division);
      setFilterRegion("");
      setFilterConference("");
    } else {
      // For non-API filters, reset API filters
      setFilterDivision("");
      setFilterRegion("");
      setFilterConference("");
    }
    setPage(1);
  };

  // Filter pill handlers
  const toggleDivision = (div) => {
    setFilterDivision(prev => prev === div ? "" : div);
    setActiveBucket("all");
    setPage(1);
  };
  const toggleRegion = (reg) => {
    setFilterRegion(prev => prev === reg ? "" : reg);
    setActiveBucket("all");
    setPage(1);
  };
  const toggleConference = (conf) => {
    setFilterConference(prev => prev === conf ? "" : conf);
    setActiveBucket("all");
    setPage(1);
  };

  const resetFilters = () => {
    setFilterDivision("");
    setFilterRegion("");
    setFilterConference("");
    setSearch("");
    setActiveBucket("all");
    setPage(1);
  };

  const hasFilters = filterDivision || filterRegion || filterConference || search;

  // Build active filter tags
  const activeFilterTags = [];
  if (filterDivision) activeFilterTags.push({ label: filterDivision, key: "div", clear: () => { setFilterDivision(""); setActiveBucket("all"); } });
  if (filterRegion) activeFilterTags.push({ label: filterRegion, key: "reg", clear: () => { setFilterRegion(""); setActiveBucket("all"); } });
  if (filterConference) activeFilterTags.push({ label: filterConference, key: "conf", clear: () => { setFilterConference(""); setActiveBucket("all"); } });

  // Sort + paginate
  const sorted = [...universities].sort((a, b) => {
    if (sortBy === "name") return a.university_name.localeCompare(b.university_name);
    if (sortBy === "division") return (a.division || "").localeCompare(b.division || "");
    return 0;
  });

  // Apply smart bucket client-side filters
  let filtered = sorted;
  if (activeBucket === "strong") {
    const suggestionScores = {};
    suggestions.forEach(s => { suggestionScores[s.university_name] = s.match_score; });
    filtered = sorted.filter(u => (suggestionScores[u.university_name] || 0) >= 80);
  }

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Enrich paginated with match scores from suggestions
  const suggestionMap = {};
  suggestions.forEach(s => { suggestionMap[s.university_name] = s; });
  const enriched = paginated.map(u => ({
    ...u,
    match_score: suggestionMap[u.university_name]?.match_score || null,
    match_reasons: suggestionMap[u.university_name]?.match_reasons || [],
  }));

  const visibleConferences = showAllConferences ? conferences : conferences.slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="kb-loading">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: "var(--t-border)", borderTopColor: "var(--t-accent, #be185d)" }} />
          <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Loading schools...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="knowledge-base" className="space-y-6">
      {/* === FEATURE 1: Spotlight Hero === */}
      {!suggestionsLoading && suggestions.length > 0 && (
        <SpotlightHero
          suggestions={suggestions}
          adding={adding}
          addToBoard={addToBoard}
          boardSchools={boardSchools}
        />
      )}

      {/* === FEATURE 6: Sticky Search Bar === */}
      <div
        ref={stickyRef}
        className="sticky top-0 z-30 -mx-4 px-4 py-3 border-b transition-all duration-200"
        style={{
          backgroundColor: "rgba(var(--t-bg-rgb, 245, 245, 247), 0.85)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderColor: "rgba(0,0,0,0.06)",
        }}
        data-testid="sticky-search-bar"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
            <Input
              data-testid="kb-search"
              placeholder={`Search ${sorted.length.toLocaleString()} colleges by name...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setActiveBucket("all"); }}
              className="pl-9 h-10"
              style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
            />
          </div>
          <span className="text-[13px] whitespace-nowrap font-medium" style={{ color: "var(--t-text-muted)" }} data-testid="kb-count">
            {filtered.length} results
          </span>
          {/* === FEATURE 4: View Toggle === */}
          <div className="flex border rounded-lg overflow-hidden" style={{ borderColor: "var(--t-border)" }} data-testid="view-toggle">
            <button
              className={`p-2 transition-colors ${viewMode === "grid" ? "text-white" : ""}`}
              style={viewMode === "grid" ? { backgroundColor: "var(--t-text)" } : { color: "var(--t-text-muted)" }}
              onClick={() => setViewMode("grid")}
              data-testid="view-grid-btn"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              className={`p-2 transition-colors ${viewMode === "list" ? "text-white" : ""}`}
              style={viewMode === "list" ? { backgroundColor: "var(--t-text)" } : { color: "var(--t-text-muted)" }}
              onClick={() => setViewMode("list")}
              data-testid="view-list-btn"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilterTags.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap" data-testid="active-filter-chips">
            {activeFilterTags.map(tag => {
              const isDivision = tag.key === "div";
              const divChipColors = {
                D1: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                D2: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                D3: "bg-violet-500/10 text-violet-600 border-violet-500/20",
                NAIA: "bg-orange-500/10 text-orange-600 border-orange-500/20",
                JUCO: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
              };
              const chipClass = isDivision
                ? `${divChipColors[tag.label] || "bg-gray-100 text-gray-600 border-gray-200"}`
                : "bg-pink-500/8 text-pink-600 border-pink-500/15";
              return (
                <button
                  key={tag.key}
                  onClick={tag.clear}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors hover:opacity-75 ${chipClass}`}
                  data-testid={`chip-${tag.key}`}
                >
                  {isDivision && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                  {!isDivision && <MapPin className="w-3 h-3" />}
                  {tag.label}
                  <X className="w-3 h-3 opacity-50" />
                </button>
              );
            })}
            <button onClick={resetFilters} className="text-xs flex items-center gap-1 px-2 py-1 transition-colors hover:opacity-75" style={{ color: "var(--t-text-muted)" }} data-testid="clear-all-filters">
              <RotateCcw className="w-3 h-3" /> Clear all
            </button>
          </div>
        )}
      </div>

      {/* === FEATURE 5: Smart Buckets === */}
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }} data-testid="smart-buckets">
        {SMART_BUCKETS.map(bucket => {
          const Icon = bucket.icon;
          const isActive = activeBucket === bucket.id;
          let count = null;
          if (bucket.id === "dream") count = universities.filter(u => u.division === "D1").length;
          if (bucket.id === "strong") {
            const scores = {};
            suggestions.forEach(s => { scores[s.university_name] = s.match_score; });
            count = universities.filter(u => (scores[u.university_name] || 0) >= 80).length;
          }
          if (bucket.id === "academics") count = universities.filter(u => (suggestionMap[u.university_name]?.match_reasons || []).includes("Academics")).length;

          return (
            <button
              key={bucket.id}
              onClick={() => handleBucketClick(bucket)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap flex-shrink-0 border transition-all duration-200 ${
                isActive
                  ? "text-white shadow-md"
                  : "hover:border-pink-500/50 hover:text-pink-600"
              }`}
              style={isActive
                ? { backgroundColor: "var(--t-accent, #be185d)", borderColor: "var(--t-accent, #be185d)", boxShadow: "0 4px 12px rgba(190,24,93,0.25)" }
                : { backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }
              }
              data-testid={`bucket-${bucket.id}`}
            >
              <Icon className="w-4 h-4" />
              {bucket.label}
              {count !== null && count > 0 && (
                <span className={`font-heading font-bold text-[13px] ${isActive ? "opacity-70" : "opacity-50"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* === FEATURE 2: Horizontal Filter Pills === */}
      <div className="flex items-center gap-2 flex-wrap" data-testid="filter-pills">
        <span className="text-[11px] uppercase tracking-widest font-semibold mr-1" style={{ color: "var(--t-text-muted)" }}>Division</span>
        {DIVISIONS.map(d => {
          const isActive = filterDivision === d;
          const colorMap = {
            D1: { active: "bg-emerald-500/15 text-emerald-600 border-emerald-500 shadow-emerald-500/10", hover: "hover:border-emerald-400" },
            D2: { active: "bg-blue-500/15 text-blue-600 border-blue-500 shadow-blue-500/10", hover: "hover:border-blue-400" },
            D3: { active: "bg-violet-500/15 text-violet-600 border-violet-500 shadow-violet-500/10", hover: "hover:border-violet-400" },
            NAIA: { active: "bg-orange-500/15 text-orange-600 border-orange-500 shadow-orange-500/10", hover: "hover:border-orange-400" },
            JUCO: { active: "bg-yellow-500/15 text-yellow-600 border-yellow-500 shadow-yellow-500/10", hover: "hover:border-yellow-400" },
          };
          const colors = colorMap[d] || { active: "", hover: "" };
          return (
            <button
              key={d}
              onClick={() => toggleDivision(d)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border-[1.5px] transition-all duration-200 ${
                isActive ? `${colors.active} shadow-sm` : `border-[var(--t-border)] ${colors.hover}`
              }`}
              style={!isActive ? { color: "var(--t-text-secondary)" } : undefined}
              data-testid={`pill-div-${d.toLowerCase()}`}
            >
              {d}
            </button>
          );
        })}

        <div className="w-px h-6 mx-1" style={{ backgroundColor: "var(--t-border)" }} />

        <span className="text-[11px] uppercase tracking-widest font-semibold mr-1" style={{ color: "var(--t-text-muted)" }}>Region</span>
        {regions.slice(0, 5).map(r => {
          const isActive = filterRegion === r;
          return (
            <button
              key={r}
              onClick={() => toggleRegion(r)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border-[1.5px] transition-all duration-200 ${
                isActive ? "bg-pink-500/10 text-pink-600 border-pink-500 shadow-sm shadow-pink-500/10" : "border-[var(--t-border)] hover:border-pink-400"
              }`}
              style={!isActive ? { color: "var(--t-text-secondary)" } : undefined}
              data-testid={`pill-reg-${r.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {r}
            </button>
          );
        })}

        {regions.length > 5 && !filterRegion && (
          <span className="text-[12px] px-2 py-1" style={{ color: "var(--t-text-muted)" }}>+{regions.length - 5} more</span>
        )}

        {conferences.length > 0 && (
          <>
            <div className="w-px h-6 mx-1" style={{ backgroundColor: "var(--t-border)" }} />
            <span className="text-[11px] uppercase tracking-widest font-semibold mr-1" style={{ color: "var(--t-text-muted)" }}>Conference</span>
            {visibleConferences.map(c => {
              const isActive = filterConference === c;
              return (
                <button
                  key={c}
                  onClick={() => toggleConference(c)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium border-[1.5px] transition-all duration-200 ${
                    isActive ? "bg-pink-500/10 text-pink-600 border-pink-500 shadow-sm" : "border-[var(--t-border)] hover:border-gray-400"
                  }`}
                  style={!isActive ? { color: "var(--t-text-secondary)" } : undefined}
                  data-testid={`pill-conf-${c.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {c}
                </button>
              );
            })}
            {conferences.length > 6 && (
              <button
                onClick={() => setShowAllConferences(!showAllConferences)}
                className="text-[12px] px-2 py-1 transition-colors"
                style={{ color: "var(--t-text-muted)" }}
                data-testid="show-more-conferences"
              >
                {showAllConferences ? "Show less" : `+${conferences.length - 6} more`}
              </button>
            )}
          </>
        )}
      </div>

      {/* === FEATURES 3 & 4: Grid/List View with Quick Look === */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" data-testid="no-results">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--t-text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--t-text-muted)" }}>No universities found matching your filters</p>
          {hasFilters && (
            <button onClick={resetFilters} className="mt-3 text-sm font-medium flex items-center gap-1.5 mx-auto transition-colors" style={{ color: "var(--t-accent, #be185d)" }}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="kb-grid-view">
          {enriched.map(uni => (
            <SchoolGridCard
              key={uni.university_name}
              uni={uni}
              adding={adding}
              addToBoard={addToBoard}
              boardSchools={boardSchools}
              isExpanded={expandedCard === uni.university_name}
              onToggleExpand={() => setExpandedCard(expandedCard === uni.university_name ? null : uni.university_name)}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3" data-testid="kb-list-view">
          {enriched.map(uni => (
            <ListCard key={uni.university_name} uni={uni} adding={adding} addToBoard={addToBoard} boardSchools={boardSchools} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 pb-2" data-testid="kb-pagination">
          <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>
            Showing {(page - 1) * PER_PAGE + 1}-{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              data-testid="kb-prev-page" className="h-8 gap-1" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <span className="text-sm px-2" style={{ color: "var(--t-text)" }}>{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              data-testid="kb-next-page" className="h-8 gap-1" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* List view card - keeps the original detailed layout */
function ListCard({ uni, adding, addToBoard, boardSchools }) {
  const isOnBoard = boardSchools.has(uni.university_name);
  const divColor = {
    D1: "bg-emerald-500/15 text-emerald-600",
    D2: "bg-blue-500/15 text-blue-600",
    D3: "bg-violet-500/15 text-violet-600",
    NAIA: "bg-orange-500/15 text-orange-600",
    JUCO: "bg-yellow-500/15 text-yellow-600",
  }[uni.division] || "bg-gray-500/15 text-gray-600";
  const divFull = uni.division === "D1" ? "NCAA I" : uni.division === "D2" ? "NCAA II" : uni.division === "D3" ? "NCAA III" : uni.division;

  return (
    <div
      className="rounded-xl p-5 transition-all duration-200 group shadow-sm border hover:shadow-md"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`kb-list-card-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <UniversityLogo domain={uni.domain} name={uni.university_name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-heading font-bold text-lg leading-tight" style={{ color: "var(--t-text)" }}>{uni.university_name}</h3>
              {uni.match_score && (
                <span className={`font-heading text-sm font-bold ${uni.match_score >= 80 ? "text-emerald-500" : "text-amber-500"}`}>
                  {uni.match_score}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm flex-wrap" style={{ color: "var(--t-text-muted)" }}>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${divColor}`}>{uni.division}</span>
              {uni.region && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {uni.region}</span>}
              {uni.conference && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {divFull} | {uni.conference}</span>}
            </div>
            {(uni.primary_coach || uni.recruiting_coordinator) && (
              <div className="flex items-center gap-4 mt-2 text-xs flex-wrap" style={{ color: "var(--t-text-muted)" }}>
                {uni.primary_coach && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {uni.primary_coach}
                    {uni.coach_email && (
                      <a href={`mailto:${uni.coach_email}`} className="text-pink-500 hover:text-pink-400 ml-1" title={uni.coach_email}>
                        <Mail className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                )}
                {uni.recruiting_coordinator && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 opacity-60" /> {uni.recruiting_coordinator} <span className="opacity-50">(RC)</span>
                    {uni.coordinator_email && (
                      <a href={`mailto:${uni.coordinator_email}`} className="text-pink-500 hover:text-pink-400 ml-1" title={uni.coordinator_email}>
                        <Mail className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOnBoard ? (
            <span className="inline-flex items-center gap-1.5 text-xs h-8 px-3 rounded-md font-medium text-emerald-600" data-testid={`on-board-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}>
              <Check className="w-3.5 h-3.5" /> On Your Board
            </span>
          ) : (
            <Button size="sm" variant="outline" onClick={() => addToBoard(uni)} disabled={adding[uni.university_name]}
              data-testid={`add-to-board-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
              className="text-xs h-8 gap-1.5 transition-colors" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
              <BookmarkPlus className="w-3.5 h-3.5" />
              {adding[uni.university_name] ? "Adding..." : "Add to Board"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
