import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Download, Upload, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle2, Edit2, Trash2, Save, GraduationCap } from "lucide-react";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import api from "../lib/api";
import { DIVISIONS, REGIONS } from "../lib/constants";
import { toast } from "sonner";

const PLAN_COLORS = {
  D1: "bg-emerald-500/15 text-emerald-400",
  D2: "bg-blue-500/15 text-blue-400",
  D3: "bg-violet-500/15 text-violet-400",
  NAIA: "bg-orange-500/15 text-orange-400",
  JUCO: "bg-yellow-500/15 text-yellow-400",
};

/* ── Health Stats Bar ── */
function HealthBar({ health }) {
  if (!health) return null;
  const items = [
    { label: "Total", value: health.total, color: "text-white" },
    { label: "Complete", value: health.complete_profiles, color: "text-emerald-400" },
    { label: "No Coach", value: health.missing_coach, color: "text-teal-400" },
    { label: "No Email", value: health.missing_email, color: "text-amber-400" },
    { label: "No Coordinator", value: health.missing_coordinator, color: "text-orange-400" },
  ];
  return (
    <div className="flex flex-wrap gap-2" data-testid="health-bar">
      {items.map(i => (
        <div key={i.label} className="rounded-lg border px-3 py-2 min-w-[100px]" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <p className={`text-lg font-bold ${i.color}`}>{i.value}</p>
          <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{i.label}</p>
        </div>
      ))}
      <div className="rounded-lg border px-3 py-2 min-w-[100px]" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <p className="text-lg font-bold text-teal-400">{health.completeness_pct}%</p>
        <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>Data Health</p>
      </div>
    </div>
  );
}

/* ── University Form Modal ── */
function UniversityModal({ open, onClose, onSaved, initial }) {
  const [form, setForm] = useState({
    university_name: "", division: "", conference: "", region: "",
    website: "", mascot: "", primary_coach: "", coach_email: "",
    recruiting_coordinator: "", coordinator_email: "", scholarship_type: "", roster_needs: "",
  });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  useEffect(() => {
    if (initial) {
      setForm({ ...form, ...initial });
    } else {
      setForm({
        university_name: "", division: "", conference: "", region: "",
        website: "", mascot: "", primary_coach: "", coach_email: "",
        recruiting_coordinator: "", coordinator_email: "", scholarship_type: "", roster_needs: "",
      });
    }
  }, [initial, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.university_name.trim()) {
      toast.error("University name is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/universities/${encodeURIComponent(initial.university_name)}`, form);
        toast.success("University updated");
      } else {
        await api.post("/admin/universities", form);
        toast.success("University created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border p-6 shadow-2xl"
        style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
        onClick={e => e.stopPropagation()}
        data-testid="university-modal"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: "var(--t-text)" }}>
            {isEdit ? "Edit University" : "Add University"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>University Name *</label>
            <Input value={form.university_name} onChange={e => set("university_name", e.target.value)} disabled={isEdit} className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-name" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Division</label>
            <Select value={form.division || "none"} onValueChange={v => set("division", v === "none" ? "" : v)}>
              <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-division">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                <SelectItem value="none">None</SelectItem>
                {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Conference</label>
            <Input value={form.conference} onChange={e => set("conference", e.target.value)} className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-conference" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Region</label>
            <Select value={form.region || "none"} onValueChange={v => set("region", v === "none" ? "" : v)}>
              <SelectTrigger className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-region">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
                <SelectItem value="none">None</SelectItem>
                {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Website</label>
            <Input value={form.website} onChange={e => set("website", e.target.value)} className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-website" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Mascot</label>
            <Input value={form.mascot} onChange={e => set("mascot", e.target.value)} className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-mascot" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Scholarship Type</label>
            <Input value={form.scholarship_type} onChange={e => set("scholarship_type", e.target.value)} className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-scholarship" />
          </div>

          <div className="sm:col-span-2 mt-2 border-t pt-3" style={{ borderColor: "var(--t-border)" }}>
            <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--t-text)" }}>Coach Information</h4>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Head Coach</label>
            <Input value={form.primary_coach} onChange={e => set("primary_coach", e.target.value)} className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-coach" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Coach Email</label>
            <Input value={form.coach_email} onChange={e => set("coach_email", e.target.value)} type="email" className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-coach-email" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Recruiting Coordinator</label>
            <Input value={form.recruiting_coordinator} onChange={e => set("recruiting_coordinator", e.target.value)} className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-coordinator" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Coordinator Email</label>
            <Input value={form.coordinator_email} onChange={e => set("coordinator_email", e.target.value)} type="email" className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-coordinator-email" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--t-text-secondary)" }}>Roster Needs</label>
            <Input value={form.roster_needs} onChange={e => set("roster_needs", e.target.value)} placeholder="e.g. Setter, Middle Blocker" className="text-sm" style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-form-roster" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" onClick={onClose} className="text-xs" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="text-xs bg-teal-600 hover:bg-teal-700 text-white" data-testid="uni-form-save">
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create University"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── CSV Import Modal ── */
function ImportModal({ open, onClose, onImported }) {
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  if (!open) return null;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target.result);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText.trim()) { toast.error("No CSV data"); return; }
    setImporting(true);
    try {
      const res = await api.post("/admin/universities/import", { csv_data: csvText });
      setResult(res.data);
      toast.success(`Imported: ${res.data.created} created, ${res.data.updated} updated`);
      onImported();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border p-6 shadow-2xl"
        style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
        onClick={e => e.stopPropagation()}
        data-testid="import-modal"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: "var(--t-text)" }}>Import CSV</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--t-text-muted)" }}>
          Upload a CSV with columns: university_name, division, conference, region, website, mascot, primary_coach, coach_email, recruiting_coordinator, coordinator_email, scholarship_type, roster_needs. Existing universities will be updated, new ones created.
        </p>
        <input type="file" accept=".csv" onChange={handleFile} className="mb-3 text-xs" data-testid="import-file-input" style={{ color: "var(--t-text)" }} />
        {csvText && <p className="text-[10px] mb-3 text-emerald-400">{csvText.split("\n").length - 1} rows detected</p>}
        {result && (
          <div className="mb-3 p-3 rounded-lg text-xs" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
            <p style={{ color: "var(--t-text)" }}>Created: <span className="text-emerald-400 font-bold">{result.created}</span> | Updated: <span className="text-amber-400 font-bold">{result.updated}</span> | Errors: <span className="text-teal-400 font-bold">{result.errors?.length || 0}</span></p>
            {result.errors?.length > 0 && <ul className="mt-1 text-teal-400">{result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}</ul>}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="text-xs" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>Close</Button>
          <Button onClick={handleImport} disabled={importing || !csvText} className="text-xs bg-teal-600 hover:bg-teal-700 text-white" data-testid="import-submit">
            {importing ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function AdminUniversities() {
  const [universities, setUniversities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("all");
  const [region, setRegion] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [health, setHealth] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editUni, setEditUni] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const fetchUniversities = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      if (division !== "all") params.division = division;
      if (region !== "all") params.region = region;
      if (healthFilter !== "all") params.health = healthFilter;
      const res = await api.get("/admin/universities", { params });
      setUniversities(res.data.universities);
      setTotal(res.data.total);
    } catch {
      toast.error("Failed to load universities");
    } finally {
      setLoading(false);
    }
  }, [search, division, region, healthFilter, page]);

  const fetchHealth = async () => {
    try {
      const res = await api.get("/admin/universities/health");
      setHealth(res.data);
    } catch {}
  };

  useEffect(() => { fetchUniversities(); }, [fetchUniversities]);
  useEffect(() => { fetchHealth(); }, []);

  const handleExport = () => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/admin/universities/export`;
    window.open(url, "_blank");
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/universities/${encodeURIComponent(name)}`);
      toast.success("Deleted");
      fetchUniversities();
      fetchHealth();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete");
    }
  };

  const handleEdit = (uni) => { setEditUni(uni); setShowModal(true); };
  const handleAdd = () => { setEditUni(null); setShowModal(true); };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4" data-testid="admin-universities-page">
      {/* Health Stats */}
      <HealthBar health={health} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search universities..." className="pl-9 text-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="uni-search" />
        </div>
        <Select value={division} onValueChange={v => { setDivision(v); setPage(1); }}>
          <SelectTrigger className="w-28 text-xs" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }} data-testid="uni-filter-division">
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Divisions</SelectItem>
            {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={region} onValueChange={v => { setRegion(v); setPage(1); }}>
          <SelectTrigger className="w-28 text-xs" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }} data-testid="uni-filter-region">
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={v => { setHealthFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32 text-xs" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }} data-testid="uni-filter-health">
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ backgroundColor: "var(--t-dropdown-bg)", borderColor: "var(--t-border)" }}>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="missing_coach">Missing Coach</SelectItem>
            <SelectItem value="missing_email">Missing Email</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1.5 ml-auto">
          <Button variant="outline" onClick={handleExport} className="text-xs" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }} data-testid="uni-export-btn">
            <Download className="w-3.5 h-3.5 mr-1" /> Export
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)} className="text-xs" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }} data-testid="uni-import-btn">
            <Upload className="w-3.5 h-3.5 mr-1" /> Import
          </Button>
          <Button onClick={handleAdd} className="text-xs bg-teal-600 hover:bg-teal-700 text-white" data-testid="uni-add-btn">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add University
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="uni-table">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--t-border)" }}>
                <th className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>University</th>
                <th className="text-left px-3 py-3 text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>Division</th>
                <th className="text-left px-3 py-3 text-xs font-medium hidden md:table-cell" style={{ color: "var(--t-text-muted)" }}>Conference</th>
                <th className="text-left px-3 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--t-text-muted)" }}>Region</th>
                <th className="text-left px-3 py-3 text-xs font-medium hidden md:table-cell" style={{ color: "var(--t-text-muted)" }}>Head Coach</th>
                <th className="text-left px-3 py-3 text-xs font-medium hidden lg:table-cell" style={{ color: "var(--t-text-muted)" }}>Coach Email</th>
                <th className="text-left px-3 py-3 text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>Health</th>
                <th className="text-right px-3 py-3 text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto" /></td></tr>
              ) : universities.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-xs" style={{ color: "var(--t-text-muted)" }}>No universities found</td></tr>
              ) : (
                universities.map(u => {
                  const hasCoach = u.primary_coach && u.primary_coach.trim();
                  const hasEmail = u.coach_email && u.coach_email.trim();
                  const isComplete = hasCoach && hasEmail;
                  return (
                    <tr key={u.university_name} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.04)" }} data-testid={`uni-row-${u.university_name}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-teal-400 flex-shrink-0" />
                          <span className="font-medium text-[13px] truncate max-w-[200px]" style={{ color: "var(--t-text)" }}>{u.university_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${PLAN_COLORS[u.division] || "bg-gray-500/15 text-gray-400"}`}>{u.division || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs truncate max-w-[120px] block" style={{ color: "var(--t-text-secondary)" }}>{u.conference || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <span className="text-xs" style={{ color: "var(--t-text-secondary)" }}>{u.region || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs truncate max-w-[140px] block" style={{ color: hasCoach ? "var(--t-text)" : "var(--t-text-muted)" }}>
                          {u.primary_coach || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <span className="text-xs truncate max-w-[160px] block" style={{ color: hasEmail ? "var(--t-text)" : "var(--t-text-muted)" }}>
                          {u.coach_email || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(u)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Edit" data-testid={`uni-edit-${u.university_name}`}>
                            <Edit2 className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
                          </button>
                          <button onClick={() => handleDelete(u.university_name)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete" data-testid={`uni-delete-${u.university_name}`}>
                            <Trash2 className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: "var(--t-border)" }}>
            <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{total} universities</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
              </button>
              <span className="text-xs px-2" style={{ color: "var(--t-text)" }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
              </button>
            </div>
          </div>
        )}
      </div>

      <UniversityModal open={showModal} onClose={() => { setShowModal(false); setEditUni(null); }} onSaved={() => { fetchUniversities(); fetchHealth(); }} initial={editUni} />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImported={() => { fetchUniversities(); fetchHealth(); }} />
    </div>
  );
}
