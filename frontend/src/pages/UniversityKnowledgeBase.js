import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import { DIVISIONS, REGIONS } from "../lib/constants";
import {
  Search, Plus, MapPin, Check, LayoutGrid, List, Star,
  Target, MapPinned, GraduationCap, X, Filter, ExternalLink,
  Loader2, RotateCcw, Sparkles, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

const PER_PAGE = 48;

const SMART_BUCKETS = [
  { id: "all", label: "All Schools", icon: LayoutGrid },
  { id: "dream", label: "Dream Schools (D1)", icon: Star, filter: { division: "D1" } },
  { id: "strong", label: "Strong Match (80%+)", icon: Target, filter: { minScore: 80 } },
  { id: "close", label: "Close to Home", icon: MapPinned },
  { id: "academics", label: "Strong Academics", icon: GraduationCap },
];

/* ── Slide-in Filter Panel ── */
function FilterPanel({ open, onClose, divisions, regions, conferences, filterDivision, filterRegion, filterConference, onDivision, onRegion, onConference, onApply, onClear }) {
  const [showAllConf, setShowAllConf] = useState(false);
  const visibleConf = showAllConf ? conferences : conferences.slice(0, 8);
  const activeCount = (filterDivision ? 1 : 0) + (filterRegion ? 1 : 0) + (filterConference ? 1 : 0);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 z-[199]" onClick={onClose} data-testid="filter-overlay" />}
      <div className={`fixed top-0 right-0 w-[360px] max-w-[90vw] h-full z-[200] transition-transform duration-300 ease-out overflow-y-auto ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ backgroundColor: "#fff", borderLeft: "1px solid #e2e8f0", boxShadow: open ? "-10px 0 40px rgba(0,0,0,0.08)" : "none" }}
        data-testid="filter-panel">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[15px] font-bold text-slate-800">Filters</span>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100" data-testid="filter-close">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Division */}
          <div className="mb-5">
            <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-slate-400 mb-2.5">Division</div>
            <div className="flex flex-wrap gap-1.5">
              {divisions.map(d => (
                <button key={d} onClick={() => onDivision(d)} data-testid={`filter-div-${d.toLowerCase()}`}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${filterDivision === d ? "text-[#2ec4b6] bg-[#2ec4b6]/10 border-[#2ec4b6]/25" : "text-slate-500 bg-slate-50 border-slate-200 hover:text-slate-700 hover:border-slate-300"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Region */}
          <div className="mb-5">
            <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-slate-400 mb-2.5">Region</div>
            <div className="flex flex-wrap gap-1.5">
              {regions.map(r => (
                <button key={r} onClick={() => onRegion(r)} data-testid={`filter-reg-${r.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${filterRegion === r ? "text-[#2ec4b6] bg-[#2ec4b6]/10 border-[#2ec4b6]/25" : "text-slate-500 bg-slate-50 border-slate-200 hover:text-slate-700 hover:border-slate-300"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Conference */}
          {conferences.length > 0 && (
            <div className="mb-5">
              <div className="text-[10px] font-bold tracking-[1.2px] uppercase text-slate-400 mb-2.5">Conference</div>
              <div className="flex flex-wrap gap-1.5">
                {visibleConf.map(c => (
                  <button key={c} onClick={() => onConference(c)} data-testid={`filter-conf-${c.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${filterConference === c ? "text-[#2ec4b6] bg-[#2ec4b6]/10 border-[#2ec4b6]/25" : "text-slate-500 bg-slate-50 border-slate-200 hover:text-slate-700 hover:border-slate-300"}`}>
                    {c}
                  </button>
                ))}
                {conferences.length > 8 && (
                  <button onClick={() => setShowAllConf(!showAllConf)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 border border-slate-200">
                    {showAllConf ? "Show less" : `+${conferences.length - 8} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          <button onClick={onApply} data-testid="filter-apply-btn"
            className="w-full py-3 rounded-xl text-[13px] font-bold text-white mt-2"
            style={{ background: "linear-gradient(135deg, #2ec4b6, #25a99e)" }}>
            Apply Filters {activeCount > 0 && `(${activeCount})`}
          </button>
          <button onClick={onClear} data-testid="filter-clear-btn"
            className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-slate-400 mt-2 transition-colors hover:text-slate-600 border border-slate-200">
            Clear All
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Top Match Banner ── */
function TopMatchBanner({ school, adding, addToBoard, boardSchools, navigate }) {
  if (!school) return null;
  const isOnBoard = boardSchools.has(school.university_name);
  return (
    <div className="flex flex-col sm:flex-row rounded-2xl overflow-hidden mb-7 border border-[#2ec4b6]/12" data-testid="top-match-banner">
      <div className="flex-1 p-5 sm:p-7" style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #1e2640 100%)" }}>
        <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#2ec4b6] mb-2.5 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Your #1 Match
        </div>
        <div className="text-lg sm:text-[22px] font-extrabold text-white mb-2 tracking-tight leading-tight cursor-pointer hover:text-[#2ec4b6] transition-colors"
          onClick={() => school.domain && navigate(`/school/${school.domain}`)} data-testid="top-match-name">
          {school.university_name}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold" style={{ backgroundColor: "rgba(46,196,182,0.2)", color: "#2ec4b6" }}>{school.division}</span>
          <span className="text-[12px] text-white/40">{school.region} {school.conference && `· ${school.conference}`}</span>
        </div>
        {school.match_reasons?.length > 0 && (
          <div className="rounded-xl p-3 sm:p-3.5" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
            <div className="text-[11px] font-bold text-white/60 mb-1">Why this school?</div>
            <div className="text-[12px] text-white/40 leading-relaxed">
              Strong match across {school.match_reasons.join(", ").toLowerCase()}. This program aligns well with your recruiting profile and preferences.
            </div>
          </div>
        )}
      </div>
      <div className="sm:w-[240px] flex flex-col items-center justify-center p-4 sm:p-7 gap-3 sm:gap-4 flex-shrink-0" style={{ backgroundColor: "#161b25" }}>
        <div className="flex sm:flex-col items-center gap-2 sm:gap-0">
          <div className="text-[36px] sm:text-[48px] font-extrabold text-[#2ec4b6] leading-none">{school.match_score}%</div>
          <div className="text-[10px] sm:text-[11px] text-white/35 uppercase tracking-[1px] font-semibold sm:-mt-2">Match Score</div>
        </div>
        {school.match_reasons?.length > 0 && (
          <div className="hidden sm:flex flex-wrap gap-1 justify-center">
            {school.match_reasons.map(r => (
              <span key={r} className="text-[10px] px-2 py-0.5 rounded-md text-white/40" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>{r}</span>
            ))}
          </div>
        )}
        <button onClick={() => !isOnBoard && addToBoard(school)} disabled={adding[school.university_name] || isOnBoard}
          data-testid="top-match-add-btn"
          className="w-full sm:flex-none sm:w-full py-2.5 px-4 sm:px-0 rounded-xl text-[13px] font-bold text-white transition-all"
          style={isOnBoard ? { backgroundColor: "rgba(16,185,129,0.2)", color: "#10b981" } : { background: "linear-gradient(135deg, #2ec4b6, #25a99e)" }}>
          {isOnBoard ? "On Your Board" : adding[school.university_name] ? "Adding..." : "+ Add to Board"}
        </button>
      </div>
    </div>
  );
}

/* ── School Card (Light theme) ── */
function SchoolCard({ uni, adding, addToBoard, boardSchools, navigate }) {
  const isOnBoard = boardSchools.has(uni.university_name);
  return (
    <div className="rounded-[14px] p-[18px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2ec4b6]/30 bg-white border border-slate-200 group"
      onClick={() => uni.domain && navigate(`/school/${uni.domain}`)}
      data-testid={`school-card-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="flex items-center gap-3 mb-3.5">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-slate-800 truncate">{uni.university_name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#2ec4b6]/15 text-[#2ec4b6]">{uni.division}</span>
            {uni.region && <span>{uni.region}</span>}
            {uni.conference && <span>· {uni.conference}</span>}
          </div>
        </div>
        {uni.match_score > 0 && (
          <span className="text-[18px] font-extrabold text-[#2ec4b6] flex-shrink-0" data-testid="card-match-score">{uni.match_score}%</span>
        )}
      </div>
      {uni.match_reasons?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3.5">
          {uni.match_reasons.map(r => (
            <span key={r} className="text-[10px] px-1.5 py-0.5 rounded-[5px] text-slate-400 bg-slate-100">{r}</span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => !isOnBoard && addToBoard(uni)} disabled={adding[uni.university_name] || isOnBoard}
          data-testid={`add-board-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
          className="flex-1 py-2 rounded-lg text-[11px] font-bold text-center transition-all"
          style={isOnBoard ? { backgroundColor: "rgba(16,185,129,0.12)", color: "#10b981" } : { backgroundColor: "rgba(46,196,182,0.12)", color: "#2ec4b6" }}>
          {isOnBoard ? "On Board" : adding[uni.university_name] ? "Adding..." : "+ Add to Board"}
        </button>
        <button onClick={() => uni.domain && navigate(`/school/${uni.domain}`)}
          data-testid={`details-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
          className="py-2 px-3 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 bg-slate-100 text-slate-400 hover:text-slate-600">
          <ArrowRight className="w-3 h-3" /> Details
        </button>
      </div>
    </div>
  );
}

export default function UniversityKnowledgeBase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromOnboarding = searchParams.get("from") === "onboarding";

  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [boardSchools, setBoardSchools] = useState(new Set());
  const [conferences, setConferences] = useState([]);
  const [regions, setRegions] = useState(REGIONS);

  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterConference, setFilterConference] = useState("");
  const [activeBucket, setActiveBucket] = useState("all");

  const [adding, setAdding] = useState({});
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { subscription } = useSubscription();

  useEffect(() => {
    api.get("/knowledge-base/filters").then(res => {
      if (res.data?.conferences) setConferences(res.data.conferences);
      if (res.data?.regions) setRegions(res.data.regions);
    }).catch(() => {});
    api.get("/programs").then(res => {
      setBoardSchools(new Set((res.data || []).map(p => p.university_name)));
    }).catch(() => {});
  }, []);

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

  useEffect(() => {
    api.get("/suggested-schools").then(res => {
      setSuggestions(res.data?.suggestions || []);
    }).catch(() => {}).finally(() => setSuggestionsLoading(false));
  }, []);

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
      if (detail?.error === "subscription_limit") toast.error(detail.message || "School limit reached. Upgrade your plan.");
      else toast.error(typeof detail === "string" ? detail : "Failed to add");
    } finally {
      setAdding(prev => ({ ...prev, [uni.university_name]: false }));
    }
  };

  const handleBucketClick = (bucket) => {
    setActiveBucket(bucket.id);
    if (bucket.id === "all") { setFilterDivision(""); setFilterRegion(""); setFilterConference(""); }
    else if (bucket.filter?.division) { setFilterDivision(bucket.filter.division); setFilterRegion(""); setFilterConference(""); }
    else { setFilterDivision(""); setFilterRegion(""); setFilterConference(""); }
    setPage(1);
  };

  const toggleDiv = d => { setFilterDivision(prev => prev === d ? "" : d); setActiveBucket("all"); };
  const toggleReg = r => { setFilterRegion(prev => prev === r ? "" : r); setActiveBucket("all"); };
  const toggleConf = c => { setFilterConference(prev => prev === c ? "" : c); setActiveBucket("all"); };
  const resetFilters = () => { setFilterDivision(""); setFilterRegion(""); setFilterConference(""); setSearch(""); setActiveBucket("all"); setPage(1); };

  const activeFilterCount = (filterDivision ? 1 : 0) + (filterRegion ? 1 : 0) + (filterConference ? 1 : 0);

  const suggestionMap = {};
  suggestions.forEach(s => { suggestionMap[s.university_name] = s; });

  // Sort by match score desc (schools with scores first), then alphabetically
  let filtered = [...universities].sort((a, b) => {
    const sa = suggestionMap[a.university_name]?.match_score || 0;
    const sb = suggestionMap[b.university_name]?.match_score || 0;
    if (sb !== sa) return sb - sa;
    return a.university_name.localeCompare(b.university_name);
  });
  if (activeBucket === "strong") {
    filtered = filtered.filter(u => (suggestionMap[u.university_name]?.match_score || 0) >= 80);
  }

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const enriched = paginated.map(u => ({
    ...u,
    match_score: suggestionMap[u.university_name]?.match_score || null,
    match_reasons: suggestionMap[u.university_name]?.match_reasons || [],
  }));

  const topMatch = suggestions[0] || null;

  // Bucket counts
  const bucketCounts = {
    all: filtered.length,
    dream: universities.filter(u => u.division === "D1").length,
    strong: Object.values(suggestionMap).filter(s => s.match_score >= 80).length,
    academics: Object.values(suggestionMap).filter(s => (s.match_reasons || []).includes("Academics")).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" data-testid="kb-loading">
        <Loader2 className="w-6 h-6 text-[#2ec4b6] animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="knowledge-base" className="max-w-[1280px] mx-auto">
      {/* Search + Filter Toggle */}
      <div className="flex gap-2.5 items-center mb-5" data-testid="search-row">
        <div className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-[14px] bg-white border border-slate-200">
          <Search className="w-[18px] h-[18px] text-slate-300 flex-shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveBucket("all"); }}
            placeholder={`Search ${universities.length.toLocaleString()} colleges by name...`}
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-700 placeholder:text-slate-300"
            data-testid="kb-search"
          />
          <span className="text-[11px] text-slate-300 whitespace-nowrap">{filtered.length.toLocaleString()}</span>
        </div>
        <button onClick={() => setFiltersOpen(true)} data-testid="filter-toggle-btn"
          className="flex items-center gap-1.5 px-4 py-3 rounded-[14px] text-[13px] font-semibold text-slate-500 transition-all hover:border-[#2ec4b6]/30 hover:text-[#2ec4b6] bg-white border border-slate-200">
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-[#2ec4b6] text-white text-[10px] px-1.5 py-0.5 rounded-[10px] font-bold">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* Smart Chips */}
      <div className="flex gap-2 flex-wrap mb-6" data-testid="smart-chips">
        {SMART_BUCKETS.map(b => {
          const isActive = activeBucket === b.id;
          const count = bucketCounts[b.id];
          return (
            <button key={b.id} onClick={() => handleBucketClick(b)} data-testid={`chip-${b.id}`}
              className={`px-4 py-[7px] rounded-[20px] text-[12px] font-semibold whitespace-nowrap transition-all ${isActive ? "text-[#2ec4b6] bg-[#2ec4b6]/10 border-[#2ec4b6]/30" : "text-slate-500 bg-white border-slate-200 hover:text-slate-700 hover:border-slate-300"}`}
              style={{ border: `1px solid ${isActive ? "rgba(46,196,182,0.3)" : ""}` }}>
              {b.label}
              {count > 0 && <span className="ml-1 opacity-50 font-medium">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Top Match Banner */}
      {!suggestionsLoading && topMatch && (
        <TopMatchBanner school={topMatch} adding={adding} addToBoard={addToBoard} boardSchools={boardSchools} navigate={navigate} />
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] text-slate-400" data-testid="results-count">Showing {filtered.length.toLocaleString()} schools</span>
        <div className="flex gap-1" data-testid="view-toggle">
          {[{ mode: "grid", Icon: LayoutGrid }, { mode: "list", Icon: List }].map(({ mode, Icon }) => (
            <button key={mode} onClick={() => setViewMode(mode)} data-testid={`view-${mode}-btn`}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${viewMode === mode ? "bg-slate-100 border-slate-300" : "bg-white border-slate-200"}`}>
              <Icon className={`w-[15px] h-[15px] ${viewMode === mode ? "text-slate-600" : "text-slate-300"}`} />
            </button>
          ))}
        </div>
      </div>

      {/* School Grid / List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" data-testid="no-results">
          <Search className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm font-medium text-slate-400">No universities found matching your filters</p>
          <button onClick={resetFilters} className="mt-3 text-sm font-medium flex items-center gap-1.5 mx-auto text-[#2ec4b6] transition-colors hover:opacity-80">
            <RotateCcw className="w-3.5 h-3.5" /> Reset filters
          </button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3" : "flex flex-col gap-2.5"} data-testid="kb-grid">
          {enriched.map(uni => (
            <SchoolCard key={uni.university_name} uni={uni} adding={adding} addToBoard={addToBoard} boardSchools={boardSchools} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 pb-2" data-testid="kb-pagination">
          <span className="text-[12px] text-slate-400">
            {(page - 1) * PER_PAGE + 1}-{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="kb-prev-page"
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-500 disabled:opacity-30 transition-colors hover:text-slate-700 bg-white border border-slate-200">Prev</button>
            <span className="text-[12px] text-slate-500 px-2">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} data-testid="kb-next-page"
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-500 disabled:opacity-30 transition-colors hover:text-slate-700 bg-white border border-slate-200">Next</button>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <FilterPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        divisions={DIVISIONS}
        regions={regions}
        conferences={conferences}
        filterDivision={filterDivision}
        filterRegion={filterRegion}
        filterConference={filterConference}
        onDivision={toggleDiv}
        onRegion={toggleReg}
        onConference={toggleConf}
        onApply={() => setFiltersOpen(false)}
        onClear={() => { resetFilters(); setFiltersOpen(false); }}
      />
    </div>
  );
}
