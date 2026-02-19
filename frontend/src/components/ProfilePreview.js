import { User, Mail, Phone, Play, MapPin } from "lucide-react";

const PREVIEW_CSS = `
  .preview-root {
    --p-bg: var(--t-bg, #e8e7ef);
    --p-hero-bg: var(--t-surface, #ffffff);
    --p-hero-glow: rgba(46,196,182,0.05);
    --p-surface: var(--t-surface, #ffffff);
    --p-text: var(--t-text, #1a1a2e);
    --p-text-secondary: var(--t-text-secondary, #4a4a60);
    --p-text-muted: var(--t-text-muted, #8b8b9e);
    --p-text-faint: var(--t-text-faint, #b0b0c0);
    --p-accent: #2ec4b6;
    --p-section-bg: var(--t-surface, #ffffff);
    --p-section-border: var(--t-border, rgba(0,0,0,0.08));
    --p-section-shadow: 0 1px 3px rgba(0,0,0,0.08);
    --p-icon-box-bg: var(--t-surface-alt, #f4f3f9);
    --p-icon-box-border: var(--t-border, rgba(0,0,0,0.08));
    --p-ghost-bg: var(--t-surface-alt, #f4f3f9);
    --p-ghost-border: var(--t-border, rgba(0,0,0,0.10));
    --p-photo-border: var(--t-border, rgba(0,0,0,0.08));
    --p-coach-avatar: linear-gradient(135deg, #6366f1, #8b5cf6);
    --p-border: var(--t-border, rgba(0,0,0,0.08));
    --p-empty-bg: var(--t-surface-alt, #f8f7fc);
    font-family: 'DM Sans', -apple-system, sans-serif;
  }
  .preview-root .font-barlow { font-family: 'Barlow Condensed', sans-serif; }
`;

function StatCard({ value, label }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl text-center" style={{ background: "var(--t-surface-alt, #f2f3f8)", border: "1px solid var(--t-border, rgba(0,0,0,0.06))", padding: "20px 12px" }}>
      <div className="font-barlow font-[800] text-[28px] leading-none" style={{ color: "var(--t-text, #1a1a2e)" }}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-[1px] mt-2" style={{ color: "var(--t-text-muted, #6b7280)" }}>{label}</div>
    </div>
  );
}

function QuickFact({ icon, value, label }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--p-icon-box-bg)", border: "1px solid var(--p-icon-box-border)" }}>
        {icon}
      </div>
      <div>
        <div className="font-bold text-xs leading-tight" style={{ color: "var(--p-text)" }}>{value}</div>
        <div className="text-[9px] uppercase tracking-[0.5px]" style={{ color: "var(--p-text-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="font-barlow font-semibold text-[10px] tracking-[3px] uppercase mb-3" style={{ color: "var(--p-text-muted)" }}>{children}</div>;
}

export function ProfilePreview({ profile }) {
  if (!profile) return null;

  const hasPhoto = profile.photo_url && profile.photo_url.startsWith("data:");
  const hasStats = profile.standing_reach || profile.approach_touch || profile.block_touch || profile.wingspan;
  const hasCoach = profile.parent_name || profile.parent_email || profile.parent_phone;
  const gradYear = profile.graduation_year || profile.grad_year;
  const accentIcon = <svg className="w-3 h-3" style={{ stroke: "var(--p-accent)" }} fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v20M2 12h20" /></svg>;

  return (
    <div className="preview-root rounded-2xl overflow-hidden" style={{ background: "var(--p-bg)" }} data-testid="profile-preview">
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{PREVIEW_CSS}</style>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--p-hero-bg)" }}>
        <div className="absolute -top-[20%] -right-[10%] w-[400px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(circle, var(--p-hero-glow) 0%, transparent 70%)" }} />
        <div className="relative z-10 px-5 py-8 flex flex-col items-center text-center">
          {/* Photo */}
          {hasPhoto ? (
            <img src={profile.photo_url} alt={profile.athlete_name}
              className="w-36 h-44 rounded-[16px] object-cover object-[center_15%] shadow-lg mb-5"
              style={{ border: "1px solid var(--p-photo-border)" }} />
          ) : (
            <div className="w-36 h-44 rounded-[16px] bg-gradient-to-br from-[#2ec4b6] to-indigo-500 flex items-center justify-center shadow-lg mb-5">
              <User className="w-12 h-12 text-white/70" />
            </div>
          )}

          {/* Position & Class */}
          <div className="font-barlow font-semibold text-[10px] tracking-[3px] uppercase" style={{ color: "var(--p-accent)" }}>
            {[profile.position, gradYear && `Class of ${gradYear}`].filter(Boolean).join("  \u00B7  ")}
          </div>

          {/* Name */}
          <h2 className="font-barlow font-[800] text-[32px] leading-none uppercase mt-2" style={{ color: "var(--p-text)" }} data-testid="preview-athlete-name">
            {profile.athlete_name || "Your Name"}
          </h2>

          {/* Sub-info */}
          <div className="flex flex-wrap gap-1 mt-2 justify-center text-[12px] font-medium" style={{ color: "var(--p-text-secondary)" }}>
            {[profile.club_team, profile.high_school, profile.city && profile.state && `${profile.city}, ${profile.state}`, profile.jersey_number && `#${profile.jersey_number}`]
              .filter(Boolean)
              .map((item, i, arr) => (
                <span key={i}>{item}{i < arr.length - 1 && <span className="mx-1" style={{ color: "var(--p-text-faint)" }}>&bull;</span>}</span>
              ))}
          </div>

          {/* Quick Facts */}
          <div className="flex flex-wrap gap-3 mt-5 justify-center">
            <QuickFact icon={accentIcon} value={profile.height} label="Height" />
            <QuickFact
              icon={<svg className="w-3 h-3" style={{ stroke: "var(--p-accent)" }} fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
              value={profile.weight && `${profile.weight} lbs`} label="Weight" />
            <QuickFact
              icon={<svg className="w-3 h-3" style={{ stroke: "var(--p-accent)" }} fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 6 3 6 3s3 0 6-3v-5" /></svg>}
              value={profile.gpa && `${profile.gpa} GPA`} label="Academics" />
            <QuickFact
              icon={<svg className="w-3 h-3" style={{ stroke: "var(--p-accent)" }} fill="none" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>}
              value={profile.handed} label="Dominant" />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-2 mt-5 justify-center">
            {profile.hudl_profile_url && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold text-white bg-[#ff5722]">
                <Play className="w-3 h-3" /> Hudl
              </span>
            )}
            {profile.video_link && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold text-white bg-[#2ec4b6]">
                <Play className="w-3 h-3" /> Highlights
              </span>
            )}
            {profile.contact_email && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold"
                style={{ color: "var(--p-text)", background: "var(--p-ghost-bg)", border: "1px solid var(--p-ghost-border)" }}>
                <Mail className="w-3 h-3" /> Email
              </span>
            )}
            {profile.contact_phone && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-semibold"
                style={{ color: "var(--p-text)", background: "var(--p-ghost-bg)", border: "1px solid var(--p-ghost-border)" }}>
                <Phone className="w-3 h-3" /> Call
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Transition */}
      <div style={{ height: 24, background: "linear-gradient(to bottom, var(--p-hero-bg), var(--p-bg))" }} />

      {/* Content Sections */}
      <div className="px-4 pb-6" style={{ background: "var(--p-bg)" }}>

        {/* Bio */}
        {profile.bio && (
          <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--p-section-bg)", border: "1px solid var(--p-section-border)", boxShadow: "var(--p-section-shadow)" }}>
            <SectionLabel>About</SectionLabel>
            <p className="text-[13px] leading-[1.75]" style={{ color: "var(--p-text-secondary)" }}>{profile.bio}</p>
          </div>
        )}

        {/* Measurables */}
        {hasStats && (
          <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--p-section-bg)", border: "1px solid var(--p-section-border)", boxShadow: "var(--p-section-shadow)" }}>
            <SectionLabel>Athletic Measurables</SectionLabel>
            <div className="grid grid-cols-2 gap-2.5">
              <StatCard value={profile.standing_reach} label="Standing Reach" />
              <StatCard value={profile.approach_touch} label="Approach Touch" />
              <StatCard value={profile.block_touch} label="Block Touch" />
              <StatCard value={profile.wingspan} label="Wingspan" />
            </div>
          </div>
        )}

        {/* Coach */}
        {hasCoach && (
          <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--p-section-bg)", border: "1px solid var(--p-section-border)", boxShadow: "var(--p-section-shadow)" }}>
            <SectionLabel>Club Coach</SectionLabel>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-barlow font-bold text-base text-white flex-shrink-0" style={{ background: "var(--p-coach-avatar)" }}>
                {(profile.parent_name || "C")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px]" style={{ color: "var(--t-text, #1a1a2e)" }}>{profile.parent_name || "Coach"}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--t-text-muted, #8b8b9e)" }}>Club Director {profile.club_team && <>&#8226; {profile.club_team}</>}</div>
              </div>
              <div className="flex gap-1.5">
                {profile.parent_email && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--t-surface-alt, #f2f3f8)", border: "1px solid var(--t-border, rgba(0,0,0,0.06))" }}>
                    <Mail className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted, #8b8b9e)" }} />
                  </div>
                )}
                {profile.parent_phone && (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--t-surface-alt, #f2f3f8)", border: "1px solid var(--t-border, rgba(0,0,0,0.06))" }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: "var(--t-text-muted, #8b8b9e)" }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {!profile.bio && !hasStats && !hasCoach && (
          <div className="rounded-2xl p-8 text-center" style={{ background: "var(--p-empty-bg)", border: "1px solid var(--p-border)" }}>
            <p className="text-xs font-medium" style={{ color: "var(--p-text-muted)" }}>Fill in your profile to see it come alive here</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pb-4 pt-1 text-center" style={{ background: "var(--p-bg)" }}>
        <span className="text-[9px] tracking-wider" style={{ color: "var(--p-text-faint)" }}>Powered by <span className="font-semibold" style={{ color: "var(--p-text-muted)" }}>Recruiting HQ</span></span>
      </div>
    </div>
  );
}
