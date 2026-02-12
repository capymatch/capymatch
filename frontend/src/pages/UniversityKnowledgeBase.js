import { useState, useEffect } from "react";
import api from "../lib/api";
import { DIVISIONS, DIVISION_COLORS, REGIONS } from "../lib/constants";
import { Search, Filter, Plus, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export default function UniversityKnowledgeBase() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeDivision, setActiveDivision] = useState("all");
  const [filterRegion, setFilterRegion] = useState("all");
  const [collapsed, setCollapsed] = useState({});
  const [adding, setAdding] = useState({});

  const fetchUniversities = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterRegion && filterRegion !== "all") params.region = filterRegion;
      const res = await api.get("/knowledge-base", { params });
      setUniversities(res.data);
    } catch {
      toast.error("Failed to load knowledge base");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUniversities(); }, [search, filterRegion]);

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

  const toggleSection = (div) => setCollapsed((prev) => ({ ...prev, [div]: !prev[div] }));

  const divisionGroups = ["D1", "D2", "D3", "NAIA", "JUCO"];
  const filteredUnis = activeDivision === "all"
    ? universities
    : universities.filter((u) => u.division === activeDivision);

  if (loading) {
    return <div className="text-slate-400 text-center py-12" data-testid="kb-loading">Loading knowledge base...</div>;
  }

  return (
    <div data-testid="knowledge-base" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-blue-400" />
          <h2 className="font-heading text-2xl font-bold text-white" data-testid="kb-title">University Knowledge Base</h2>
        </div>
        <span className="text-slate-400 text-sm">{filteredUnis.length} universities</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap" data-testid="kb-filters">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            data-testid="kb-search"
            placeholder="Search universities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#1e293b] border-[#334155] text-white placeholder:text-slate-500"
          />
        </div>
        {/* Division tabs */}
        <div className="flex items-center gap-1" data-testid="kb-division-tabs">
          <button
            onClick={() => setActiveDivision("all")}
            data-testid="kb-tab-all"
            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
              activeDivision === "all" ? "bg-slate-600 text-white" : "bg-[#1e293b] text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          {divisionGroups.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDivision(d)}
              data-testid={`kb-tab-${d.toLowerCase()}`}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeDivision === d
                  ? `${DIVISION_COLORS[d]} shadow-md`
                  : "bg-[#1e293b] text-slate-400 hover:text-white"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger data-testid="kb-filter-region" className="w-36 bg-[#1e293b] border-[#334155] text-white">
            <Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Display grouped by division */}
      {(activeDivision === "all" ? divisionGroups : [activeDivision]).map((div) => {
        const divUnis = filteredUnis.filter((u) => u.division === div);
        if (divUnis.length === 0) return null;
        const isCollapsed = collapsed[div];

        return (
          <div key={div} className="section-enter" data-testid={`kb-section-${div.toLowerCase()}`}>
            <button
              onClick={() => toggleSection(div)}
              data-testid={`kb-toggle-${div.toLowerCase()}`}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-t-lg border border-[#334155] bg-[#1e293b] hover:bg-[#334155]/50 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${DIVISION_COLORS[div]}`}>{div}</span>
              <span className="font-heading font-bold text-sm text-white">Division {div === "D1" ? "1" : div === "D2" ? "2" : div === "D3" ? "3" : div}</span>
              <Badge className="ml-2 bg-slate-700 text-slate-300 text-xs">{divUnis.length} programs</Badge>
            </button>

            {!isCollapsed && (
              <div className="table-scroll border border-t-0 border-[#334155] rounded-b-lg bg-[#1e293b]/50">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#334155]">
                      <th className="px-3 py-2 text-left text-slate-400 font-medium uppercase tracking-wider">University</th>
                      <th className="px-3 py-2 text-left text-slate-400 font-medium uppercase tracking-wider">Conference</th>
                      <th className="px-3 py-2 text-left text-slate-400 font-medium uppercase tracking-wider">Region</th>
                      <th className="px-3 py-2 text-left text-slate-400 font-medium uppercase tracking-wider">Website</th>
                      <th className="px-3 py-2 text-left text-slate-400 font-medium uppercase tracking-wider">Mascot</th>
                      <th className="px-3 py-2 text-left text-slate-400 font-medium uppercase tracking-wider">Notes</th>
                      <th className="px-3 py-2 text-right text-slate-400 font-medium uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divUnis.map((uni) => (
                      <tr key={uni.university_name} className="border-b border-[#334155]/50 hover:bg-[#334155]/30 transition-colors" data-testid={`kb-row-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}>
                        <td className="px-3 py-2 text-white font-medium">{uni.university_name}</td>
                        <td className="px-3 py-2 text-slate-300">{uni.conference}</td>
                        <td className="px-3 py-2 text-slate-300">{uni.region}</td>
                        <td className="px-3 py-2">
                          {uni.website && <a href={uni.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs">Visit</a>}
                        </td>
                        <td className="px-3 py-2 text-slate-400">{uni.mascot}</td>
                        <td className="px-3 py-2 text-slate-500 truncate max-w-[200px]">{uni.notes}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addToBoard(uni)}
                            disabled={adding[uni.university_name]}
                            data-testid={`add-to-board-${uni.university_name.replace(/\s+/g, "-").toLowerCase()}`}
                            className="text-xs border-blue-600 text-blue-400 hover:bg-blue-600/20 h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {adding[uni.university_name] ? "Adding..." : "Add to Board"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
