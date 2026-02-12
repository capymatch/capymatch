import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/programs")
      .then((res) => setPrograms(res.data))
      .catch(() => toast.error("Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  // Get calendar data
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get events for a specific date
  const getEventsForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return programs.filter(p => {
      if (p.next_action_due === dateStr) return true;
      if (p.initial_contact_sent === dateStr) return true;
      if (p.last_follow_up === dateStr) return true;
      return false;
    });
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  // Get upcoming events for sidebar
  const upcomingEvents = programs
    .filter(p => p.next_action_due)
    .sort((a, b) => new Date(a.next_action_due) - new Date(b.next_action_due))
    .slice(0, 5);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Event colors based on type
  const eventColors = ["bg-purple-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" data-testid="calendar-loading">
        <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="calendar-page" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-white/50 text-sm mt-1">Track your recruiting schedule and follow-ups</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Calendar Grid */}
        <div className="col-span-8">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            {/* Calendar Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-white">
                  {monthNames[month]} {year}
                </h2>
                <button 
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={prevMonth}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={nextMonth}
                  className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 border-b border-white/10">
              {dayNames.map((day) => (
                <div key={day} className="p-3 text-center text-white/40 text-sm font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {/* Empty cells for padding */}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="h-28 p-2 border-b border-r border-white/5 bg-white/[0.01]" />
              ))}
              
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const events = getEventsForDate(day);
                const dayOfWeek = (startPadding + i) % 7;
                const isLastRow = startPadding + i >= 35;
                
                return (
                  <div 
                    key={day}
                    className={`h-28 p-2 border-b border-r border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                      isToday(day) ? "bg-purple-500/10" : ""
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day) ? "text-purple-400" : "text-white/70"
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 2).map((event, idx) => (
                        <div 
                          key={event.program_id}
                          onClick={() => navigate(`/programs/${event.program_id}`)}
                          className={`${eventColors[idx % eventColors.length]} text-white text-xs px-2 py-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity`}
                        >
                          {event.university_name?.split(' ').slice(0, 2).join(' ')}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-white/40 text-xs px-2">
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar - Upcoming Events */}
        <div className="col-span-4 space-y-5">
          {/* Upcoming Events */}
          <div className="rounded-xl p-5 border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Upcoming Follow-ups</h3>
              <button 
                onClick={() => navigate("/follow-ups")}
                className="text-white/50 text-sm hover:text-white transition-colors"
              >
                View all
              </button>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event, i) => (
                  <div 
                    key={event.program_id}
                    onClick={() => navigate(`/programs/${event.program_id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 ${eventColors[i % eventColors.length]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{event.university_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/40" />
                        <span className="text-white/40 text-xs">{formatDate(event.next_action_due)}</span>
                      </div>
                      <p className="text-white/40 text-xs mt-1">{event.next_action || "Follow up"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/40 text-sm">No upcoming events</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl p-5 border border-white/10 bg-white/[0.02]">
            <h3 className="text-white font-semibold mb-4">This Month</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Follow-ups Due</span>
                <span className="text-white font-medium">
                  {programs.filter(p => {
                    if (!p.next_action_due) return false;
                    const d = new Date(p.next_action_due);
                    return d.getMonth() === month && d.getFullYear() === year;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Contacts Made</span>
                <span className="text-white font-medium">
                  {programs.filter(p => {
                    if (!p.initial_contact_sent) return false;
                    const d = new Date(p.initial_contact_sent);
                    return d.getMonth() === month && d.getFullYear() === year;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">Total Schools</span>
                <span className="text-white font-medium">{programs.length}</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-xl p-5 border border-white/10 bg-white/[0.02]">
            <h3 className="text-white font-semibold mb-4">Event Types</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span className="text-white/60 text-sm">Follow-up Due</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-white/60 text-sm">Initial Contact</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-white/60 text-sm">Response Received</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
