import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { STATUS_GROUPS, DIVISION_COLORS, RECRUITING_STATUSES, REPLY_STATUSES, PRIORITIES, NEXT_ACTIONS, DIVISIONS, REGIONS } from "../lib/constants";
import { ChevronDown, ChevronRight, Search, Filter, ExternalLink, Plus } from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "sonner";

function InlineSelect({ value, options, onChange, className = "" }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent border border-transparent hover:border-slate-600 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer ${className}`}
    >
      <option value="" className="bg-[#1e293b]">Select</option>
      {options.map((o) => (
        <option key={o} value={o} className="bg-[#1e293b]">{o}</option>
      ))}
    </select>
  );
}

function InlineDateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent border border-transparent hover:border-slate-600 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer text-slate-300"
    />
  );
}

function AddProgramDialog({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ university_name: "", division: "D1", conference: "", region: "" });

  const handleSubmit = async () => {
    if (!form.university_name.trim()) { toast.error("University name required"); return; }
    try {
      await api.post("/programs", form);
      toast.success("Program added");
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
        <Button data-testid="add-program-btn" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Program
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1e293b] border-[#334155] text-white">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Add New Program</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-slate-300">University Name *</Label>
            <Input data-testid="add-university-name" value={form.university_name} onChange={(e) => setForm({ ...form, university_name: e.target.value })} className="bg-[#0f172a] border-[#334155] text-white mt-1" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-300">Division</Label>
              <select data-testid="add-division" value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-md px-3 py-2 mt-1 text-sm">
                {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-slate-300">Conference</Label>
              <Input data-testid="add-conference" value={form.conference} onChange={(e) => setForm({ ...form, conference: e.target.value })} className="bg-[#0f172a] border-[#334155] text-white mt-1" />
            </div>
            <div>
              <Label className="text-slate-300">Region</Label>
              <select data-testid="add-region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-md px-3 py-2 mt-1 text-sm">
                <option value="">Select</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <Button data-testid="submit-add-program" onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white">Add to Board</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
    } catch (err) {
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
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const columns = [
    { key: "university_name", label: "University", width: "180px" },
    { key: "division", label: "Div", width: "60px" },
    { key: "conference", label: "Conference", width: "120px" },
    { key: "region", label: "Region", width: "100px" },
    { key: "website", label: "Web", width: "50px" },
    { key: "mascot", label: "Mascot", width: "100px" },
    { key: "primary_coach", label: "Primary Coach", width: "130px" },
    { key: "coach_email", label: "Coach Email", width: "150px" },
    { key: "recruiting_status", label: "Status", width: "140px" },
    { key: "initial_contact_sent", label: "Initial Contact", width: "120px" },
    { key: "reply_status", label: "Reply", width: "120px" },
    { key: "last_follow_up", label: "Last Follow-Up", width: "120px" },
    { key: "follow_up_days", label: "FU Days", width: "70px" },
    { key: "next_action", label: "Next Action", width: "120px" },
    { key: "next_action_due", label: "Due Date", width: "120px" },
    { key: "priority", label: "Priority", width: "100px" },
    { key: "scholarship_type", label: "Scholarship", width: "120px" },
  ];

  if (loading) {
    return <div className="text-slate-400 text-center py-12" data-testid="board-loading">Loading board...</div>;
  }

  return (
    <div data-testid="recruiting-board" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold text-white" data-testid="board-title">Recruiting Board</h2>
        <AddProgramDialog onAdd={fetchPrograms} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap" data-testid="board-filters">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            data-testid="board-search"
            placeholder="Search universities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#1e293b] border-[#334155] text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger data-testid="filter-division" className="w-32 bg-[#1e293b] border-[#334155] text-white">
            <Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRegion} onValueChange={setFilterRegion}>
          <SelectTrigger data-testid="filter-region" className="w-36 bg-[#1e293b] border-[#334155] text-white">
            <Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent className="bg-[#1e293b] border-[#334155]">
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grouped Sections */}
      {STATUS_GROUPS.map((group) => {
        const groupPrograms = programs.filter((p) => group.statuses.includes(p.recruiting_status));
        const isCollapsed = collapsed[group.key];

        return (
          <div key={group.key} className="section-enter" data-testid={`section-${group.key}`}>
            {/* Section Header */}
            <button
              onClick={() => toggleSection(group.key)}
              data-testid={`toggle-${group.key}`}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-t-lg border ${group.color} transition-colors hover:brightness-110`}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span className="font-heading font-bold text-sm tracking-wide uppercase">{group.label}</span>
              <Badge className={`ml-2 ${group.badge} text-xs`}>{groupPrograms.length}</Badge>
            </button>

            {/* Section Table */}
            {!isCollapsed && (
              <div className="table-scroll border border-t-0 border-[#334155] rounded-b-lg bg-[#1e293b]/50">
                {groupPrograms.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-sm">No programs in this section</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#334155]">
                        {columns.map((col) => (
                          <th key={col.key} className="px-3 py-2 text-left text-slate-400 font-medium uppercase tracking-wider whitespace-nowrap" style={{ minWidth: col.width }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupPrograms.map((p) => (
                        <tr key={p.program_id} className="border-b border-[#334155]/50 hover:bg-[#334155]/30 transition-colors" data-testid={`program-row-${p.program_id}`}>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => navigate(`/programs/${p.program_id}`)}
                              data-testid={`program-link-${p.program_id}`}
                              className="text-blue-400 hover:text-blue-300 hover:underline font-medium truncate block max-w-[180px]"
                            >
                              {p.university_name}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${DIVISION_COLORS[p.division] || "bg-slate-600 text-white"}`}>
                              {p.division}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-300 truncate max-w-[120px]">{p.conference}</td>
                          <td className="px-3 py-2 text-slate-300">{p.region}</td>
                          <td className="px-3 py-2">
                            {p.website && (
                              <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-400 truncate max-w-[100px]">{p.mascot}</td>
                          <td className="px-3 py-2 text-slate-300 truncate max-w-[130px]">{p.primary_coach}</td>
                          <td className="px-3 py-2 text-slate-400 truncate max-w-[150px]">{p.coach_email}</td>
                          <td className="px-3 py-2">
                            <InlineSelect value={p.recruiting_status} options={RECRUITING_STATUSES} onChange={(v) => handleInlineUpdate(p.program_id, "recruiting_status", v)} className="text-slate-300" />
                          </td>
                          <td className="px-3 py-2">
                            <InlineDateInput value={p.initial_contact_sent} onChange={(v) => handleInlineUpdate(p.program_id, "initial_contact_sent", v)} />
                          </td>
                          <td className="px-3 py-2">
                            <InlineSelect value={p.reply_status} options={REPLY_STATUSES} onChange={(v) => handleInlineUpdate(p.program_id, "reply_status", v)} className="text-slate-300" />
                          </td>
                          <td className="px-3 py-2">
                            <InlineDateInput value={p.last_follow_up} onChange={(v) => handleInlineUpdate(p.program_id, "last_follow_up", v)} />
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-center">{p.follow_up_days}</td>
                          <td className="px-3 py-2">
                            <InlineSelect value={p.next_action} options={NEXT_ACTIONS} onChange={(v) => handleInlineUpdate(p.program_id, "next_action", v)} className="text-slate-300" />
                          </td>
                          <td className="px-3 py-2">
                            <InlineDateInput value={p.next_action_due} onChange={(v) => handleInlineUpdate(p.program_id, "next_action_due", v)} />
                          </td>
                          <td className="px-3 py-2">
                            <InlineSelect value={p.priority} options={PRIORITIES} onChange={(v) => handleInlineUpdate(p.program_id, "priority", v)} className="text-slate-300" />
                          </td>
                          <td className="px-3 py-2 text-slate-400 truncate max-w-[120px]">{p.scholarship_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
