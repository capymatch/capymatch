import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import {
  ArrowLeft, Send, Mail, Phone, Calendar, MapPin, Star,
  MessageSquare, Video, Users, Sparkles, Loader2, ChevronDown, ChevronUp,
  Plus, Clock, Edit2, Trash2, Save, X, ExternalLink, GraduationCap,
  Heart, Target, AlertCircle, CheckCircle2, FileText
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const EVENT_ICONS = {
  email_sent: { icon: Send, color: "text-blue-400", bg: "bg-blue-500/10" },
  email_received: { icon: Mail, color: "text-green-400", bg: "bg-green-500/10" },
  phone_call: { icon: Phone, color: "text-purple-400", bg: "bg-purple-500/10" },
  video_call: { icon: Video, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  camp: { icon: Calendar, color: "text-orange-400", bg: "bg-orange-500/10" },
  visit: { icon: MapPin, color: "text-pink-400", bg: "bg-pink-500/10" },
  showcase: { icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  meeting: { icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  note: { icon: FileText, color: "text-gray-400", bg: "bg-gray-500/10" },
  interaction: { icon: MessageSquare, color: "text-gray-400", bg: "bg-gray-500/10" },
};

const STATUS_OPTIONS = ["Not Contacted", "Contacted", "Applied", "Camp Attended", "Offer Received", "Committed", "Not Interested"];
const REPLY_OPTIONS = ["No Reply", "Awaiting Reply", "Reply Received", "In Conversation"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Very High"];

// ─── Timeline Event ───
function TimelineEvent({ event }) {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_ICONS[event.event_type] || EVENT_ICONS.interaction;
  const Icon = config.icon;
  const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const hasLong = event.content && event.content.length > 120;

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0 group">
      <div className="absolute left-[18px] top-10 bottom-0 w-px bg-[var(--t-border)]" />
      <div className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>{event.title}</p>
          {event.coach_name && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-400">{event.coach_name}</span>
          )}
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>{formatDate(event.date)}</p>
        {event.content && (
          <div className="mt-1.5 p-2.5 rounded-lg border text-xs leading-relaxed" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}>
            {hasLong && !expanded ? (
              <><p className="line-clamp-2">{event.content}</p><button onClick={() => setExpanded(true)} className="text-purple-400 hover:text-purple-300 text-[10px] mt-1 font-medium">Show more</button></>
            ) : hasLong && expanded ? (
              <><p className="whitespace-pre-wrap">{event.content}</p><button onClick={() => setExpanded(false)} className="text-purple-400 hover:text-purple-300 text-[10px] mt-1 font-medium">Show less</button></>
            ) : <p>{event.content}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ───
function StatusBadge({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const colors = {
    "Not Contacted": "bg-gray-500/10 text-gray-400", "Contacted": "bg-blue-500/10 text-blue-400",
    "Applied": "bg-indigo-500/10 text-indigo-400", "Camp Attended": "bg-orange-500/10 text-orange-400",
    "Offer Received": "bg-green-500/10 text-green-400", "Committed": "bg-emerald-500/10 text-emerald-300",
    "Not Interested": "bg-red-500/10 text-red-400", "No Reply": "bg-gray-500/10 text-gray-400",
    "Awaiting Reply": "bg-yellow-500/10 text-yellow-400", "Reply Received": "bg-green-500/10 text-green-400",
    "In Conversation": "bg-purple-500/10 text-purple-400", "Low": "bg-gray-500/10 text-gray-400",
    "Medium": "bg-blue-500/10 text-blue-400", "High": "bg-orange-500/10 text-orange-400",
    "Very High": "bg-red-500/10 text-red-400",
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5" data-testid={`status-badge-${label.toLowerCase().replace(/\s/g, '-')}`}>
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--t-text-muted)" }}>{label}</span>
        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${colors[value] || "bg-gray-500/10 text-gray-400"}`}>{value}</span>
        <ChevronDown className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-44 rounded-lg border shadow-xl py-1" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-[var(--t-surface-hover)] ${o === value ? "font-semibold" : ""}`}
              style={{ color: "var(--t-text-secondary)" }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Interest Meter ───
function InterestMeter({ label, value, onChange, icon: Icon, color }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span className="text-xs font-medium" style={{ color: "var(--t-text-secondary)" }}>{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color: "var(--t-text)" }}>{value}/10</span>
      </div>
      <div className="flex gap-0.5">
        {[...Array(10)].map((_, i) => (
          <button key={i} onClick={() => onChange(i + 1)}
            className={`flex-1 h-2 rounded-sm transition-all ${i < value ? (color === "text-red-400" ? "bg-red-500" : "bg-purple-500") : "bg-[var(--t-border)]"}`}
            data-testid={`interest-${label.toLowerCase().replace(/\s/g, '-')}-${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Coach Card ───
function CoachCard({ coach, onEdit, onDelete }) {
  return (
    <div className="p-2.5 rounded-lg border group" style={{ borderColor: "var(--t-border)" }}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--t-text)" }}>{coach.coach_name}</p>
          <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>{coach.role}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><Edit2 className="w-3 h-3" style={{ color: "var(--t-text-muted)" }} /></button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/10"><Trash2 className="w-3 h-3 text-red-400" /></button>
        </div>
      </div>
      {coach.email && (
        <a href={`mailto:${coach.email}`} className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-1 truncate">
          <Mail className="w-3 h-3 flex-shrink-0" />{coach.email}
        </a>
      )}
      {coach.phone && <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: "var(--t-text-muted)" }}><Phone className="w-3 h-3" />{coach.phone}</p>}
    </div>
  );
}

// ─── Inline Coach Form ───
function CoachForm({ initial, programId, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { coach_name: "", role: "Head Coach", email: "", phone: "", notes: "" });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-purple-500";
  return (
    <div className="p-3 rounded-lg border space-y-2" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface-alt)" }}>
      <input placeholder="Coach name" value={form.coach_name} onChange={e => set("coach_name", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="coach-name-input" />
      <select value={form.role} onChange={e => set("role", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="coach-role-select">
        {["Head Coach", "Associate Head Coach", "Assistant Coach", "Recruiting Coordinator", "Director of Operations"].map(r => <option key={r}>{r}</option>)}
      </select>
      <input placeholder="Email" value={form.email} onChange={e => set("email", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="coach-email-input" />
      <input placeholder="Phone" value={form.phone} onChange={e => set("phone", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="coach-phone-input" />
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7" onClick={() => onSave({ ...form, program_id: programId })} data-testid="save-coach-btn"><Save className="w-3 h-3 mr-1" />Save</Button>
        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={onCancel} style={{ color: "var(--t-text-muted)" }}><X className="w-3 h-3 mr-1" />Cancel</Button>
      </div>
    </div>
  );
}

// ─── Log Interaction Form ───
function LogInteractionForm({ programId, universityName, onSaved, onCancel }) {
  const [form, setForm] = useState({ type: "Phone Call", notes: "", outcome: "Positive", date_time: new Date().toISOString().slice(0, 16) });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-purple-500";

  const save = async () => {
    if (!form.notes.trim()) { toast.error("Add a note"); return; }
    setSaving(true);
    try {
      await api.post("/interactions", { program_id: programId, university_name: universityName, type: form.type, notes: form.notes, outcome: form.outcome, date_time: form.date_time });
      toast.success("Interaction logged");
      onSaved();
    } catch { toast.error("Failed to log interaction"); } finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="log-interaction-form">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Log Interaction</h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="interaction-type-select">
          {["Phone Call", "Video Call", "Text Message", "Camp Meeting", "Campus Visit", "Showcase", "Other"].map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={form.outcome} onChange={e => set("outcome", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="interaction-outcome-select">
          {["Positive", "Neutral", "No Response", "Negative"].map(o => <option key={o}>{o}</option>)}
        </select>
        <input type="datetime-local" value={form.date_time} onChange={e => set("date_time", e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="interaction-date-input" />
      </div>
      <textarea placeholder="What happened? Key takeaways..." value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={`${inputCls} resize-none`} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="interaction-notes-input" />
      <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs w-full" onClick={save} disabled={saving} data-testid="save-interaction-btn">
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}Log Interaction
      </Button>
    </div>
  );
}

// ─── Inline Email Composer ───
function EmailComposer({ coaches, programId, onSent, onCancel }) {
  const [to, setTo] = useState(coaches?.[0]?.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-purple-500";

  const draftAI = async (type) => {
    setDrafting(true);
    try {
      const res = await api.post("/ai/draft-email", { program_id: programId, email_type: type });
      setSubject(res.data.subject || "");
      setBody(res.data.body || "");
      if (res.data.coach_email) setTo(res.data.coach_email);
      toast.success("AI draft ready");
    } catch { toast.error("Failed to generate draft"); } finally { setDrafting(false); }
  };

  const send = async () => {
    if (!to || !subject || !body) { toast.error("Fill all fields"); return; }
    setSending(true);
    try {
      await api.post("/gmail/send", { to, subject, body });
      toast.success("Email sent!");
      onSent();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to send. Is Gmail connected?");
    } finally { setSending(false); }
  };

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="email-composer">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Compose Email</h3>
        <button onClick={onCancel} className="p-1 rounded hover:bg-[var(--t-surface-alt)]"><X className="w-4 h-4" style={{ color: "var(--t-text-muted)" }} /></button>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {["intro", "follow_up", "thank_you", "interest_update"].map(t => (
          <button key={t} onClick={() => draftAI(t)} disabled={drafting}
            className="px-2 py-1 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50" data-testid={`draft-${t}-btn`}>
            <Sparkles className="w-3 h-3 inline mr-0.5" />{t.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {drafting && <div className="flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin text-purple-500" /><span className="text-xs" style={{ color: "var(--t-text-muted)" }}>AI is drafting...</span></div>}
      <select value={to} onChange={e => setTo(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="email-to-select">
        <option value="">Select recipient...</option>
        {coaches.filter(c => c.email).map(c => <option key={c.coach_id} value={c.email}>{c.coach_name} ({c.email})</option>)}
        <option value="_custom">Type custom email...</option>
      </select>
      {to === "_custom" && <input placeholder="coach@university.edu" onChange={e => setTo(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} />}
      <input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="email-subject-input" />
      <textarea placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} rows={6} className={`${inputCls} resize-none`} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="email-body-input" />
      <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs w-full" onClick={send} disabled={sending} data-testid="send-email-btn">
        {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}Send Email
      </Button>
    </div>
  );
}

// ─── Follow-up Scheduler ───
function FollowUpScheduler({ program, onSaved }) {
  const [date, setDate] = useState(program.next_action_due || "");
  const [action, setAction] = useState(program.next_action || "");
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none focus:ring-1 focus:ring-purple-500";

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/programs/${program.program_id}`, { next_action_due: date, next_action: action });
      toast.success("Follow-up scheduled");
      onSaved();
    } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-2" data-testid="followup-scheduler">
      <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="followup-date-input" />
      <input placeholder="Next action (e.g. Send follow-up email)" value={action} onChange={e => setAction(e.target.value)} className={inputCls} style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }} data-testid="followup-action-input" />
      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs w-full h-7" onClick={save} disabled={saving} data-testid="save-followup-btn">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Clock className="w-3 h-3 mr-1" />Set Reminder</>}
      </Button>
    </div>
  );
}

// ─── AI Summary (action bar + expandable block) ───
function AISummaryButton({ onClick, loading, hasResult }) {
  if (loading) return (
    <Button size="sm" variant="outline" className="text-xs h-8 ml-auto" disabled style={{ color: "var(--t-text-secondary)", borderColor: "var(--t-border)" }}>
      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-purple-500" />Analyzing...
    </Button>
  );
  return (
    <Button size="sm" variant={hasResult ? "default" : "outline"} className={`text-xs h-8 ml-auto ${hasResult ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
      onClick={onClick} style={hasResult ? {} : { color: "var(--t-text-secondary)", borderColor: "var(--t-border)" }} data-testid="generate-summary-btn">
      <Sparkles className="w-3.5 h-3.5 mr-1.5" />AI Insights
      {hasResult && <ChevronDown className="w-3 h-3 ml-1" />}
    </Button>
  );
}

function AISummaryBlock({ summary, onRegenerate, onDraftEmail, regenerating }) {
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="ai-insights-block">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}>
          <Sparkles className="w-4 h-4 text-purple-400" />AI Insights
        </h3>
        <button onClick={onRegenerate} disabled={regenerating} className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 disabled:opacity-50" data-testid="regenerate-summary-btn">
          {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}Regenerate
        </button>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>{summary.relationship_summary}</p>
      {summary.key_highlights?.length > 0 && (
        <ul className="space-y-1">
          {summary.key_highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--t-text-secondary)" }}>
              <CheckCircle2 className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />{h}
            </li>
          ))}
        </ul>
      )}
      <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <p className="text-xs font-medium text-purple-300">{summary.suggested_action}</p>
      </div>
      {summary.action_type === "email" && (
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7" onClick={onDraftEmail} data-testid="ai-draft-email-btn">
          <Mail className="w-3 h-3 mr-1" />Draft Email
        </Button>
      )}
    </div>
  );
}

// ─── Main Journey Page ───
export default function RecruitingJourney() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [keyDates, setKeyDates] = useState([]);
  const [loading, setLoading] = useState(true);
  // UI state
  const [showLogForm, setShowLogForm] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showCoachForm, setShowCoachForm] = useState(false);
  const [editCoach, setEditCoach] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiBlock, setShowAiBlock] = useState(false);

  const generateAiSummary = async () => {
    if (aiSummary && !showAiBlock) { setShowAiBlock(true); return; }
    if (aiSummary && showAiBlock) { setShowAiBlock(false); return; }
    setAiLoading(true);
    try {
      const res = await api.post("/ai/journey-summary", { program_id: programId });
      setAiSummary(res.data);
      setShowAiBlock(true);
    } catch { toast.error("Failed to generate summary"); } finally { setAiLoading(false); }
  };

  const regenerateAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await api.post("/ai/journey-summary", { program_id: programId });
      setAiSummary(res.data);
    } catch { toast.error("Failed to regenerate summary"); } finally { setAiLoading(false); }
  };

  const fetchData = useCallback(async () => {
    try {
      const [progRes, journeyRes, coachRes] = await Promise.all([
        api.get(`/programs/${programId}`),
        api.get(`/programs/${programId}/journey`),
        api.get(`/coaches?program_id=${programId}`),
      ]);
      setProgram(progRes.data);
      setTimeline(journeyRes.data.timeline || []);
      setCoaches(coachRes.data || []);

      // Fetch key dates (events linked to this program)
      try {
        const evtRes = await api.get("/events");
        const linked = (evtRes.data || []).filter(e => e.program_id === programId && e.start_date >= new Date().toISOString().slice(0, 10));
        setKeyDates(linked.slice(0, 5));
      } catch {}
    } catch {
      toast.error("Failed to load journey data");
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateProgram = async (updates) => {
    try {
      const res = await api.put(`/programs/${programId}`, updates);
      setProgram(res.data);
      toast.success("Updated");
    } catch { toast.error("Failed to update"); }
  };

  const saveCoach = async (data) => {
    try {
      if (editCoach) {
        await api.put(`/coaches/${editCoach.coach_id}`, data);
      } else {
        await api.post("/coaches", { ...data, university_name: program.university_name });
      }
      toast.success(editCoach ? "Coach updated" : "Coach added");
      setShowCoachForm(false);
      setEditCoach(null);
      const res = await api.get(`/coaches?program_id=${programId}`);
      setCoaches(res.data || []);
    } catch { toast.error("Failed to save coach"); }
  };

  const deleteCoach = async (coachId) => {
    try {
      await api.delete(`/coaches/${coachId}`);
      setCoaches(prev => prev.filter(c => c.coach_id !== coachId));
      toast.success("Coach removed");
    } catch { toast.error("Failed to delete"); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  if (!program) return (
    <div className="text-center py-24">
      <p style={{ color: "var(--t-text-muted)" }}>Program not found</p>
      <Button onClick={() => navigate("/pipeline")} className="mt-4">Back to Pipeline</Button>
    </div>
  );

  const formatDate = (d) => { try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); } catch { return d; } };

  return (
    <div data-testid="recruiting-journey" className="max-w-6xl mx-auto space-y-4">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/pipeline")} className="p-1.5 rounded-lg hover:bg-[var(--t-surface-alt)] transition-colors" style={{ color: "var(--t-text-muted)" }} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>{program.university_name}</h1>
              {program.division && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-400">{program.division}</span>}
              {program.website && (
                <a href={program.website} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-[var(--t-surface-alt)]" data-testid="school-website-link">
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                </a>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{program.conference}{program.region ? ` • ${program.region}` : ""} • {timeline.length} events</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <StatusBadge label="Status" value={program.recruiting_status} options={STATUS_OPTIONS} onChange={v => updateProgram({ recruiting_status: v })} />
          <StatusBadge label="Reply" value={program.reply_status} options={REPLY_OPTIONS} onChange={v => updateProgram({ reply_status: v })} />
          <StatusBadge label="Priority" value={program.priority} options={PRIORITY_OPTIONS} onChange={v => updateProgram({ priority: v })} />
        </div>
      </div>

      {/* ─── Action Bar ─── */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant={showLogForm ? "default" : "outline"} className={`text-xs h-8 ${showLogForm ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
          onClick={() => { setShowLogForm(!showLogForm); setShowEmailComposer(false); }} style={showLogForm ? {} : { color: "var(--t-text-secondary)", borderColor: "var(--t-border)" }} data-testid="toggle-log-btn">
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />Log Interaction
        </Button>
        <Button size="sm" variant={showEmailComposer ? "default" : "outline"} className={`text-xs h-8 ${showEmailComposer ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
          onClick={() => { setShowEmailComposer(!showEmailComposer); setShowLogForm(false); }} style={showEmailComposer ? {} : { color: "var(--t-text-secondary)", borderColor: "var(--t-border)" }} data-testid="toggle-email-btn">
          <Mail className="w-3.5 h-3.5 mr-1.5" />Send Email
        </Button>
      </div>

      {/* ─── Inline Forms ─── */}
      {showLogForm && <LogInteractionForm programId={programId} universityName={program.university_name} onSaved={() => { setShowLogForm(false); fetchData(); }} onCancel={() => setShowLogForm(false)} />}
      {showEmailComposer && <EmailComposer coaches={coaches} programId={programId} onSent={() => { setShowEmailComposer(false); fetchData(); }} onCancel={() => setShowEmailComposer(false)} />}

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline (left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="flex items-start justify-between gap-4 mb-4 relative">
              <h2 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Timeline</h2>
              <div className="flex-shrink-0 max-w-[280px]" data-testid="ai-insights-inline">
                <AISummary programId={programId} universityName={program.university_name} onDraftEmail={() => { setShowEmailComposer(true); setShowLogForm(false); }} />
              </div>
            </div>
            {timeline.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" style={{ color: "var(--t-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>No interactions yet</p>
                <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>Send an email or log an interaction to get started</p>
              </div>
            ) : timeline.map((event, i) => <TimelineEvent key={event.id || i} event={event} />)}
          </div>
        </div>

        {/* Sidebar (right col) */}
        <div className="lg:col-span-1 space-y-4">
          {/* Coach Contacts */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="coach-panel">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Users className="w-4 h-4 text-purple-400" />Coaches</h3>
              <button onClick={() => { setShowCoachForm(true); setEditCoach(null); }} className="p-1 rounded-lg hover:bg-[var(--t-surface-alt)]" data-testid="add-coach-btn"><Plus className="w-4 h-4 text-purple-400" /></button>
            </div>
            <div className="space-y-2">
              {coaches.length === 0 && !showCoachForm && <p className="text-xs text-center py-2" style={{ color: "var(--t-text-muted)" }}>No coaches added yet</p>}
              {coaches.map(c => <CoachCard key={c.coach_id} coach={c} onEdit={() => { setEditCoach(c); setShowCoachForm(true); }} onDelete={() => deleteCoach(c.coach_id)} />)}
              {showCoachForm && <CoachForm initial={editCoach} programId={programId} onSave={saveCoach} onCancel={() => { setShowCoachForm(false); setEditCoach(null); }} />}
            </div>
          </div>

          {/* Interest Meter */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="interest-meter">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Target className="w-4 h-4 text-purple-400" />Interest Level</h3>
            <div className="space-y-3">
              <InterestMeter label="Your Interest" value={program.athlete_interest || 5} onChange={v => updateProgram({ athlete_interest: v })} icon={Heart} color="text-red-400" />
              <InterestMeter label="School's Interest" value={program.school_interest || 0} onChange={v => updateProgram({ school_interest: v })} icon={GraduationCap} color="text-purple-400" />
            </div>
          </div>

          {/* Key Dates */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="key-dates-panel">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Calendar className="w-4 h-4 text-purple-400" />Key Dates</h3>
            {program.next_action_due && (
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-orange-300">Follow-up due {formatDate(program.next_action_due)}</span>
                </div>
                {program.next_action && <p className="text-[11px] mt-1" style={{ color: "var(--t-text-muted)" }}>{program.next_action}</p>}
              </div>
            )}
            {keyDates.length > 0 ? keyDates.map(e => (
              <div key={e.event_id} className="flex items-center gap-2 py-1.5 border-b last:border-0" style={{ borderColor: "var(--t-border)" }}>
                <Calendar className="w-3 h-3 text-purple-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--t-text)" }}>{e.title}</p>
                  <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{formatDate(e.start_date)}{e.location ? ` • ${e.location}` : ""}</p>
                </div>
              </div>
            )) : !program.next_action_due && <p className="text-xs text-center py-2" style={{ color: "var(--t-text-muted)" }}>No upcoming dates</p>}
          </div>

          {/* Follow-up Scheduler */}
          <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="followup-section">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: "var(--t-text)" }}><Clock className="w-4 h-4 text-purple-400" />Schedule Follow-up</h3>
            <FollowUpScheduler program={program} onSaved={fetchData} />
          </div>

        </div>
      </div>
    </div>
  );
}
