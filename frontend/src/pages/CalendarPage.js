import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { ChevronLeft, ChevronRight, Clock, Plus, X, MapPin, Calendar, Trash2, Edit3, Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import NcaaTimeline from "./NcaaTimeline";

const EVENT_TYPES = ["Camp", "Showcase", "Tournament", "Visit", "Tryout", "Meeting", "Deadline", "Other"];
const EVENT_COLORS = {
  Camp: "bg-pink-600",
  Showcase: "bg-blue-500",
  Tournament: "bg-amber-500",
  Visit: "bg-emerald-500",
  Tryout: "bg-pink-500",
  Meeting: "bg-cyan-500",
  Deadline: "bg-red-500",
  Other: "bg-gray-500",
};

// ─── Event Modal ───
function EventModal({ onClose, onSaved, editEvent, programs }) {
  const [form, setForm] = useState({
    title: editEvent?.title || "",
    event_type: editEvent?.event_type || "Camp",
    location: editEvent?.location || "",
    description: editEvent?.description || "",
    start_date: editEvent?.start_date || "",
    end_date: editEvent?.end_date || "",
    start_time: editEvent?.start_time || "",
    end_time: editEvent?.end_time || "",
    program_id: editEvent?.program_id || "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error("Event name is required");
    if (!form.start_date) return toast.error("Start date is required");
    setSaving(true);
    try {
      if (editEvent) {
        await api.put(`/events/${editEvent.event_id}`, form);
        toast.success("Event updated");
      } else {
        await api.post("/events", form);
        toast.success("Event created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editEvent) return;
    setDeleting(true);
    try {
      await api.delete(`/events/${editEvent.event_id}`);
      toast.success("Event deleted");
      onSaved();
      onClose();
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleting(false);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="event-modal">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
          <h3 className="text-lg font-semibold" style={{ color: "var(--t-text)" }}>
            {editEvent ? "Edit Event" : "New Event"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--t-text-muted)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Event Name *</label>
            <input
              data-testid="event-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-pink-600/50"
              style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              placeholder="e.g. Nebraska Volleyball Camp"
            />
          </div>

          {/* Type + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Type</label>
              <select
                data-testid="event-type"
                value={form.event_type}
                onChange={(e) => set("event_type", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Location</label>
              <input
                data-testid="event-location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-pink-600/50"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                placeholder="City, State"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Start Date *</label>
              <input
                data-testid="event-start-date"
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>End Date</label>
              <input
                data-testid="event-end-date"
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              />
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Start Time</label>
              <input
                data-testid="event-start-time"
                type="time"
                value={form.start_time}
                onChange={(e) => set("start_time", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>End Time</label>
              <input
                data-testid="event-end-time"
                type="time"
                value={form.end_time}
                onChange={(e) => set("end_time", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              />
            </div>
          </div>

          {/* Linked School */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Linked School (optional)</label>
            <select
              data-testid="event-program"
              value={form.program_id}
              onChange={(e) => set("program_id", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none"
              style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
            >
              <option value="">None</option>
              {programs.map((p) => (
                <option key={p.program_id} value={p.program_id}>{p.university_name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Notes</label>
            <textarea
              data-testid="event-description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm border focus:outline-none focus:border-pink-600/50 resize-none"
              style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              placeholder="Any details about this event..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: "var(--t-border)" }}>
          {editEvent ? (
            <button
              data-testid="event-delete-btn"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg" style={{ color: "var(--t-text-muted)" }}>
              Cancel
            </button>
            <button
              data-testid="event-save-btn"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-pink-700 hover:bg-pink-800 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving..." : editEvent ? "Update" : "Create Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar ───
export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [programs, setPrograms] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const navigate = useNavigate();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = () => {
    Promise.all([
      api.get("/programs"),
      api.get("/events"),
    ])
      .then(([progRes, evtRes]) => {
        setPrograms(progRes.data);
        setEvents(evtRes.data);
      })
      .catch(() => toast.error("Failed to load calendar data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const followUps = programs.filter(
      (p) => p.next_action_due === dateStr || p.initial_contact_sent === dateStr || p.last_follow_up === dateStr
    ).map((p) => ({ ...p, _type: "followup", _color: "bg-blue-500" }));

    const userEvents = events.filter((e) => {
      if (e.start_date === dateStr) return true;
      if (e.end_date && e.start_date <= dateStr && e.end_date >= dateStr) return true;
      return false;
    }).map((e) => ({ ...e, _type: "event", _color: EVENT_COLORS[e.event_type] || "bg-gray-500" }));

    return [...userEvents, ...followUps];
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
  };

  const handleAddEvent = (prefillDate) => {
    setEditEvent(prefillDate ? { start_date: prefillDate } : null);
    setShowModal(true);
  };

  const handleEditEvent = (evt) => {
    if (evt._type === "event") {
      setEditEvent(evt);
      setShowModal(true);
    } else {
      navigate(`/programs/${evt.program_id}`);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hr = parseInt(h);
    return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  // Upcoming events for sidebar
  const today = new Date().toISOString().split("T")[0];
  const upcomingUserEvents = events
    .filter((e) => e.start_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 6);

  // Events for selected date
  const selectedDateEvents = selectedDate
    ? (() => {
        const day = parseInt(selectedDate.split("-")[2]);
        return getEventsForDate(day);
      })()
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" data-testid="calendar-loading">
        <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="calendar-page" className="space-y-6">
      {/* Tab Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="calendar-tabs">
          <button onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === "calendar" ? "bg-pink-700 text-white" : ""}`}
            style={activeTab !== "calendar" ? { color: "var(--t-text-muted)" } : {}}
            data-testid="tab-my-calendar">
            <Calendar className="w-4 h-4" /><span>My Calendar</span>
          </button>
          <button onClick={() => setActiveTab("ncaa")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === "ncaa" ? "bg-pink-700 text-white" : ""}`}
            style={activeTab !== "ncaa" ? { color: "var(--t-text-muted)" } : {}}
            data-testid="tab-ncaa-timeline">
            <GraduationCap className="w-4 h-4" /><span>NCAA Timeline</span>
          </button>
        </div>
        {activeTab === "calendar" && (
          <button
            data-testid="add-event-btn"
            onClick={() => handleAddEvent(null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-pink-700 hover:bg-pink-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        )}
      </div>

      {/* NCAA Timeline Tab */}
      {activeTab === "ncaa" && <div className="mt-6"><NcaaTimeline /></div>}

      {/* My Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            {/* Calendar Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--t-border)" }}>
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold" style={{ color: "var(--t-text)" }}>
                  {monthNames[month]} {year}
                </h2>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-muted)" }}
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 rounded-lg" style={{ color: "var(--t-text-muted)" }}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextMonth} className="p-2 rounded-lg" style={{ color: "var(--t-text-muted)" }}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--t-border)" }}>
              {dayNames.map((day) => (
                <div key={day} className="p-3 text-center text-sm font-medium" style={{ color: "var(--t-text-muted)" }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="h-20 p-3 border-b border-r" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface-alt)" }} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDate(day);
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = selectedDate === dateStr;

                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`h-20 p-3 border-b border-r transition-colors cursor-pointer hover:bg-pink-600/5 ${
                      isToday(day) ? "bg-pink-600/10" : isSelected ? "bg-pink-600/5" : ""
                    }`}
                    style={{ borderColor: "var(--t-border)" }}
                    data-testid={`calendar-day-${day}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isToday(day) ? "text-pink-500 font-semibold" : ""}`}
                        style={{ color: isToday(day) ? undefined : "var(--t-text-secondary)" }}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex gap-0.5">
                          {dayEvents.slice(0, 4).map((evt, idx) => (
                            <span key={idx} className={`w-2 h-2 rounded-full ${evt._color}`} />
                          ))}
                          {dayEvents.length > 4 && (
                            <span className="text-[9px] text-gray-400 ml-0.5">+{dayEvents.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Selected Date Detail */}
          {selectedDate && (
            <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: "var(--t-text)" }}>{formatDate(selectedDate)}</h3>
                <button
                  data-testid="add-event-date-btn"
                  onClick={() => handleAddEvent(selectedDate)}
                  className="p-1.5 rounded-lg text-pink-600 hover:bg-pink-600/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-2">
                  {selectedDateEvents.map((evt, i) => (
                    <div
                      key={i}
                      onClick={() => handleEditEvent(evt)}
                      className="p-3 rounded-lg cursor-pointer transition-colors"
                      style={{ backgroundColor: "var(--t-surface-alt)" }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${evt._color}`} />
                        <span className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>
                          {evt._type === "event" ? evt.title : evt.university_name}
                        </span>
                      </div>
                      {evt._type === "event" && (
                        <div className="ml-4 space-y-0.5">
                          <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{evt.event_type}</span>
                          {evt.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                              <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{evt.location}</span>
                            </div>
                          )}
                          {evt.start_time && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
                              <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                                {formatTime(evt.start_time)}{evt.end_time ? ` - ${formatTime(evt.end_time)}` : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {evt._type === "followup" && (
                        <span className="text-xs ml-4" style={{ color: "var(--t-text-muted)" }}>
                          {evt.next_action || "Follow-up"} - {evt.recruiting_status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm mb-2" style={{ color: "var(--t-text-muted)" }}>No events this day</p>
                  <button
                    onClick={() => handleAddEvent(selectedDate)}
                    className="text-sm text-pink-600 hover:text-pink-500 transition-colors"
                  >
                    + Add an event
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "var(--t-text)" }}>Upcoming Events</h3>
            </div>
            {upcomingUserEvents.length > 0 ? (
              <div className="space-y-2.5">
                {upcomingUserEvents.map((evt) => {
                  const color = EVENT_COLORS[evt.event_type] || "bg-gray-500";
                  const colorMap = { Camp: "border-pink-600", Showcase: "border-blue-500", Tournament: "border-amber-500", Visit: "border-emerald-500", Tryout: "border-pink-500", Meeting: "border-cyan-500", Deadline: "border-red-500", Other: "border-gray-500" };
                  const typeBg = { Camp: "bg-pink-600/15 text-pink-500", Showcase: "bg-blue-500/15 text-blue-400", Tournament: "bg-amber-500/15 text-amber-400", Visit: "bg-emerald-500/15 text-emerald-400", Tryout: "bg-pink-500/15 text-pink-400", Meeting: "bg-cyan-500/15 text-cyan-400", Deadline: "bg-red-500/15 text-red-400", Other: "bg-gray-500/15 text-gray-400" };
                  return (
                    <div
                      key={evt.event_id}
                      onClick={() => { setEditEvent(evt); setShowModal(true); }}
                      className={`flex rounded-lg overflow-hidden cursor-pointer transition-all hover:translate-x-0.5`}
                      style={{ backgroundColor: "var(--t-surface-alt)" }}
                    >
                      <div className={`w-1 flex-shrink-0 ${color}`} />
                      <div className="flex-1 px-3.5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--t-text)" }}>{evt.title}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs flex items-center gap-1" style={{ color: "var(--t-text-muted)" }}>
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              {formatDate(evt.start_date)}{evt.end_date && evt.end_date !== evt.start_date ? ` – ${formatDate(evt.end_date)}` : ""}
                            </span>
                            {evt.location && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "var(--t-text-muted)" }}>
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {evt.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-1 rounded-md flex-shrink-0 ${typeBg[evt.event_type] || "bg-gray-500/15 text-gray-400"}`}>
                          {evt.event_type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No upcoming events</p>
                <button
                  onClick={() => handleAddEvent(null)}
                  className="mt-2 text-sm text-pink-600 hover:text-pink-500 transition-colors"
                >
                  + Create your first event
                </button>
              </div>
            )}
          </div>

          {/* Event Type Legend */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <h3 className="font-semibold mb-3" style={{ color: "var(--t-text)" }}>Event Types</h3>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${EVENT_COLORS[t]}`} />
                  <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{t}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs" style={{ color: "var(--t-text-muted)" }}>Follow-up</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </div>
      )}

      {/* Event Modal */}
      {showModal && (
        <EventModal
          onClose={() => { setShowModal(false); setEditEvent(null); }}
          onSaved={fetchData}
          editEvent={editEvent?.event_id ? editEvent : editEvent?.start_date ? { start_date: editEvent.start_date } : null}
          programs={programs}
        />
      )}
    </div>
  );
}
