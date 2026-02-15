import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useSubscription, getUsage } from "../lib/subscription";
import { ChevronRight, Calendar, MapPin, Eye, AlertTriangle, Send, Sparkles, CheckCircle, Circle, ArrowRight, X, User, GraduationCap, Mail as MailIcon } from "lucide-react";
import { toast } from "sonner";
import UpgradeModal from "../components/UpgradeModal";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [events, setEvents] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [profileViews, setProfileViews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem("onboarding_dismissed") === "true");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get("/dashboard"),
      api.get("/programs"),
      api.get("/events"),
      api.get("/reminders").catch(() => ({ data: { reminders: [], total_overdue: 0 } })),
      api.get("/profile-views").catch(() => ({ data: { views: [], total: 0, today: 0, this_week: 0 } })),
      api.get("/athlete-profile").catch(() => ({ data: {} })),
      api.get("/gmail/status").catch(() => ({ data: { connected: false } })),
    ])
      .then(([dashRes, progRes, evtRes, remRes, viewsRes, profRes, gmailRes]) => {
        setData(dashRes.data);
        setPrograms(progRes.data);
        setEvents(evtRes.data);
        setReminders(remRes.data.reminders || []);
        setProfileViews(viewsRes.data);
        setProfile(profRes.data);
        setGmailConnected(gmailRes.data?.connected || false);
      })
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalSchools = programs.length;
  const offersCount = programs.filter(p => p.recruiting_status === "Offer Received").length;
  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const schoolColors = ["bg-blue-500", "bg-pink-600", "bg-pink-500", "bg-emerald-500", "bg-amber-500", "bg-cyan-500", "bg-rose-500", "bg-indigo-500"];

  // Schools needing action
  const actionNeeded = programs
    .filter(p => p.next_action_due && p.recruiting_status !== "Not a Fit / Closed")
    .sort((a, b) => (a.next_action_due || "").localeCompare(b.next_action_due || ""))
    .slice(0, 5);

  // Upcoming events
  const today = new Date().toISOString().split("T")[0];
  const upcoming = events.filter(e => e.start_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date)).slice(0, 5);
  const typeBg = { Camp: "bg-pink-600/15 text-pink-500", Showcase: "bg-blue-500/15 text-blue-400", Tournament: "bg-amber-500/15 text-amber-400", Visit: "bg-emerald-500/15 text-emerald-400", Tryout: "bg-pink-500/15 text-pink-400", Meeting: "bg-cyan-500/15 text-cyan-400", Deadline: "bg-red-500/15 text-red-400", Other: "bg-gray-500/15 text-gray-400" };

  // Onboarding steps
  const profileDone = !!(profile?.athlete_name && profile?.position);
  const schoolsDone = programs.length > 0;
  const gmailDone = gmailConnected;
  const eventsDone = events.length > 0;
  const onboardingSteps = [
    { key: "profile", label: "Set up your athlete profile", description: "Add your name, position, stats, and a highlight video", icon: User, done: profileDone, action: () => navigate("/profile") },
    { key: "schools", label: "Add your first target school", description: "Browse the database and add schools to your pipeline", icon: GraduationCap, done: schoolsDone, action: () => navigate("/knowledge-base") },
    ...(subscription?.tier !== "basic" ? [{ key: "gmail", label: "Connect your Gmail", description: "Send and receive coach emails right from the app", icon: MailIcon, done: gmailDone, action: () => navigate("/settings") }] : []),
    { key: "events", label: "Add an upcoming event", description: "Camps, showcases, and visits — keep them all in one place", icon: Calendar, done: eventsDone, action: () => navigate("/calendar") },
  ];
  const completedCount = onboardingSteps.filter(s => s.done).length;
  const allDone = completedCount === onboardingSteps.length;
  const showOnboarding = !onboardingDismissed && !allDone;

  const dismissOnboarding = () => {
    localStorage.setItem("onboarding_dismissed", "true");
    setOnboardingDismissed(true);
  };

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Onboarding Checklist */}
      {showOnboarding && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--t-surface)", borderColor: "rgba(168, 85, 247, 0.25)" }}
          data-testid="onboarding-card"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Get started with Recruiting HQ</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{completedCount} of {onboardingSteps.length} complete</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Progress bar */}
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--t-border)" }}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-600 to-indigo-500 transition-all duration-500"
                  style={{ width: `${(completedCount / onboardingSteps.length) * 100}%` }}
                />
              </div>
              <button
                onClick={dismissOnboarding}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--t-text-muted)" }}
                data-testid="dismiss-onboarding-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
            {onboardingSteps.map((s) => (
              <button
                key={s.key}
                onClick={s.action}
                className="flex items-center gap-4 w-full px-5 py-3.5 text-left transition-colors group"
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                data-testid={`onboarding-step-${s.key}`}
              >
                {s.done ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 flex-shrink-0" style={{ color: "var(--t-text-faint)" }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.done ? "line-through opacity-50" : ""}`} style={{ color: "var(--t-text)" }}>{s.label}</p>
                  {!s.done && <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{s.description}</p>}
                </div>
                {!s.done && (
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--t-text-muted)" }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Active Schools */}
        <div className="rounded-xl p-4 lg:p-5 border flex items-center gap-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #f48fb1, #e8628a)", boxShadow: "0 4px 14px rgba(232,98,138,0.3)" }}>
            <GraduationCap className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--t-text)" }}>{totalSchools}</p>
            <p className="text-xs lg:text-sm" style={{ color: "var(--t-text-muted)" }}>Active Schools</p>
          </div>
        </div>

        {/* Offers Received — celebration style when > 0 */}
        {offersCount > 0 ? (
          <div className="rounded-xl p-4 lg:p-5 border flex items-center gap-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(255,193,7,0.12) 0%, rgba(255,152,0,0.06) 100%)", borderColor: "rgba(255,193,7,0.25)" }} data-testid="offers-card-celebration">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #ffe082, #ffc107)", boxShadow: "0 4px 14px rgba(255,193,7,0.3)" }}>
              <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-2xl lg:text-3xl font-bold text-amber-400">{offersCount}</p>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <p className="text-xs lg:text-sm text-amber-300/80 font-medium">Offers Received</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-4 lg:p-5 border flex items-center gap-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #ffe082, #ffc107)", boxShadow: "0 4px 14px rgba(255,193,7,0.15)" }}>
              <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--t-text)" }}>0</p>
              <p className="text-xs lg:text-sm" style={{ color: "var(--t-text-muted)" }}>Offers Received</p>
            </div>
          </div>
        )}

        {/* Follow-ups Overdue */}
        <div className="rounded-xl p-4 lg:p-5 border flex items-center gap-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: reminders.length > 0 ? "linear-gradient(135deg, #ef9a9a, #ef5350)" : "linear-gradient(135deg, #ef9a9a, #ef5350)", boxShadow: "0 4px 14px rgba(239,83,80,0.3)" }}>
            <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-bold" style={{ color: reminders.length > 0 ? "#ef5350" : "var(--t-text)" }}>{reminders.length}</p>
            <p className="text-xs lg:text-sm" style={{ color: "var(--t-text-muted)" }}>Follow-ups Overdue</p>
          </div>
        </div>

        {/* Profile Views */}
        <div className="rounded-xl p-4 lg:p-5 border flex items-center gap-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #80cbc4, #26a69a)", boxShadow: "0 4px 14px rgba(38,166,154,0.3)" }}>
            <Eye className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--t-text)" }}>{profileViews?.this_week || 0}</p>
            <p className="text-xs lg:text-sm" style={{ color: "var(--t-text-muted)" }}>Profile Views (7d)</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Schools + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Schools Requiring Action */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="schools-action-widget">
          <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4">
            <h4 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Schools Requiring Action</h4>
            <button onClick={() => navigate("/pipeline")} className="text-xs text-pink-600 hover:text-pink-500 transition-colors flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {actionNeeded.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
              {actionNeeded.map((prog, i) => (
                <div
                  key={prog.program_id}
                  className="flex items-center gap-3 px-4 lg:px-5 py-3 cursor-pointer transition-colors"
                  onClick={() => navigate(`/pipeline#${prog.recruiting_status === "Not Contacted" ? "not_contacted" : prog.recruiting_status?.includes("Active") ? "active" : "contacted"}`)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  data-testid={`school-action-${prog.program_id}`}
                >
                  <div className={`w-8 h-8 rounded-full ${schoolColors[i % schoolColors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                    {(prog.university_name || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{prog.university_name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--t-text-muted)" }}>
                      {prog.recruiting_status} {prog.division ? `· ${prog.division}` : ""}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] lg:text-[11px] px-2 lg:px-2.5 py-1 rounded-md" style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-secondary)" }}>
                      Follow Up
                    </span>
                    <p className="text-[10px] lg:text-[11px] mt-1" style={{ color: "var(--t-text-muted)" }}>{formatDate(prog.next_action_due)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 lg:py-10 px-5">
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No schools need action right now</p>
              <button onClick={() => navigate("/knowledge-base")} className="mt-2 text-sm text-pink-600 hover:text-pink-500 transition-colors">+ Add a school</button>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="events-widget">
          <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4">
            <h4 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Upcoming Events</h4>
            <button onClick={() => navigate("/calendar")} className="text-xs text-pink-600 hover:text-pink-500 transition-colors flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {upcoming.length > 0 ? (
            <>
              {/* Mobile: Card layout */}
              <div className="lg:hidden divide-y" style={{ borderColor: "var(--t-border)" }}>
                {upcoming.map((evt) => (
                  <div
                    key={evt.event_id}
                    onClick={() => navigate("/calendar")}
                    className="px-4 py-3 cursor-pointer transition-colors"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{evt.title}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${typeBg[evt.event_type] || "bg-gray-500/15 text-gray-400"}`}>{evt.event_type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "var(--t-text-muted)" }}>
                      <span>{formatDate(evt.start_date)}{evt.end_date && evt.end_date !== evt.start_date ? ` – ${formatDate(evt.end_date)}` : ""}</span>
                      {evt.location && <span className="truncate">· {evt.location}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: Table layout */}
              <table className="hidden lg:table w-full">
                <thead>
                  <tr className="border-t border-b" style={{ borderColor: "var(--t-border)" }}>
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider px-5 py-2.5" style={{ color: "var(--t-text-muted)" }}>Event</th>
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider px-4 py-2.5" style={{ color: "var(--t-text-muted)" }}>Date</th>
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider px-4 py-2.5" style={{ color: "var(--t-text-muted)" }}>Location</th>
                    <th className="text-right text-[11px] font-medium uppercase tracking-wider px-5 py-2.5" style={{ color: "var(--t-text-muted)" }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((evt) => (
                    <tr
                      key={evt.event_id}
                      onClick={() => navigate("/calendar")}
                      className="border-b cursor-pointer transition-colors"
                      style={{ borderColor: "var(--t-border)" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <td className="px-5 py-3"><span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{evt.title}</span></td>
                      <td className="px-4 py-3">
                        <span className="text-xs whitespace-nowrap" style={{ color: "var(--t-text-secondary)" }}>
                          {formatDate(evt.start_date)}{evt.end_date && evt.end_date !== evt.start_date ? ` – ${formatDate(evt.end_date)}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs" style={{ color: "var(--t-text-muted)" }}>{evt.location || "—"}</span></td>
                      <td className="px-5 py-3 text-right">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-md ${typeBg[evt.event_type] || "bg-gray-500/15 text-gray-400"}`}>{evt.event_type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="text-center py-8 lg:py-10 px-5">
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--t-text-faint)" }} />
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No upcoming events</p>
              <button onClick={() => navigate("/calendar")} className="mt-2 text-sm text-pink-600 hover:text-pink-500">+ Add event</button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Reminders + Profile Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Follow-Up Reminders */}
        <div id="reminders-section" className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="reminders-widget">
          <div className="flex items-center gap-2 px-4 lg:px-5 py-3 lg:py-4">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h4 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Follow-Up Reminders</h4>
            {reminders.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-500 font-medium ml-auto">{reminders.length} overdue</span>
            )}
          </div>
          {reminders.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--t-border)" }}>
              {reminders.slice(0, 4).map((r) => (
                <div
                  key={r.program_id}
                  className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 cursor-pointer transition-colors"
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--t-surface-hover)"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                  data-testid={`reminder-${r.program_id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{r.university_name}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--t-text-muted)" }}>
                      {r.coach_name ? `${r.coach_name} · ` : ""}{r.next_action || "Follow up needed"}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-orange-500 flex-shrink-0">{r.days_overdue}d</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate("/inbox"); }}
                    className="p-2 rounded-lg transition-colors hover:bg-pink-600/15"
                    title="Send follow-up"
                    data-testid={`send-followup-${r.program_id}`}
                  >
                    <Send className="w-4 h-4 text-pink-600" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 lg:py-10 px-5">
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No overdue follow-ups</p>
              <p className="text-xs mt-1" style={{ color: "var(--t-text-faint)" }}>Set follow-up dates on your programs and reminders will appear here.</p>
            </div>
          )}
        </div>

        {/* Profile Views */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="profile-views-widget">
          <div className="flex items-center gap-2 px-4 lg:px-5 py-3 lg:py-4">
            <Eye className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Profile Views</h4>
          </div>
          {profileViews && profileViews.total > 0 ? (
            <div className="px-4 lg:px-5 pb-4 lg:pb-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                  <p className="text-xl font-bold text-emerald-400">{profileViews.today}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>Today</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                  <p className="text-xl font-bold text-blue-400">{profileViews.this_week}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>This Week</p>
                </div>
                <div className="rounded-lg p-3 text-center" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                  <p className="text-xl font-bold" style={{ color: "var(--t-text)" }}>{profileViews.total}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>All Time</p>
                </div>
              </div>
              <p className="text-[11px] mt-3 text-center" style={{ color: "var(--t-text-muted)" }}>When coaches visit your public profile, views are tracked here.</p>
            </div>
          ) : (
            <div className="text-center py-10 px-5">
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No profile views yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--t-text-faint)" }}>When coaches visit your public profile, views will appear here.</p>
              <button onClick={() => navigate("/settings")} className="mt-2 text-sm text-pink-600 hover:text-pink-500 transition-colors">Share your profile</button>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} feature="max_schools" currentTier={subscription?.tier || "basic"} />
    </div>
  );
}
