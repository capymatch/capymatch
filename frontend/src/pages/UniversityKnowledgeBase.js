import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import { DIVISIONS, REGIONS } from "../lib/constants";
import { Search, SlidersHorizontal, Plus, MapPin, Building2, Trophy, ExternalLink, BookmarkPlus, RotateCcw, ArrowUpDown, Sparkles, ChevronLeft, ChevronRight, User, Mail, ArrowRight, Zap } from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";

const PER_PAGE = 50;

export default function UniversityKnowledgeBase() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterConference, setFilterConference] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [adding, setAdding] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [conferences, setConferences] = useState([]);
  const [regions, setRegions] = useState(REGIONS);
  const [page, setPage] = useState(1);
  const { subscription } = useSubscription();
  const isBasic = subscription?.tier === "basic";

  // Fetch dynamic filters
  useEffect(() => {
    api.get("/knowledge-base/filters").then(res => {
      if (res.data?.conferences) setConferences(res.data.conferences);
      if (res.data?.regions) setRegions(res.data.regions);
    }).catch(() => {});
  }, []);

  const fetchUniversities = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterRegion && filterRegion !== "all") params.region = filterRegion;
      if (filterDivision && filterDivision !== "all") params.division = filterDivision;
      if (filterConference && filterConference !== "all") params.conference = filterConference;
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
    setAdding((prev) => ({ ...prev, [uni.university_name]: true }));
    try {
      await api.post("/knowledge-base/add-to-board", { university_name: uni.university_name });
      toast.success(`${uni.university_name} added to your board`);
      setSuggestions(prev => prev.filter(s => s.university_name !== uni.university_name));
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.error === "subscription_limit") {
        toast.error(detail.message || "School limit reached. Upgrade your plan.");
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to add");
      }
    } finally {
      setAdding((prev) => ({ ...prev, [uni.university_name]: false }));
    }
  };

  const resetFilters = () => {
    setFilterDivision("all");
    setFilterRegion("all");
    setFilterConference("all");
    setSearch("");
  };

  const hasFilters = filterDivision !== "all" || filterRegion !== "all" || filterConference !== "all" || search !== "";

  const activeFilterTags = [];
  if (filterDivision !== "all") activeFilterTags.push({ label: filterDivision, key: "div", clear: () => setFilterDivision("all") });
  if (filterRegion !== "all") activeFilterTags.push({ label: filterRegion, key: "reg", clear: () => setFilterRegion("all") });
  if (filterConference !== "all") activeFilterTags.push({ label: filterConference, key: "conf", clear: () => setFilterConference("all") });

  const sorted = [...universities].sort((a, b) => {
    if (sortBy === "name") return a.university_name.localeCompare(b.university_name);
    if (sortBy === "division") return (a.division || "").localeCompare(b.division || "");
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) {
    return <div className="text-center py-12" style={{ color: "var(--t-text-muted)" }} data-testid="kb-loading">Loading knowledge base...</div>;
  }

  return (
    <div data-testid="knowledge-base" className="space-y-4">
      {/* Recommended for You */}
      {!suggestionsLoading && suggestions.length > 0 && (
        <div className="rounded-xl border p-5 shadow-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="suggested-schools-section">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-pink-500" />
              <h3 className="font-heading font-bold text-base" style={{ color: "var(--t-text)" }}>Recommended for You</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-pink-600/15 text-pink-500 font-medium">{suggestions.length} matches</span>
            </div>
            <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>Based on your recruiting profile</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.slice(0, 6).map((s) => {
              const scoreColor = s.match_score >= 80 ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
                : s.match_score >= 60 ? "text-amber-400 bg-amber-500/15 border-amber-500/30"
                : "text-gray-400 bg-gray-500/15 border-gray-500/30";
              const divColor = {
                D1: "bg-emerald-500/20 text-emerald-400", D2: "bg-blue-500/20 text-blue-400",
                D3: "bg-violet-500/20 text-violet-400", NAIA: "bg-orange-500/20 text-orange-400",
              }[s.division] || "bg-gray-500/20 text-gray-400";
              return (
                <div key={s.university_name} className="rounded-lg p-4 border transition-all" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }} data-testid={`suggestion-${s.university_name.replace(/\s+/g, "-").toLowerCase()}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate" style={{ color: "var(--t-text)" }}>{s.university_name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: "var(--t-text-muted)" }}>
                        <MapPin className="w-3 h-3" /> {s.region}
                        {s.conference && <span>| {s.conference}</span>}
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border ${scoreColor}`}>
                      {s.match_score}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${divColor}`}>{s.division}</span>
                    {s.match_reasons?.map(r => (
                      <span key={r} className="px-1.5 py-0.5 rounded text-[10px] border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}>{r}</span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addToBoard(s)}
                    disabled={adding[s.university_name]}
                    data-testid={`suggest-add-${s.university_name.replace(/\s+/g, "-").toLowerCase()}`}
                    className="w-full text-xs h-8 gap-1.5 bg-pink-700 hover:bg-pink-800 text-white"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    {adding[s.university_name] ? "Adding..." : "Add to Board"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade Prompt for Basic Users */}
      {isBasic && (
        <div
          data-testid="basic-upgrade-prompt"
          className="rounded-xl border p-4 flex items-center justify-between gap-4"
          style={{
            backgroundColor: "rgba(236, 72, 153, 0.06)",
            borderColor: "rgba(236, 72, 153, 0.25)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-pink-600/20">
              <Zap className="w-4.5 h-4.5 text-pink-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-pink-300">
                You're seeing up to 3 school matches on the Basic plan
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                Upgrade to <span className="text-pink-400 font-medium">Pro</span> or <span className="text-pink-400 font-medium">Premium</span> to unlock unlimited matches based on your profile.
              </p>
            </div>
          </div>
          <a
            href="/account"
            data-testid="basic-upgrade-link"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors bg-pink-600 hover:bg-pink-700 text-white"
          >
            Upgrade Plan <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-4 rounded-lg p-4 shadow-sm border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
          <Input
            data-testid="kb-search"
            placeholder="Search by College Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          />
        </div>
        <span className="text-sm whitespace-nowrap" style={{ color: "var(--t-text-muted)" }} data-testid="kb-count">
          {sorted.length} colleges found
        </span>
      </div>

      {/* Main Layout: Sidebar + Cards */}
      <div className="flex gap-6">
        {/* Left Sidebar Filters */}
        <aside className="w-64 flex-shrink-0" data-testid="kb-sidebar-filters">
          <div className="rounded-lg p-4 sticky top-20 shadow-sm border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
                <span className="font-heading font-bold text-sm" style={{ color: "var(--t-text)" }}>Filters</span>
              </div>
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  data-testid="kb-reset-filters"
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: "var(--t-text-muted)" }}
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            <div className="space-y-5">
              {/* Division */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: "var(--t-text-muted)" }}>Division</label>
                <Select value={filterDivision} onValueChange={setFilterDivision}>
                  <SelectTrigger data-testid="kb-filter-division" className="h-9 text-sm" style={{ backgroundColor: "var(--t-select-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                    <SelectItem value="all">Any</SelectItem>
                    {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Region */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: "var(--t-text-muted)" }}>Region</label>
                <Select value={filterRegion} onValueChange={setFilterRegion}>
                  <SelectTrigger data-testid="kb-filter-region" className="h-9 text-sm" style={{ backgroundColor: "var(--t-select-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                    <SelectItem value="all">Any</SelectItem>
                    {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Conference */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: "var(--t-text-muted)" }}>Conference</label>
                <Select value={filterConference} onValueChange={setFilterConference}>
                  <SelectTrigger data-testid="kb-filter-conference" className="h-9 text-sm" style={{ backgroundColor: "var(--t-select-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60" style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                    <SelectItem value="all">Any</SelectItem>
                    {conferences.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator style={{ backgroundColor: "var(--t-border)" }} />

              {/* Sort */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider block mb-1.5" style={{ color: "var(--t-text-muted)" }}>Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger data-testid="kb-sort" className="h-9 text-sm" style={{ backgroundColor: "var(--t-select-bg)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
                    <ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="division">Division</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content - Card List */}
        <div className="flex-1 space-y-3" data-testid="kb-card-list">
          {/* Active filter tags */}
          {activeFilterTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap" data-testid="kb-active-filters">
              {activeFilterTags.map((tag) => (
                <Badge
                  key={tag.key}
                  className="bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-1 text-xs cursor-pointer transition-colors"
                  onClick={tag.clear}
                >
                  {tag.label} &times;
                </Badge>
              ))}
            </div>
          )}

          {/* University Cards */}
          {sorted.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--t-text-muted)" }}>No universities found matching your filters</div>
          ) : (
            <>
              {paginated.map((uni) => (
                <UniversityCard key={uni.university_name} uni={uni} adding={adding} addToBoard={addToBoard} />
              ))}
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 pb-2" data-testid="kb-pagination">
                  <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                    Showing {(page - 1) * PER_PAGE + 1}-{Math.min(page * PER_PAGE, sorted.length)} of {sorted.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      data-testid="kb-prev-page"
                      className="h-8 gap-1"
                      style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </Button>
                    <span className="text-sm px-2" style={{ color: "var(--t-text)" }}>
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      data-testid="kb-next-page"
                      className="h-8 gap-1"
                      style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UniversityCard({ uni, adding, addToBoard }) {
  const divColor = {
    D1: "bg-emerald-500/20 text-emerald-400",
    D2: "bg-blue-500/20 text-blue-400",
    D3: "bg-violet-500/20 text-violet-400",
    NAIA: "bg-orange-500/20 text-orange-400",
    JUCO: "bg-yellow-500/20 text-yellow-400",
  }[uni.division] || "bg-gray-500/20 text-gray-400";
  const divFull = uni.division === "D1" ? "NCAA I" : uni.division === "D2" ? "NCAA II" : uni.division === "D3" ? "NCAA III" : uni.division;

  return (
    <div
      className="rounded-lg p-5 transition-all duration-200 group shadow-sm border"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      data-testid={`kb-card-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${divColor} text-xs font-bold`}>
            {uni.division}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-lg leading-tight" style={{ color: "var(--t-text)" }}>{uni.university_name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm flex-wrap" style={{ color: "var(--t-text-muted)" }}>
              {uni.region && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {uni.region}
                </span>
              )}
              {uni.conference && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> {divFull} | {uni.conference}
                </span>
              )}
            </div>
            {(uni.primary_coach || uni.recruiting_coordinator) && (
              <div className="flex items-center gap-4 mt-2 text-xs flex-wrap" style={{ color: "var(--t-text-muted)" }}>
                {uni.primary_coach && (
                  <span className="flex items-center gap-1" data-testid="coach-info">
                    <User className="w-3 h-3" /> {uni.primary_coach}
                    {uni.coach_email && (
                      <a href={`mailto:${uni.coach_email}`} className="text-pink-500 hover:text-pink-400 ml-1" title={uni.coach_email}>
                        <Mail className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                )}
                {uni.recruiting_coordinator && (
                  <span className="flex items-center gap-1" data-testid="coordinator-info">
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => addToBoard(uni)}
            disabled={adding[uni.university_name]}
            data-testid={`add-to-board-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
            className="text-xs h-8 gap-1.5 transition-colors"
            style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            {adding[uni.university_name] ? "Adding..." : "Add to Board"}
          </Button>
        </div>
      </div>
    </div>
  );
}
