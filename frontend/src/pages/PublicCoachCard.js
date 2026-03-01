import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Calendar, GraduationCap, Ruler, Activity, Video, Mail, ExternalLink, User, Award, Download } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function StatBadge({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(26,138,128,0.08)" }}>
      <span className="text-lg font-bold" style={{ color: "#1a8a80" }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
    </div>
  );
}

export default function PublicCoachCard() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/card/${slug}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setData)
      .catch(() => setError("Coach Card not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0f1729" }}>
      <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: "#1a8a80" }} />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0f1729" }}>
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2" style={{ color: "#e2e8f0" }}>Coach Card Not Found</h1>
        <p className="text-sm" style={{ color: "#94a3b8" }}>This link may be invalid or expired.</p>
      </div>
    </div>
  );

  const { profile: p, config, schedule, program } = data;
  const fullName = p.athlete_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Athlete";
  const gradYear = p.graduation_year || p.grad_year;
  const position = Array.isArray(p.positions) ? p.positions[0] : (p.position || "");
  const secondaryPosition = Array.isArray(p.positions) && p.positions.length > 1 ? p.positions[1] : (p.secondary_position || "");
  const featuredVideo = config.featured_video || p.highlight_video || p.highlights_url || p.hudl_url || "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0f1729" }} data-testid="public-coach-card">
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="text-center mb-6">
          {p.photo_url ? (
            <img src={p.photo_url} alt={fullName} className="w-24 h-24 rounded-full mx-auto mb-3 object-cover border-2" style={{ borderColor: "#1a8a80" }} />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "rgba(26,138,128,0.15)" }}>
              <User className="w-10 h-10" style={{ color: "#1a8a80" }} />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#e2e8f0" }}>{fullName}</h1>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1.5 text-sm" style={{ color: "#94a3b8" }}>
            {position && <span>{position}</span>}
            {secondaryPosition && <span>/ {secondaryPosition}</span>}
            {gradYear && <span>Class of {gradYear}</span>}
          </div>
          {(p.club_team || p.high_school) && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1 text-xs" style={{ color: "#64748b" }}>
              {p.club_team && <span>{p.club_team}</span>}
              {p.high_school && <span>{p.high_school}</span>}
              {p.city && p.state && <span>{p.city}, {p.state}</span>}
            </div>
          )}
          {program.university_name && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(26,138,128,0.12)", color: "#1a8a80" }}>
              <Award className="w-3 h-3" />
              Interested in {program.university_name}
            </div>
          )}
        </div>

        {/* Coach Note */}
        {config.coach_note && (
          <div className="rounded-xl p-4 mb-4 text-sm leading-relaxed" style={{ backgroundColor: "rgba(26,138,128,0.08)", border: "1px solid rgba(26,138,128,0.15)", color: "#cbd5e1" }}>
            {config.coach_note}
          </div>
        )}

        {/* Featured Video */}
        {config.show_videos && featuredVideo && (
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: "#1e293b", borderColor: "#334155" }}>
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4" style={{ color: "#1a8a80" }} />
              <h2 className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Highlights</h2>
            </div>
            <a href={featuredVideo} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:underline" style={{ color: "#1a8a80" }}>
              <ExternalLink className="w-3.5 h-3.5" />
              Watch highlights
            </a>
            {(p.hudl_url || p.highlight_video) && (p.hudl_url || p.highlight_video) !== featuredVideo && (
              <a href={p.hudl_url || p.highlight_video} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs mt-2 transition-colors hover:underline" style={{ color: "#64748b" }}>
                <ExternalLink className="w-3 h-3" />
                Hudl profile
              </a>
            )}
          </div>
        )}

        {/* Measurables */}
        {config.show_measurables && (
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: "#1e293b", borderColor: "#334155" }}>
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4" style={{ color: "#1a8a80" }} />
              <h2 className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Athletic Measurables</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBadge label="Height" value={p.height} />
              <StatBadge label="Weight" value={p.weight ? `${p.weight} lbs` : ""} />
              <StatBadge label="Jersey" value={p.jersey_number ? `#${p.jersey_number}` : ""} />
              <StatBadge label="Reach" value={p.standing_reach || p.reach} />
              <StatBadge label="Approach" value={p.approach_jump} />
              <StatBadge label="Block" value={p.block_jump} />
              <StatBadge label="Vertical" value={p.vertical_jump} />
              <StatBadge label="Hand" value={p.dominant_hand} />
            </div>
          </div>
        )}

        {/* Academics */}
        {config.show_academics && (p.gpa || p.sat_score || p.act_score) && (
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: "#1e293b", borderColor: "#334155" }}>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4" style={{ color: "#1a8a80" }} />
              <h2 className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Academics</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBadge label="GPA" value={p.gpa} />
              <StatBadge label="SAT" value={p.sat_score} />
              <StatBadge label="ACT" value={p.act_score} />
            </div>
          </div>
        )}

        {/* Schedule */}
        {config.show_schedule && schedule?.length > 0 && (
          <div className="rounded-xl border p-4 mb-4" style={{ backgroundColor: "#1e293b", borderColor: "#334155" }}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" style={{ color: "#1a8a80" }} />
              <h2 className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Upcoming Schedule</h2>
              {p.jersey_number && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "rgba(26,138,128,0.12)", color: "#1a8a80" }}>
                  Jersey #{p.jersey_number}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {schedule.map((ev, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(26,138,128,0.1)" }}>
                    <span className="text-[9px] font-bold uppercase leading-none" style={{ color: "#1a8a80" }}>
                      {ev.start_date ? new Date(ev.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" }) : "TBA"}
                    </span>
                    <span className="text-sm font-bold leading-none" style={{ color: "#1a8a80" }}>
                      {ev.start_date ? new Date(ev.start_date + "T00:00:00").getDate() : "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#e2e8f0" }}>{ev.name}</p>
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: "#64748b" }}>
                      {ev.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ev.location}</span>}
                      {ev.division && <span>{ev.division}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download PDF */}
        <div className="text-center mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href={`${API}/api/card/${slug}/pdf`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: "#1a8a80", color: "white" }}
            data-testid="download-pdf-public-btn">
            <Download className="w-4 h-4" />
            Download PDF
          </a>
          {p.contact_email && (
            <a href={`mailto:${p.contact_email}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 border"
              style={{ borderColor: "rgba(26,138,128,0.3)", color: "#1a8a80" }}>
              <Mail className="w-4 h-4" />
              Contact {p.first_name || p.athlete_name?.split(" ")[0] || "Athlete"}
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[10px]" style={{ color: "#475569" }}>
          Powered by CapyMatch
        </div>
      </div>
    </div>
  );
}
