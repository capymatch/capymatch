import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Mail, Phone, Play, User, Loader2, ExternalLink, MapPin, Share2, Copy, Check } from "lucide-react";
import { BACKEND_URL } from "../lib/api";

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

function formatDateFull(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

const EVENT_TYPE_STYLES = {
  Camp: "bg-[rgba(232,69,107,0.12)] text-[#e8456b]",
  Showcase: "bg-[rgba(59,130,246,0.12)] text-[#60a5fa]",
  Tournament: "bg-[rgba(245,158,11,0.12)] text-[#fbbf24]",
  Visit: "bg-[rgba(16,185,129,0.12)] text-[#34d399]",
  Tryout: "bg-[rgba(232,69,107,0.12)] text-[#e8456b]",
  Other: "bg-[rgba(107,114,128,0.12)] text-[#9ca3af]",
};

/* ─────────────────────────────────────────── */
/*  Stat Card                                  */
/* ─────────────────────────────────────────── */
function StatCard({ value, label, highlight }) {
  if (!value) return null;
  return (
    <div
      className={`rounded-2xl border text-center transition-all duration-200 hover:border-white/10 ${highlight ? "border-[rgba(232,69,107,0.18)]" : "border-white/[0.06]"}`}
      style={{
        background: highlight
          ? "linear-gradient(135deg, rgba(232,69,107,0.08), rgba(232,69,107,0.02))"
          : "#111118",
        padding: "24px 16px",
      }}
      data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className={`font-barlow font-[800] text-[34px] leading-none ${highlight ? "text-[#e8456b]" : "text-white"}`}>{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-[1.5px] text-[#55556a] mt-1.5">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────── */
/*  Event Card                                 */
/* ─────────────────────────────────────────── */
function EventCard({ event }) {
  const { month, day } = formatDate(event.start_date);
  const typeStyle = EVENT_TYPE_STYLES[event.event_type] || EVENT_TYPE_STYLES.Other;

  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-[14px] border border-white/[0.06] hover:border-white/10 transition-all" style={{ background: "#111118" }}>
      <div className="w-12 text-center flex-shrink-0">
        <div className="font-barlow text-[11px] font-semibold uppercase tracking-wider text-[#e8456b]">{month}</div>
        <div className="font-barlow text-[30px] font-[800] text-white leading-none">{day}</div>
      </div>
      <div className="w-px h-10 bg-white/[0.06] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-[#f0f0f5]">{event.title}</div>
        <div className="text-xs text-[#8b8b9e] mt-1 flex items-center gap-1.5">
          {event.location && <><MapPin className="w-3 h-3 text-[#55556a]" />{event.location}</>}
          {!event.location && event.start_time && formatTime(event.start_time)}
        </div>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md flex-shrink-0 ${typeStyle}`}>
        {event.event_type}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────── */
/*  Quick Fact                                 */
/* ─────────────────────────────────────────── */
function QuickFact({ icon, value, label }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-[10px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-bold text-sm text-[#f0f0f5] leading-tight">{value}</div>
        <div className="text-[10px] uppercase tracking-[0.5px] text-[#55556a]">{label}</div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════ */
/*  MAIN COMPONENT                              */
/* ═════════════════════════════════════════════ */
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

  /* Loading */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#08080c" }}>
        <Loader2 className="w-8 h-8 animate-spin text-[#e8456b]" />
      </div>
    );
  }

  /* Error */
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#08080c" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Athlete Not Found</h1>
          <p className="text-[#8b8b9e]">This profile link may be invalid or hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  const { profile, upcoming_events, past_events } = data;
  const hasPhoto = profile.photo_url && profile.photo_url.startsWith("data:");
  const videoId = getYouTubeId(profile.video_link);
  const hasStats = profile.standing_reach || profile.approach_touch || profile.block_touch || profile.wingspan;
  const hasCoach = profile.parent_name || profile.parent_email || profile.parent_phone;

  return (
    <div data-testid="public-schedule" className="min-h-screen" style={{ background: "#08080c", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`.font-barlow { font-family: 'Barlow Condensed', sans-serif; }`}</style>

      {/* ── Share Button ── */}
      <button
        onClick={handleCopyLink}
        className="fixed top-5 right-5 z-40 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all border border-white/[0.08] hover:bg-white/10"
        style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
        title="Copy profile link"
        data-testid="share-button"
      >
        {copied ? <Check className="w-[17px] h-[17px] text-emerald-400" /> : <Share2 className="w-[17px] h-[17px] text-white" />}
      </button>

      {/* ══════════════════════════════════════════
           HERO — Side-by-side
          ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(160deg, #0e0e18 0%, #111122 40%, #0c0c14 100%)" }}>
        {/* Subtle accent glow */}
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(circle, rgba(232,69,107,0.06) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-[860px] mx-auto px-6 sm:px-8 py-14 sm:py-16 flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12">
          {/* Photo */}
          <div className="flex-shrink-0 relative" data-testid="hero-photo-wrapper">
            {hasPhoto ? (
              <img
                src={profile.photo_url}
                alt={profile.athlete_name}
                className="w-52 h-64 sm:w-[280px] sm:h-[340px] rounded-[20px] object-cover object-[center_15%] border border-white/[0.08]"
                data-testid="athlete-photo"
              />
            ) : (
              <div className="w-52 h-64 sm:w-[280px] sm:h-[340px] rounded-[20px] bg-gradient-to-br from-[#e8456b] to-indigo-600 flex items-center justify-center border border-white/[0.08]">
                <User className="w-20 h-20 text-white/70" />
              </div>
            )}
            {/* Accent line */}
            <div className="absolute -bottom-1.5 left-6 right-6 h-[3px] rounded-full" style={{ background: "linear-gradient(90deg, #e8456b, rgba(232,69,107,0.2))" }} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left pt-0 sm:pt-4">
            <div className="font-barlow font-semibold text-[12px] tracking-[3px] uppercase text-[#e8456b]">
              {[profile.position, profile.grad_year && `Class of ${profile.grad_year}`].filter(Boolean).join("  \u00B7  ")}
            </div>

            <h1 className="font-barlow font-[800] text-[42px] sm:text-[58px] leading-none uppercase text-white mt-3" data-testid="athlete-name">
              {(profile.athlete_name || "Athlete").split(" ").map((w, i, arr) => (
                <span key={i}>{w}{i < arr.length - 1 && <><br className="hidden sm:inline" /><span className="sm:hidden"> </span></>}</span>
              ))}
            </h1>

            <div className="flex flex-wrap gap-1.5 mt-3.5 justify-center sm:justify-start text-[15px] text-[#8b8b9e] font-medium">
              {[profile.club_team, profile.high_school, profile.city && profile.state && `${profile.city}, ${profile.state}`, profile.jersey_number && `#${profile.jersey_number}`]
                .filter(Boolean)
                .map((item, i, arr) => (
                  <span key={i}>{item}{i < arr.length - 1 && <span className="text-[#55556a] mx-1.5">&bull;</span>}</span>
                ))}
            </div>

            {/* Quick Facts */}
            <div className="flex flex-wrap gap-5 mt-7 justify-center sm:justify-start">
              <QuickFact
                icon={<svg className="w-[15px] h-[15px] stroke-[#e8456b]" fill="none" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" /></svg>}
                value={profile.height} label="Height"
              />
              <QuickFact
                icon={<svg className="w-[15px] h-[15px] stroke-[#e8456b]" fill="none" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
                value={profile.weight && `${profile.weight} lbs`} label="Weight"
              />
              <QuickFact
                icon={<svg className="w-[15px] h-[15px] stroke-[#e8456b]" fill="none" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" /></svg>}
                value={profile.gpa && `${profile.gpa} GPA`} label="Academics"
              />
              <QuickFact
                icon={<svg className="w-[15px] h-[15px] stroke-[#e8456b]" fill="none" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>}
                value={profile.handed} label="Dominant"
              />
            </div>

            {/* CTA Buttons — desktop only */}
            <div className="hidden sm:flex flex-wrap gap-2.5 mt-8">
              {profile.hudl_profile_url && (
                <a href={profile.hudl_profile_url} target="_blank" rel="noopener noreferrer" data-testid="hudl-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-[#ff5722] hover:brightness-110 transition-all hover:-translate-y-px">
                  <Play className="w-[15px] h-[15px]" /> Hudl Profile
                </a>
              )}
              {profile.video_link && (
                <a href={profile.video_link} target="_blank" rel="noopener noreferrer" data-testid="video-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-white bg-[#e8456b] hover:brightness-110 transition-all hover:-translate-y-px">
                  <Play className="w-[15px] h-[15px]" /> Highlights
                </a>
              )}
              {profile.contact_email && (
                <a href={`mailto:${profile.contact_email}`} data-testid="email-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#f0f0f5] bg-white/[0.06] border border-white/[0.06] hover:bg-white/10 hover:border-white/[0.12] transition-all">
                  <Mail className="w-[15px] h-[15px]" /> Email
                </a>
              )}
              {profile.contact_phone && (
                <a href={`tel:${profile.contact_phone}`} data-testid="phone-link"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold text-[#f0f0f5] bg-white/[0.06] border border-white/[0.06] hover:bg-white/10 hover:border-white/[0.12] transition-all">
                  <Phone className="w-[15px] h-[15px]" /> Call
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══ ABOUT ══ */}
      {profile.bio && (
        <>
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-11">
            <div className="font-barlow font-semibold text-[11px] tracking-[3px] uppercase text-[#55556a] mb-4">About</div>
            <p className="text-[15px] leading-[1.75] text-[#8b8b9e] max-w-[600px]">{profile.bio}</p>
          </div>
          <div className="max-w-[860px] mx-auto px-6 sm:px-8"><hr className="border-white/[0.06] mt-11" /></div>
        </>
      )}

      {/* ══ ATHLETIC MEASURABLES ══ */}
      {hasStats && (
        <>
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-11">
            <div className="font-barlow font-semibold text-[11px] tracking-[3px] uppercase text-[#55556a] mb-4">Athletic Measurables</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard value={profile.standing_reach} label="Standing Reach" />
              <StatCard value={profile.approach_touch} label="Approach Touch" highlight />
              <StatCard value={profile.block_touch} label="Block Touch" />
              <StatCard value={profile.wingspan} label="Wingspan" />
            </div>
          </div>
          <div className="max-w-[860px] mx-auto px-6 sm:px-8"><hr className="border-white/[0.06] mt-11" /></div>
        </>
      )}

      {/* ══ CLUB COACH ══ */}
      {hasCoach && (
        <>
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-11">
            <div className="font-barlow font-semibold text-[11px] tracking-[3px] uppercase text-[#55556a] mb-4">Club Coach</div>
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-white/[0.06] p-6" style={{ background: "#111118" }}>
              <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-barlow font-bold text-xl text-white flex-shrink-0">
                {(profile.parent_name || "C")[0].toUpperCase()}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="font-bold text-[15px] text-[#f0f0f5]">{profile.parent_name || "Coach"}</div>
                <div className="text-xs text-[#55556a] mt-0.5">Club Director {profile.club_team && <>&#8226; {profile.club_team}</>}</div>
              </div>
              <div className="flex gap-2">
                {profile.parent_email && (
                  <a href={`mailto:${profile.parent_email}`} title="Email Coach"
                    className="w-[38px] h-[38px] rounded-[10px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-[rgba(232,69,107,0.15)] hover:border-[rgba(232,69,107,0.3)] transition-all group">
                    <Mail className="w-4 h-4 text-[#8b8b9e] group-hover:text-[#e8456b]" />
                  </a>
                )}
                {profile.parent_phone && (
                  <a href={`tel:${profile.parent_phone}`} title="Call Coach"
                    className="w-[38px] h-[38px] rounded-[10px] bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-[rgba(232,69,107,0.15)] hover:border-[rgba(232,69,107,0.3)] transition-all group">
                    <Phone className="w-4 h-4 text-[#8b8b9e] group-hover:text-[#e8456b]" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="max-w-[860px] mx-auto px-6 sm:px-8"><hr className="border-white/[0.06] mt-11" /></div>
        </>
      )}

      {/* ══ HIGHLIGHTS VIDEO ══ */}
      {videoId && (
        <>
          <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-11" data-testid="video-embed-section">
            <div className="font-barlow font-semibold text-[11px] tracking-[3px] uppercase text-[#55556a] mb-4">Highlights</div>
            {videoPlaying ? (
              <div className="rounded-2xl overflow-hidden border border-white/[0.06] aspect-video bg-black">
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
                className="relative rounded-2xl overflow-hidden border border-white/[0.06] aspect-video bg-black cursor-pointer group"
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
                <div className="absolute bottom-3.5 left-3.5 text-xs font-semibold text-white/70 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  {profile.athlete_name} &mdash; Highlights
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(profile.video_link); }}
                  className="absolute bottom-3.5 right-3.5 text-[11px] font-semibold text-white/50 bg-white/[0.08] backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5 hover:bg-white/15 hover:text-white transition-all"
                >
                  <Copy className="w-3 h-3" /> Copy link
                </button>
              </div>
            )}
          </div>
          <div className="max-w-[860px] mx-auto px-6 sm:px-8"><hr className="border-white/[0.06] mt-11" /></div>
        </>
      )}

      {/* ══ WHERE TO SEE ME PLAY ══ */}
      <div className="max-w-[860px] mx-auto px-6 sm:px-8 pt-11 pb-8">
        <div className="font-barlow font-semibold text-[11px] tracking-[3px] uppercase text-[#55556a] mb-4">Where to See Me Play</div>

        {upcoming_events.length > 0 ? (
          <div className="flex flex-col gap-2.5" data-testid="upcoming-events">
            {upcoming_events.map((evt) => <EventCard key={evt.event_id} event={evt} />)}
          </div>
        ) : (
          <div className="text-center py-14 rounded-2xl border border-white/[0.06]" style={{ background: "#111118" }}>
            <p className="text-[#55556a] text-sm">Schedule coming soon</p>
            <p className="text-[#3a3a4a] text-xs mt-1">Reach out to get notified about upcoming events</p>
            {profile.contact_email && (
              <a href={`mailto:${profile.contact_email}`}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-xs font-semibold text-[#e8456b] bg-[rgba(232,69,107,0.1)] border border-[rgba(232,69,107,0.15)] hover:bg-[rgba(232,69,107,0.18)] transition-all">
                <Mail className="w-3.5 h-3.5" /> Get in touch
              </a>
            )}
          </div>
        )}

        {past_events.length > 0 && (
          <div className="mt-10 opacity-60">
            <div className="font-barlow font-semibold text-[11px] tracking-[3px] uppercase text-[#55556a] mb-4">Past Events</div>
            <div className="flex flex-col gap-2.5" data-testid="past-events">
              {past_events.map((evt) => <EventCard key={evt.event_id} event={evt} />)}
            </div>
          </div>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <footer className="pb-24 sm:pb-8 pt-4 text-center">
        <span className="text-[11px] tracking-wider text-[#55556a]">Powered by <span className="text-[#8b8b9e] font-semibold">Recruiting HQ</span></span>
      </footer>

      {/* ══ STICKY MOBILE CTA ══ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-white/[0.06]"
        style={{ background: "rgba(8,8,12,0.88)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
        data-testid="mobile-cta-bar"
      >
        <div className="flex gap-2 px-4 pt-3 max-w-[500px] mx-auto">
          {profile.contact_email && (
            <a href={`mailto:${profile.contact_email}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold text-white bg-[#e8456b]">
              <Mail className="w-4 h-4" /> Email
            </a>
          )}
          {profile.contact_phone && (
            <a href={`tel:${profile.contact_phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold text-[#f0f0f5] border border-white/[0.06]" style={{ background: "#16161f" }}>
              <Phone className="w-4 h-4" /> Call
            </a>
          )}
          {profile.hudl_profile_url && (
            <a href={profile.hudl_profile_url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-semibold text-[#f0f0f5] border border-white/[0.06]" style={{ background: "#16161f" }}>
              <Play className="w-4 h-4" /> Hudl
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
