import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { DIVISIONS, DIVISION_COLORS, REGIONS } from "../lib/constants";
import { Search, SlidersHorizontal, Plus, MapPin, Building2, Trophy, ExternalLink, BookmarkPlus, RotateCcw, ArrowUpDown } from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";

const CONFERENCES = [
  "ACC", "Big 12", "Big East", "Big Ten", "Pac-12", "SEC",
  "CCAA", "GLVC", "Landmark", "MIAA", "NCAC", "NESCAC", "NEWMAC",
  "NSIC", "RMAC", "SAA", "SAC", "SCAC", "SCIAC", "Sunshine State", "UAA",
  "Centennial",
];

export default function UniversityKnowledgeBase() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [filterConference, setFilterConference] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [adding, setAdding] = useState({});

  const fetchUniversities = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterRegion && filterRegion !== "all") params.region = filterRegion;
      if (filterDivision && filterDivision !== "all") params.division = filterDivision;
      if (filterConference && filterConference !== "all") params.conference = filterConference;
      const res = await api.get("/knowledge-base", { params });
      setUniversities(res.data);
    } catch {
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  }, [search, filterRegion, filterDivision, filterConference]);

  useEffect(() => { fetchUniversities(); }, [fetchUniversities]);

  const addToBoard = async (uni) => {
    setAdding((prev) => ({ ...prev, [uni.university_name]: true }));
    try {
      await api.post("/knowledge-base/add-to-board", { university_name: uni.university_name });
      toast.success(`${uni.university_name} added to your board`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add");
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
    if (sortBy === "division") return a.division.localeCompare(b.division);
    return 0;
  });

  if (loading) {
    return <div className="text-center py-12" style={{ color: "var(--t-text-muted)" }} data-testid="kb-loading">Loading knowledge base...</div>;
  }

  return (
    <div data-testid="knowledge-base" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold" style={{ color: "var(--t-text)" }} data-testid="kb-title">University Knowledge Base</h2>
      </div>

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
                    {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
                  <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                    <SelectItem value="all">Any</SelectItem>
                    {CONFERENCES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
          {activeFilterTags.length === 0 && (
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }} data-testid="kb-no-filters">No filters selected</p>
          )}

          {/* University Cards */}
          {sorted.length === 0 ? (
            <div className="text-center py-12" style={{ color: "var(--t-text-muted)" }}>No universities found matching your filters</div>
          ) : (
            sorted.map((uni) => (
              <UniversityCard key={uni.university_name} uni={uni} adding={adding} addToBoard={addToBoard} />
            ))
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
          {uni.website && (
            <a
              href={uni.website}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`visit-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
              className="inline-flex items-center gap-1.5 px-3 h-8 text-xs border rounded-md transition-colors"
              style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Visit
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {uni.division && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${divColor}`}>
            <Trophy className="w-3 h-3" /> {uni.division}
          </span>
        )}
        {uni.region && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}>
            <MapPin className="w-3 h-3" /> {uni.region}
          </span>
        )}
        {uni.mascot && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}>
            {uni.mascot}
          </span>
        )}
        {uni.notes && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {uni.notes}
          </span>
        )}
      </div>
    </div>
  );
}
