import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Camera, Check, Copy, ExternalLink, ChevronDown, Eye, QrCode, Mail, Share2, Loader2 } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

/* ── Profile Completeness Calculation ── */
const PROFILE_FIELDS = [
  { key: "athlete_name", label: "Full Name", section: "athlete" },
  { key: "graduation_year", label: "Graduation Year", section: "athlete" },
  { key: "position", label: "Position", section: "athlete" },
  { key: "height", label: "Height", section: "athlete" },
  { key: "jersey_number", label: "Jersey #", section: "athlete" },
  { key: "standing_reach", label: "Standing Reach", section: "measurables" },
  { key: "approach_touch", label: "Approach Touch", section: "measurables" },
  { key: "club_team", label: "Club Team", section: "team" },
  { key: "high_school", label: "High School", section: "team" },
  { key: "city", label: "City", section: "team" },
  { key: "bio", label: "Bio", section: "media" },
  { key: "video_link", label: "Highlights Video", section: "media" },
  { key: "contact_email", label: "Email", section: "contact" },
  { key: "parent_name", label: "Coach Name", section: "contact" },
];

function getCompleteness(profile) {
  if (!profile) return { pct: 0, filled: 0, total: PROFILE_FIELDS.length, next: null };
  let filled = 0;
  let next = null;
  for (const f of PROFILE_FIELDS) {
    if (profile[f.key]) filled++;
    else if (!next) next = f;
  }
  return { pct: Math.round((filled / PROFILE_FIELDS.length) * 100), filled, total: PROFILE_FIELDS.length, next };
}

/* ── Completeness Ring SVG ── */
function CompletenessRing({ pct }) {
  const r = 28, C = 2 * Math.PI * r;
  const offset = C - (pct / 100) * C;
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
        <defs><linearGradient id="rg"><stop offset="0%" stopColor="#e8456b" /><stop offset="100%" stopColor="#6366f1" /></linearGradient></defs>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--t-border)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="url(#rg)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold text-base" style={{ color: "#e8456b", fontFamily: "'Barlow Condensed', sans-serif" }}>{pct}%</div>
    </div>
  );
}

/* ── Collapsible Section Card ── */
function SectionCard({ icon, iconBg, title, summary, status, statusColor, children, defaultOpen = false, testId }) {
  const [open, setOpen] = useState(defaultOpen);
  const colors = { complete: { bg: "#e6f5ee", color: "#059669" }, partial: { bg: "#fef3c7", color: "#d97706" }, empty: { bg: "#fee2e2", color: "#dc2626" } };
  const sc = colors[statusColor] || colors.complete;
  return (
    <div data-testid={testId} className="rounded-xl border overflow-hidden mb-3 transition-shadow hover:shadow-sm" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-left" data-testid={`${testId}-toggle`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>{icon}</div>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--t-text)" }}>{title}</div>
            <div className="text-[11px] mt-0.5" style={{ color: status === "complete" ? "var(--t-text-muted)" : "#d97706" }}>{summary}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: sc.bg, color: sc.color }}>{status === "complete" ? "Complete" : status === "partial" ? "Needs Attention" : "Incomplete"}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} style={{ color: "var(--t-text-muted)" }} />
        </div>
      </button>
      {open && <div className="px-5 pb-5 pt-1" onClick={e => e.stopPropagation()}>{children}</div>}
    </div>
  );
}

/* ── Field Input ── */
function Field({ label, value, onChange, placeholder, type = "text", coachVisible, colSpan, testId }) {
  return (
    <div style={colSpan ? { gridColumn: `span ${colSpan}` } : undefined}>
      <div className="flex items-center gap-1 mb-1.5">
        <label className="text-[11px] font-medium" style={{ color: "var(--t-text-muted)" }}>{label}</label>
        {coachVisible && <Eye className="w-3 h-3" style={{ color: "#6366f1" }} title="Visible to coaches" />}
      </div>
      {type === "textarea" ? (
        <textarea data-testid={testId} className="w-full rounded-lg border px-3 py-2.5 text-[13px] outline-none transition-all resize-none min-h-[80px]"
          style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          onFocus={e => e.target.style.borderColor = "#e8456b"} onBlur={e => e.target.style.borderColor = ""} />
      ) : type === "select" ? (
        <select data-testid={testId} className="w-full rounded-lg border px-3 py-2.5 text-[13px] outline-none"
          style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          value={value || ""} onChange={e => onChange(e.target.value)}>
          <option value="">Select...</option><option value="Right">Right</option><option value="Left">Left</option>
        </select>
      ) : (
        <input data-testid={testId} type={type} className="w-full rounded-lg border px-3 py-2.5 text-[13px] outline-none transition-all"
          style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          onFocus={e => e.target.style.borderColor = "#e8456b"} onBlur={e => e.target.style.borderColor = ""} />
      )}
    </div>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const navigate = useNavigate();
  const photoRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    Promise.all([api.get("/athlete-profile"), api.get("/share-link")])
      .then(([profRes, linkRes]) => {
        setProfile(profRes.data);
        setShareLink(`${window.location.origin}/s/${linkRes.data.tenant_id.replace("tenant_", "")}`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateField = useCallback((key, val) => {
    setProfile(p => ({ ...p, [key]: val }));
    setAutoSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = { ...profile, [key]: val };
        await api.put("/athlete-profile", updated);
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2500);
      } catch {
        toast.error("Failed to save");
      }
    }, 1200);
  }, [profile]);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) return toast.error("Photo must be under 5MB");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.post("/athlete-profile/photo", { photo_data: reader.result });
        setProfile(p => ({ ...p, photo_url: reader.result }));
        toast.success("Photo updated");
      } catch { toast.error("Upload failed"); }
    };
    reader.readAsDataURL(file);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#e8456b" }} /></div>
  );
  if (!profile) return (
    <div className="flex items-center justify-center min-h-[60vh]"><p style={{ color: "var(--t-text-muted)" }}>Unable to load profile</p></div>
  );

  const comp = getCompleteness(profile);
  const athleteSummary = [profile.athlete_name, profile.graduation_year && `Class of ${profile.graduation_year}`, profile.position].filter(Boolean).join(" · ") || "Not started";
  const measSummary = [profile.standing_reach && `${profile.standing_reach} reach`, profile.approach_touch && `${profile.approach_touch} approach`, profile.gpa && `${profile.gpa} GPA`].filter(Boolean).join(" · ") || "Not started";
  const teamSummary = [profile.club_team, profile.high_school, [profile.city, profile.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "Not started";
  const mediaSummary = profile.bio ? "Bio added" : "Missing bio — coaches love reading your story";
  const contactSummary = [profile.contact_email, profile.parent_name && `Coach ${profile.parent_name}`].filter(Boolean).join(" · ") || "Not started";

  const sectionStatus = (keys) => {
    const filled = keys.filter(k => profile[k]).length;
    if (filled === keys.length) return "complete";
    if (filled > 0) return "partial";
    return "empty";
  };

  return (
    <div className="max-w-[620px] mx-auto px-4 sm:px-6 py-6" data-testid="profile-page">
      {/* ── Top Bar: Auto-save indicator ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>Athlete Profile</h2>
        {autoSaved && (
          <div className="flex items-center gap-1.5 text-xs font-medium animate-fade-in" style={{ color: "#10b981" }}>
            <Check className="w-3.5 h-3.5" /> Auto-saved
          </div>
        )}
      </div>

      {/* ── Completeness Ring ── */}
      <div data-testid="profile-completeness" className="rounded-xl border p-5 mb-4 flex items-center gap-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <CompletenessRing pct={comp.pct} />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Profile Strength</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>{comp.filled} of {comp.total} fields completed</p>
          {comp.next && <p className="text-xs mt-1 font-medium" style={{ color: "#e8456b" }}>Add {comp.next.label.toLowerCase()} to boost your profile</p>}
        </div>
      </div>

      {/* ── Photo Hero ── */}
      <div data-testid="profile-photo-hero" className="rounded-xl border p-5 mb-4 flex items-center gap-5" style={{ background: "linear-gradient(135deg, rgba(232,69,107,0.04), rgba(99,102,241,0.04))", borderColor: "var(--t-border)" }}>
        <div className="relative w-[100px] h-[100px] rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer group border-2 border-white shadow-lg" onClick={() => photoRef.current?.click()}>
          {profile.photo_url ? (
            <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--t-surface-alt)" }}><User className="w-8 h-8" style={{ color: "var(--t-text-muted)" }} /></div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Profile Photo</h3>
          <p className="text-xs mt-1" style={{ color: "var(--t-text-secondary)" }}>First thing coaches see. Make it count!</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px]" style={{ color: "var(--t-text-muted)" }}>
            <Check className="w-3 h-3" style={{ color: "#10b981" }} /> Action shots work best
          </div>
        </div>
      </div>

      {/* ── Share Card ── */}
      <div data-testid="profile-share-card" className="rounded-xl p-5 mb-4" style={{ background: "linear-gradient(135deg, #1a1a2e, #2d2d44)" }}>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Share2 className="w-4 h-4" /> Share Your Profile</h3>
        <div className="flex flex-wrap gap-2">
          <button data-testid="share-copy-link" onClick={copyLink} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors" style={{ background: "#e8456b", color: "white" }}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied!" : "Copy Link"}
          </button>
          <a href={shareLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors" style={{ background: "rgba(255,255,255,0.12)", color: "white" }}>
            <ExternalLink className="w-3.5 h-3.5" /> Preview
          </a>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors" style={{ background: "rgba(255,255,255,0.12)", color: "white" }}>
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
        </div>
      </div>

      {/* ── Section: Athlete Info ── */}
      <SectionCard testId="section-athlete-info" defaultOpen={true}
        icon={<User className="w-4 h-4" style={{ color: "#e8456b" }} />} iconBg="#fce8ed"
        title="Athlete Info" summary={athleteSummary}
        status={sectionStatus(["athlete_name", "graduation_year", "position", "height", "jersey_number"])}
        statusColor={sectionStatus(["athlete_name", "graduation_year", "position", "height", "jersey_number"])}>
        <div className="grid gap-3 mb-3">
          <Field testId="field-athlete-name" label="Full Name" value={profile.athlete_name} onChange={v => updateField("athlete_name", v)} coachVisible />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field testId="field-grad-year" label="Graduation Year" value={profile.graduation_year} onChange={v => updateField("graduation_year", v)} />
          <Field testId="field-position" label="Position" value={profile.position} onChange={v => updateField("position", v)} coachVisible />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field testId="field-height" label="Height" value={profile.height} onChange={v => updateField("height", v)} coachVisible />
          <Field testId="field-weight" label="Weight (lbs)" value={profile.weight} onChange={v => updateField("weight", v)} />
          <Field testId="field-jersey" label="Jersey #" value={profile.jersey_number} onChange={v => updateField("jersey_number", v)} />
        </div>
      </SectionCard>

      {/* ── Section: Athletic Measurables ── */}
      <SectionCard testId="section-measurables" defaultOpen={true}
        icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>} iconBg="#e8edf8"
        title="Athletic Measurables" summary={measSummary}
        status={sectionStatus(["standing_reach", "approach_touch", "block_touch"])}
        statusColor={sectionStatus(["standing_reach", "approach_touch", "block_touch"])}>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Field testId="field-handed" label="Handed" value={profile.handed} onChange={v => updateField("handed", v)} type="select" />
          <Field testId="field-standing-reach" label="Standing Reach" value={profile.standing_reach} onChange={v => updateField("standing_reach", v)} coachVisible />
          <Field testId="field-approach-touch" label="Approach Touch" value={profile.approach_touch} onChange={v => updateField("approach_touch", v)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field testId="field-block-touch" label="Block Touch" value={profile.block_touch} onChange={v => updateField("block_touch", v)} />
          <Field testId="field-wingspan" label="Wingspan" value={profile.wingspan} onChange={v => updateField("wingspan", v)} />
          <Field testId="field-gpa" label="GPA" value={profile.gpa} onChange={v => updateField("gpa", v)} coachVisible />
        </div>
      </SectionCard>

      {/* ── Section: Team & Location ── */}
      <SectionCard testId="section-team-location"
        icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>} iconBg="#e6f5ee"
        title="Team & Location" summary={teamSummary}
        status={sectionStatus(["club_team", "high_school", "city"])}
        statusColor={sectionStatus(["club_team", "high_school", "city"])}>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field testId="field-club-team" label="Club Team" value={profile.club_team} onChange={v => updateField("club_team", v)} />
          <Field testId="field-high-school" label="High School" value={profile.high_school} onChange={v => updateField("high_school", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field testId="field-city" label="City" value={profile.city} onChange={v => updateField("city", v)} />
          <Field testId="field-state" label="State" value={profile.state} onChange={v => updateField("state", v)} />
        </div>
      </SectionCard>

      {/* ── Section: Media & Bio ── */}
      <SectionCard testId="section-media-bio"
        icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>} iconBg="#f3ebfa"
        title="Media & Bio" summary={mediaSummary}
        status={profile.bio ? "complete" : "partial"}
        statusColor={profile.bio ? "complete" : "partial"}>
        <div className="grid gap-3">
          <Field testId="field-hudl" label="Hudl Profile Link" value={profile.hudl_profile_url} onChange={v => updateField("hudl_profile_url", v)} placeholder="https://hudl.com/..." />
          <Field testId="field-video" label="Highlights Video Link" value={profile.video_link} onChange={v => updateField("video_link", v)} placeholder="https://youtube.com/..." />
          <Field testId="field-bio" label="Bio" value={profile.bio} onChange={v => updateField("bio", v)} type="textarea" placeholder="Tell coaches about yourself, your journey, and what drives you..." coachVisible />
        </div>
      </SectionCard>

      {/* ── Section: Contact Info ── */}
      <SectionCard testId="section-contact"
        icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72"/></svg>} iconBg="#fef3c7"
        title="Contact Info" summary={contactSummary}
        status={sectionStatus(["contact_email", "parent_name"])}
        statusColor={sectionStatus(["contact_email", "parent_name"])}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--t-text-muted)" }}>Athlete</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field testId="field-contact-email" label="Email" value={profile.contact_email} onChange={v => updateField("contact_email", v)} coachVisible />
          <Field testId="field-contact-phone" label="Phone" value={profile.contact_phone} onChange={v => updateField("contact_phone", v)} />
        </div>
        <div className="mb-4" style={{ height: 1, background: "var(--t-border)" }} />
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "var(--t-text-muted)" }}>Club Coach</p>
        <div className="grid gap-3 mb-3">
          <Field testId="field-coach-name" label="Name" value={profile.parent_name} onChange={v => updateField("parent_name", v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field testId="field-coach-email" label="Email" value={profile.parent_email} onChange={v => updateField("parent_email", v)} />
          <Field testId="field-coach-phone" label="Phone" value={profile.parent_phone} onChange={v => updateField("parent_phone", v)} />
        </div>
      </SectionCard>

      <div className="h-8" />
    </div>
  );
}
