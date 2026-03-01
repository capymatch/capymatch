import { useState, useEffect, useCallback } from "react";
import { Calendar, MapPin, Plus, Trash2, Upload, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return d; }
}

function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (!s) return "TBA";
  if (!e || s === e) return s;
  return `${s} – ${e}`;
}

export default function ScheduleSection({ api }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", location: "", division: "" });
  const [parsing, setParsing] = useState(false);
  const [parsedEvents, setParsedEvents] = useState(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.get("/schedule");
      setEvents(res.events || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [api]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleAdd = async () => {
    if (!form.name) return toast.error("Event name is required");
    try {
      await api.post("/schedule", form);
      setForm({ name: "", start_date: "", end_date: "", location: "", division: "" });
      setShowAdd(false);
      fetchEvents();
      toast.success("Event added");
    } catch { toast.error("Failed to add event"); }
  };

  const handleDelete = async (eventId) => {
    await api.delete(`/schedule/${eventId}`);
    fetchEvents();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      let text = "";
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        text = await file.text();
      } else {
        // For PDF/images, read as text or use a simple extraction
        text = await file.text();
      }

      const res = await api.post("/schedule/parse", { text });
      if (res.events && res.events.length > 0) {
        setParsedEvents(res.events);
        toast.success(`Found ${res.events.length} events`);
      } else {
        toast.error(res.error || "Could not parse schedule");
      }
    } catch {
      toast.error("Failed to parse schedule");
    }
    setParsing(false);
    e.target.value = "";
  };

  const handleConfirmParsed = async () => {
    if (!parsedEvents?.length) return;
    try {
      await api.post("/schedule/bulk", { events: parsedEvents });
      toast.success(`Added ${parsedEvents.length} events`);
      setParsedEvents(null);
      fetchEvents();
    } catch { toast.error("Failed to add events"); }
  };

  if (loading) return null;

  const upcoming = events.filter(e => !e.start_date || e.start_date >= new Date().toISOString().split("T")[0]);
  const past = events.filter(e => e.start_date && e.start_date < new Date().toISOString().split("T")[0]);

  return (
    <div data-testid="schedule-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" style={{ color: "#1a8a80" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Tournament Schedule</h3>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(26,138,128,0.1)", color: "#1a8a80" }}>
            {upcoming.length} upcoming
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg cursor-pointer transition-all hover:bg-white/5 border" style={{ color: "#1a8a80", borderColor: "rgba(26,138,128,0.2)" }}>
            <Upload className="w-3 h-3" />
            {parsing ? "Parsing..." : "Upload"}
            <input type="file" accept=".csv,.txt,.pdf" className="hidden" onChange={handleFileUpload} disabled={parsing} />
          </label>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
            style={{ backgroundColor: "#1a8a80", color: "white" }}
            data-testid="add-event-btn"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* Parsed events review */}
      {parsedEvents && (
        <div className="rounded-xl border p-3 mb-3" style={{ backgroundColor: "rgba(26,138,128,0.05)", borderColor: "rgba(26,138,128,0.2)" }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>Review parsed events ({parsedEvents.length})</p>
            <div className="flex gap-2">
              <button onClick={() => setParsedEvents(null)} className="text-[11px] px-2 py-1 rounded" style={{ color: "var(--t-text-muted)" }}>Cancel</button>
              <button onClick={handleConfirmParsed} className="text-[11px] px-2.5 py-1 rounded font-medium" style={{ backgroundColor: "#1a8a80", color: "white" }} data-testid="confirm-parsed-btn">
                <Check className="w-3 h-3 inline mr-1" />Add all
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {parsedEvents.map((ev, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: "var(--t-surface)" }}>
                <div className="flex-1">
                  <span className="font-medium" style={{ color: "var(--t-text)" }}>{ev.name}</span>
                  <span className="ml-2" style={{ color: "var(--t-text-muted)" }}>{formatDateRange(ev.start_date, ev.end_date)}</span>
                  {ev.location && <span className="ml-2" style={{ color: "var(--t-text-muted)" }}>{ev.location}</span>}
                </div>
                <button onClick={() => setParsedEvents(prev => prev.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border p-3 mb-3 space-y-2" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tournament name" className="w-full text-sm px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="event-name-input" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="text-sm px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }} />
            <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="text-sm px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, State" className="text-sm px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }} />
            <input value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} placeholder="Division (e.g. 16 Elite)" className="text-sm px-3 py-2 rounded-lg border bg-transparent" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "var(--t-text-muted)" }}>Cancel</button>
            <button onClick={handleAdd} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ backgroundColor: "#1a8a80", color: "white" }} data-testid="save-event-btn">Save</button>
          </div>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "var(--t-text-muted)" }}>No events yet. Add your tournament schedule or upload a file.</p>
      ) : (
        <div className="space-y-1.5">
          {upcoming.map(ev => (
            <div key={ev.event_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border group" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid={`event-${ev.event_id}`}>
              <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(26,138,128,0.1)" }}>
                <span className="text-[9px] font-bold uppercase leading-none" style={{ color: "#1a8a80" }}>
                  {ev.start_date ? new Date(ev.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" }) : "TBA"}
                </span>
                <span className="text-sm font-bold leading-none" style={{ color: "#1a8a80" }}>
                  {ev.start_date ? new Date(ev.start_date + "T00:00:00").getDate() : "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--t-text)" }}>{ev.name}</p>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--t-text-muted)" }}>
                  {ev.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ev.location}</span>}
                  {ev.division && <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: "rgba(26,138,128,0.1)", color: "#1a8a80" }}>{ev.division}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(ev.event_id)} className="opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`delete-event-${ev.event_id}`}>
                <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted)" }} />
              </button>
            </div>
          ))}
          {past.length > 0 && (
            <details className="mt-2">
              <summary className="text-[11px] cursor-pointer" style={{ color: "var(--t-text-muted)" }}>Past events ({past.length})</summary>
              <div className="space-y-1.5 mt-1.5 opacity-50">
                {past.map(ev => (
                  <div key={ev.event_id} className="flex items-center gap-3 px-3 py-2 rounded-xl border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" style={{ color: "var(--t-text)" }}>{ev.name} — {formatDateRange(ev.start_date, ev.end_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
