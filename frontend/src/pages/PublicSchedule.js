import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Mail, Phone, Play, User, Loader2, MapPin, Share2, Copy, Check } from "lucide-react";
import { BACKEND_URL } from "../lib/api";

/* ── Theme CSS Variables ── */
const THEME_CSS = `
  .font-barlow { font-family: 'Barlow Condensed', sans-serif; }
  .profile-root {
    --p-bg: #f6f6f9;
    --p-hero-bg: linear-gradient(160deg, #f0f0f8 0%, #e8e8f4 40%, #f4f4fa 100%);
    --p-hero-glow: rgba(232,69,107,0.05);
    --p-surface: #ffffff;
    --p-surface-alt: #f0f0f5;
    --p-border: rgba(0,0,0,0.07);
    --p-border-hover: rgba(0,0,0,0.13);
    --p-text: #1a1a2e;
    --p-text-secondary: #4a4a60;
    --p-text-muted: #8b8b9e;
    --p-text-faint: #b0b0c0;
    --p-accent: #e8456b;
    --p-accent-glow: rgba(232,69,107,0.08);
    --p-accent-glow-strong: rgba(232,69,107,0.12);
    --p-stat-bg: rgba(232,69,107,0.04);
    --p-stat-highlight-bg: linear-gradient(135deg, rgba(232,69,107,0.10), rgba(232,69,107,0.05));
    --p-stat-highlight-border: rgba(232,69,107,0.20);
    --p-section-bg: #ffffff;
    --p-section-border: rgba(0,0,0,0.06);
    --p-section-shadow: 0 1px 3px rgba(0,0,0,0.04);
    --p-coach-avatar: linear-gradient(135deg, #6366f1, #8b5cf6);
    --p-icon-box-bg: rgba(0,0,0,0.03);
    --p-icon-box-border: rgba(0,0,0,0.06);
    --p-ghost-bg: rgba(0,0,0,0.04);
    --p-ghost-hover: rgba(0,0,0,0.07);
    --p-ghost-border: rgba(0,0,0,0.08);
    --p-photo-border: rgba(0,0,0,0.08);
    --p-video-overlay-bg: rgba(0,0,0,0.5);
    --p-video-label-bg: rgba(0,0,0,0.55);
    --p-sticky-bg: rgba(246,246,249,0.88);
    --p-sticky-secondary-bg: #ffffff;
    --p-share-bg: rgba(0,0,0,0.04);
    --p-share-hover: rgba(0,0,0,0.08);
    --p-share-border: rgba(0,0,0,0.06);
    --p-share-icon: #1a1a2e;
    --p-divider: rgba(0,0,0,0.06);
    --p-empty-bg: #fafafa;
  }
`;

const EVENT_LIGHT_STYLES = {
  Camp: { bg: "rgba(232,69,107,0.08)", color: "#d63b5c" },
  Showcase: { bg: "rgba(59,130,246,0.08)", color: "#2563eb" },
  Tournament: { bg: "rgba(217,119,6,0.08)", color: "#b45309" },
  Visit: { bg: "rgba(16,185,129,0.08)", color: "#059669" },
  Tryout: { bg: "rgba(232,69,107,0.08)", color: "#d63b5c" },
  Other: { bg: "rgba(107,114,128,0.08)", color: "#6b7280" },
};

/* ── YouTube helpers ── */
function getYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") return u.searchParams.get("v");
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1]?.split("?")[0];
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1]?.split("?")[0];
  } catch { /* ignore */ }
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return {};
  const d = new Date(dateStr + "T00:00:00");
  return { month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(), day: d.getDate() };
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

/* ── Stat Card ── */
function StatCard({ value, label, highlight }) {
  if (!value) return null;
  return (
    <div
      className="rounded-2xl text-center transition-all duration-200"
      style={{
        background: highlight ? "var(--p-stat-highlight-bg)" : "var(--p-stat-bg)",
        border: highlight ? "1px solid var(--p-stat-highlight-border)" : "1px solid var(--p-border)",
        padding: "24px 16px",
      }}
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="font-barlow font-[800] text-[34px] leading-none" style={{ color: highlight ? "var(--p-accent)" : "var(--p-text)" }}>{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-[1.5px] mt-1.5" style={{ color: "var(--p-text-muted)" }}>{label}</div>
    </div>
  );
}

/* ── Event Card ── */
function EventCard({ event }) {
  const { month, day } = formatDate(event.start_date);
  const ts = EVENT_LIGHT_STYLES[event.event_type] || EVENT_LIGHT_STYLES.Other;

  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-[14px] transition-all" style={{ background: "var(--p-surface)", border: "1px solid var(--p-border)" }}>
      <div className="w-12 text-center flex-shrink-0">
        <div className="font-barlow text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--p-accent)" }}>{month}</div>
        <div className="font-barlow text-[30px] font-[800] leading-none" style={{ color: "var(--p-text)" }}>{day}</div>
      </div>
      <div className="w-px h-10 flex-shrink-0" style={{ background: "var(--p-border)" }} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm" style={{ color: "var(--p-text)" }}>{event.title}</div>
        <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "var(--p-text-secondary)" }}>
          {event.location && <><MapPin className="w-3 h-3" style={{ color: "var(--p-text-muted)" }} />{event.location}</>}
          {!event.location && event.start_time && formatTime(event.start_time)}
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex-shrink-0" style={{ background: ts.bg, color: ts.color }}>
        {event.event_type}
      </span>
    </div>
  );
}

/* ── Quick Fact ── */
function QuickFact({ icon, value, label }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: "var(--p-icon-box-bg)", border: "1px solid var(--p-icon-box-border)" }}>
        {icon}
      </div>
      <div>
        <div className="font-bold text-sm leading-tight" style={{ color: "var(--p-text)" }}>{value}</div>
        <div className="text-[10px] uppercase tracking-[0.5px]" style={{ color: "var(--p-text-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

/* ── Section label ── */
function SectionLabel({ children }) {
  return <div className="font-barlow font-semibold text-[11px] tracking-[3px] uppercase mb-4" style={{ color: "var(--p-text-muted)" }}>{children}</div>;
}

/* ═══════════════════════════════ */
/*  MAIN COMPONENT                */
/* ═══════════════════════════════ */
export default function PublicSchedule() {
  const { shortId, tenantId: legacyTenantId } = useParams();
  const tenantId = legacyTenantId || (shortId ? `tenant_${shortId}` : "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/public/schedule/${tenantId}`)
      .then((r) => { if (!r.ok) throw new Error("not found"); return r.json(); })
      .then(setData)
      .catch(() => setError("Athlete not found"))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--p-bg, #f6f6f9)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#e8456b]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--p-bg, #f6f6f9)" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--p-text, #1a1a2e)" }}>Athlete Not Found</h1>
          <p style={{ color: "var(--p-text-muted, #8b8b9e)" }}>This profile link may be invalid or hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  const { profile, upcoming_events, past_events } = data;
  const hasPhoto = profile.photo_url && profile.photo_url.startsWith("data:");
  const videoId = getYouTubeId(profile.video_link);
  const hasStats = profile.standing_reach || profile.approach_touch || profile.block_touch || profile.wingspan;
  const hasCoach = profile.parent_name || profile.parent_email || profile.parent_phone;
  const accentIcon = <svg className="w-[15px] h-[15px]" style={{ stroke: "var(--p-accent)" }} fill="none" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" /></svg>;

  return (
    <div data-testid="public-schedule" className="profile-root min-h-screen" style={{ background: "var(--p-bg)", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{THEME_CSS}</style>

      {/* ── Share Button ── */}
      <button
        onClick={handleCopyLink}
        className="fixed top-5 right-5 z-40 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all"
        style={{ background: "var(--p-share-bg)", border: "1px solid var(--p-share-border)" }}
        title="Copy profile link"
        data-testid="share-button"
      >
        {copied ? <Check className="w-[17px] h-[17px] text-emerald-500" /> : <Share2 className="w-[17px] h-[17px]" style={{ color: "var(--p-share-icon)" }} />}
      </button>

      {/* ══════════════════════════════════════════
           HERO
          ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "var(--p-hero-bg)" }}>
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] pointer-events-none" style={{ background: `radial-gradient(circle, var(--p-hero-glow) 0%, transparent 70%)` }} />

        <div className="relative z-10 max-w-[860px] mx-auto px-6 sm:px-8 py-14 sm:py-16 flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12">
          {/* Photo */}
          <div className="flex-shrink-0 relative" data-testid="hero-photo-wrapper">
            {hasPhoto ? (
              <img
                src={profile.photo_url}
                alt={profile.athlete_name}
                className="w-52 h-64 sm:w-[280px] sm:h-[340px] rounded-[20px] object-cover object-[center_15%] shadow-lg"
                style={{ border: "1px solid var(--p-photo-border)" }}
                data-testid="athlete-photo"
              />
            ) : (
              <div className="w-52 h-64 sm:w-[280px] sm:h-[340px] rounded-[20px] bg-gradient-to-br from-[#e8456b] to-indigo-500 flex items-center justify-center shadow-lg">
                <User className="w-20 h-20 text-white/70" />
              </div>
            )}
            <div className="absolute -bottom-1.5 left-6 right-6 h-[3px] rounded-full" style={{ background: "linear-gradient(90deg, var(--p-accent), rgba(232,69,107,0.15))" }} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left pt-0 sm:pt-4">
            <div className="font-barlow font-semibold text-[12px] tracking-[3px] uppercase" style={{ color: "var(--p-accent)" }}>
              {[profile.position, profile.grad_year && `Class of ${profile.grad_year}`].filter(Boolean).join("  \u00B7  ")}
            </div>

            <h1 className="font-barlow font-[800] text-[42px] sm:text-[58px] leading-none uppercase mt-3" style={{ color: "var(--p-text)" }} data-testid="athlete-name">
              {(profile.athlete_name || "Athlete").split(" ").map((w, i, arr) => (
                <span key={i}>{w}{i < arr.length - 1 && <><br className="hidden sm:inline" /><span className="sm:hidden"> </span></>}</span>
              ))}
            </h1>

            <div className="flex flex-wrap gap-1.5 mt-3.5 justify-center sm:justify-start text-[15px] font-medium" style={{ color: "var(--p-text-secondary)" }}>
              {[profile.club_team, profile.high_school, profile.city && profile.state && `${profile.city}, ${profile.state}`, profile.jersey_number && `#${profile.jersey_number}`]
                .filter(Boolean)
                .map((item, i, arr) => (
                  <span key={i}>{item}{i < arr.length - 1 && <span className="mx-1.5" style={{ color: "var(--p-text-faint)" }}>&bull;</span>}</span>
                ))}
            </div>

            {/* Quick Facts */}
            <div className="flex flex-wrap gap-5 mt-7 justify-center sm:justify-start">
              <QuickFact icon={accentIcon} value={profile.height} label="Height" />
              <QuickFact
                icon={<svg className="w-[15px] h-[15px]" style={{ stroke: "var(--p-accent)" }} fill="none" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
                value={profile.weight && `${profile.weight} lbs`} label="Weight"
              />
              <QuickFact
                icon={<svg className="w-[15px] h-[15px]" style={{ stroke: "var(--p-accent)" }} fill="none" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" /></svg>}
                value={profile.gpa && `${profile.gpa} GPA`} label="Academics"
              />
              <QuickFact
                icon={<svg className="w-[15px] h-[15px]" style={{ stroke: "var(--p-accent)" }} fill="none" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>}
                value={profile.handed} label="Dominant"
              />
            </div>

            {/* CTA Buttons — desktop */}
            <div className="hidden sm:flex flex-wrap gap-2.5 mt-8">
              {profile.hudl_profile_url && (
                <a href={profile.hudl_profile_url} target="_blank" rel="noopener noreferrer" data-testid="hudl-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-[#ff5722] hover:brightness-110 transition-all hover:-translate-y-px shadow-sm">
                  <Play className="w-[15px] h-[15px]" /> Hudl Profile
                </a>
              )}
              {profile.video_link && (
                <a href={profile.video_link} target="_blank" rel="noopener noreferrer" data-testid="video-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-[#e8456b] hover:brightness-110 transition-all hover:-translate-y-px shadow-sm">
                  <Play className="w-[15px] h-[15px]" /> Highlights
                </a>
              )}
              {profile.contact_email && (
                <a href={`mailto:${profile.contact_email}`} data-testid="email-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                  style={{ color: "var(--p-text)", background: "var(--p-ghost-bg)", border: "1px solid var(--p-ghost-border)" }}>
                  <Mail className="w-[15px] h-[15px]" /> Email
                </a>
              )}
              {profile.contact_phone && (
                <a href={`tel:${profile.contact_phone}`} data-testid="phone-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all"
                  style={{ color: "var(--p-text)", background: "var(--p-ghost-bg)", border: "1px solid var(--p-ghost-border)" }}>
                  <Phone className="w-[15px] h-[15px]" /> Call
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ Content area ══ */}
      <div style={{ background: "var(--p-bg)" }}>

        {/* ── About ── */}
        {profile.bio && (
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-8">
            <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--p-section-bg)", border: "1px solid var(--p-section-border)", boxShadow: "var(--p-section-shadow)" }}>
              <SectionLabel>About</SectionLabel>
              <p className="text-[15px] leading-[1.75] max-w-[600px]" style={{ color: "var(--p-text-secondary)" }}>{profile.bio}</p>
            </div>
          </div>
        )}

        {/* ── Athletic Measurables ── */}
        {hasStats && (
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-4">
            <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--p-section-bg)", border: "1px solid var(--p-section-border)", boxShadow: "var(--p-section-shadow)" }}>
              <SectionLabel>Athletic Measurables</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard value={profile.standing_reach} label="Standing Reach" />
                <StatCard value={profile.approach_touch} label="Approach Touch" highlight />
                <StatCard value={profile.block_touch} label="Block Touch" />
                <StatCard value={profile.wingspan} label="Wingspan" />
              </div>
            </div>
          </div>
        )}

        {/* ── Club Coach ── */}
        {hasCoach && (
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-4">
            <div className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--p-section-bg)", border: "1px solid var(--p-section-border)", boxShadow: "var(--p-section-shadow)" }}>
              <SectionLabel>Club Coach</SectionLabel>
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl p-5" style={{ background: "var(--p-surface-alt)", border: "1px solid var(--p-border)" }}>
                <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center font-barlow font-bold text-xl text-white flex-shrink-0" style={{ background: "var(--p-coach-avatar)" }}>
                  {(profile.parent_name || "C")[0].toUpperCase()}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="font-bold text-[15px]" style={{ color: "var(--p-text)" }}>{profile.parent_name || "Coach"}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--p-text-muted)" }}>Club Director {profile.club_team && <>&#8226; {profile.club_team}</>}</div>
                </div>
                <div className="flex gap-2">
                  {profile.parent_email && (
                    <a href={`mailto:${profile.parent_email}`} title="Email Coach"
                      className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all group"
                      style={{ background: "var(--p-icon-box-bg)", border: "1px solid var(--p-icon-box-border)" }}>
                      <Mail className="w-4 h-4 group-hover:text-[#e8456b] transition-colors" style={{ color: "var(--p-text-muted)" }} />
                    </a>
                  )}
                  {profile.parent_phone && (
                    <a href={`tel:${profile.parent_phone}`} title="Call Coach"
                      className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center transition-all group"
                      style={{ background: "var(--p-icon-box-bg)", border: "1px solid var(--p-icon-box-border)" }}>
                      <Phone className="w-4 h-4 group-hover:text-[#e8456b] transition-colors" style={{ color: "var(--p-text-muted)" }} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Highlights Video ── */}
        {videoId && (
          <>
            <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-11" data-testid="video-embed-section">
              <SectionLabel>Highlights</SectionLabel>
              {videoPlaying ? (
                <div className="rounded-2xl overflow-hidden aspect-video bg-black shadow-lg" style={{ border: "1px solid var(--p-border)" }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    title="Highlights"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    data-testid="video-embed-iframe"
                  />
                </div>
              ) : (
                <div
                  className="relative rounded-2xl overflow-hidden aspect-video bg-black cursor-pointer group shadow-lg"
                  style={{ border: "1px solid var(--p-border)" }}
                  onClick={() => setVideoPlaying(true)}
                  data-testid="video-thumbnail"
                >
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt="Highlights"
                    className="w-full h-full object-cover brightness-[0.65] group-hover:brightness-[0.45] transition-all duration-300"
                    onError={(e) => { e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[68px] h-[68px] rounded-full bg-[rgba(232,69,107,0.9)] backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 text-white fill-white ml-1" />
                  </div>
                  <div className="absolute bottom-3.5 left-3.5 text-xs font-semibold text-white/80 px-3 py-1.5 rounded-lg" style={{ background: "var(--p-video-label-bg)", backdropFilter: "blur(8px)" }}>
                    {profile.athlete_name} &mdash; Highlights
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(profile.video_link); }}
                    className="absolute bottom-3.5 right-3.5 text-[11px] font-semibold text-white/60 bg-white/[0.1] backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/15 flex items-center gap-1.5 hover:bg-white/20 hover:text-white transition-all"
                  >
                    <Copy className="w-3 h-3" /> Copy link
                  </button>
                </div>
              )}
            </div>
            <div className="max-w-[860px] mx-auto px-6 sm:px-8"><hr className="mt-11" style={{ border: "none", height: 1, background: "var(--p-divider)" }} /></div>
          </>
        )}

        {/* ── Where to See Me Play ── */}
        <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-11 pb-8">
          <SectionLabel>Where to See Me Play</SectionLabel>
          {upcoming_events.length > 0 ? (
            <div className="flex flex-col gap-2.5" data-testid="upcoming-events">
              {upcoming_events.map((evt) => <EventCard key={evt.event_id} event={evt} />)}
            </div>
          ) : (
            <div className="text-center py-14 rounded-2xl shadow-sm" style={{ background: "var(--p-empty-bg)", border: "1px solid var(--p-border)" }}>
              <p className="text-sm" style={{ color: "var(--p-text-muted)" }}>Schedule coming soon</p>
              <p className="text-xs mt-1" style={{ color: "var(--p-text-faint)" }}>Reach out to get notified about upcoming events</p>
              {profile.contact_email && (
                <a href={`mailto:${profile.contact_email}`}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                  style={{ color: "var(--p-accent)", background: "var(--p-accent-glow)", border: "1px solid var(--p-accent-glow-strong)" }}>
                  <Mail className="w-3.5 h-3.5" /> Get in touch
                </a>
              )}
            </div>
          )}

          {past_events.length > 0 && (
            <div className="mt-10 opacity-60">
              <SectionLabel>Past Events</SectionLabel>
              <div className="flex flex-col gap-2.5" data-testid="past-events">
                {past_events.map((evt) => <EventCard key={evt.event_id} event={evt} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="pb-24 sm:pb-8 pt-4 text-center" style={{ background: "var(--p-bg)" }}>
        <span className="text-[11px] tracking-wider" style={{ color: "var(--p-text-faint)" }}>Powered by <span className="font-semibold" style={{ color: "var(--p-text-muted)" }}>Recruiting HQ</span></span>
      </footer>

      {/* ── Sticky Mobile CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
        style={{ background: "var(--p-sticky-bg)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderTop: "1px solid var(--p-border)", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
        data-testid="mobile-cta-bar"
      >
        <div className="flex gap-2 px-4 pt-3 max-w-[500px] mx-auto">
          {profile.contact_email && (
            <a href={`mailto:${profile.contact_email}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold text-white bg-[#e8456b] shadow-sm">
              <Mail className="w-4 h-4" /> Email
            </a>
          )}
          {profile.contact_phone && (
            <a href={`tel:${profile.contact_phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold shadow-sm"
              style={{ color: "var(--p-text)", background: "var(--p-sticky-secondary-bg)", border: "1px solid var(--p-border)" }}>
              <Phone className="w-4 h-4" /> Call
            </a>
          )}
          {profile.hudl_profile_url && (
            <a href={profile.hudl_profile_url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold shadow-sm"
              style={{ color: "var(--p-text)", background: "var(--p-sticky-secondary-bg)", border: "1px solid var(--p-border)" }}>
              <Play className="w-4 h-4" /> Hudl
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
