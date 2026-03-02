import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MapPin, Calendar, GraduationCap, Ruler, Video, Mail, ExternalLink, User, Download, Phone } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function StatBadge({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center px-3 py-2.5 rounded-lg" style={{ backgroundColor: "#f0fdfa" }}>
      <span className="text-lg font-bold" style={{ color: "#0f766e" }}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "#64748b" }}>{label}</span>
    </div>
  );
}

export default function PublicProfile() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/p/${slug}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(d => {
        setData(d);
        fetch(`${API}/api/p/${slug}/view`, { method: "POST" }).catch(() => {});
      })
      .catch(() => setError("Profile not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
      <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: "#1a8a80" }} />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2" style={{ color: "#1e293b" }}>Profile Not Found</h1>
        <p className="text-sm" style={{ color: "#64748b" }}>This link may be invalid or expired.</p>
      </div>
    </div>
  );

  const p = data;
  const position = Array.isArray(p.positions) ? p.positions[0] : "";
  const m = p.measurables || {};
  const a = p.academics || {};
  const v = p.videos || {};
  const c = p.contact || {};
  const featuredVideo = v.highlight_video || v.hudl_url || "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }} data-testid="public-profile">
      <div style={{ height: 4, background: "linear-gradient(90deg, #0f766e, #1a8a80, #2dd4bf)" }} />

      <div className="max-w-lg mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="text-center mb-6">
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.athlete_name} className="w-24 h-24 rounded-full mx-auto mb-3 object-cover border-2 shadow-md" style={{ borderColor: "#1a8a80" }} />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center shadow-md" style={{ backgroundColor: "#f0fdfa", border: "2px solid #1a8a80" }}>
              <User className="w-10 h-10" style={{ color: "#1a8a80" }} />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#0f172a" }}>{p.athlete_name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1.5 text-sm" style={{ color: "#475569" }}>
            {position && <span>{position}</span>}
            {p.graduation_year && <span>Class of {p.graduation_year}</span>}
            {p.jersey_number && <span>#{p.jersey_number}</span>}
          </div>
          {(p.club_team || p.high_school) && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1 text-xs" style={{ color: "#94a3b8" }}>
              {p.club_team && <span>{p.club_team}</span>}
              {p.high_school && <span>{p.high_school}</span>}
              {p.city && p.state && <span>{p.city}, {p.state}</span>}
            </div>
          )}
        </div>

        {/* Featured Video */}
        {featuredVideo && (
          <div className="rounded-xl border p-4 mb-4 shadow-sm" style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-4 h-4" style={{ color: "#1a8a80" }} />
              <h2 className="text-sm font-bold" style={{ color: "#0f172a" }}>Highlights</h2>
            </div>
            <a href={featuredVideo} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: "#1a8a80" }}>
              <ExternalLink className="w-3.5 h-3.5" />Watch highlights
            </a>
            {v.hudl_url && v.hudl_url !== featuredVideo && (
              <a href={v.hudl_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs mt-2 hover:underline" style={{ color: "#94a3b8" }}>
                <ExternalLink className="w-3 h-3" />Hudl profile
              </a>
            )}
            {v.full_game_film_url && (
              <a href={v.full_game_film_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs mt-2 hover:underline" style={{ color: "#94a3b8" }}>
                <ExternalLink className="w-3 h-3" />Full game film
              </a>
            )}
          </div>
        )}

        {/* Measurables */}
        {Object.values(m).some(Boolean) && (
          <div className="rounded-xl border p-4 mb-4 shadow-sm" style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4" style={{ color: "#1a8a80" }} />
              <h2 className="text-sm font-bold" style={{ color: "#0f172a" }}>Athletic Measurables</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBadge label="Height" value={m.height} />
              <StatBadge label="Weight" value={m.weight ? `${m.weight} lbs` : ""} />
              <StatBadge label="Reach" value={m.standing_reach} />
              <StatBadge label="Approach" value={m.approach_touch} />
              <StatBadge label="Block" value={m.block_touch} />
              <StatBadge label="Wingspan" value={m.wingspan} />
              <StatBadge label="Hand" value={m.handed} />
            </div>
          </div>
        )}

        {/* Academics */}
        {(a.gpa || a.sat_score || a.act_score) && (
          <div className="rounded-xl border p-4 mb-4 shadow-sm" style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4" style={{ color: "#1a8a80" }} />
              <h2 className="text-sm font-bold" style={{ color: "#0f172a" }}>Academics</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatBadge label="GPA" value={a.gpa} />
              <StatBadge label="SAT" value={a.sat_score} />
              <StatBadge label="ACT" value={a.act_score} />
            </div>
          </div>
        )}

        {/* Schedule */}
        {p.schedule?.length > 0 && (
          <div className="rounded-xl border p-4 mb-4 shadow-sm" style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" style={{ color: "#1a8a80" }} />
              <h2 className="text-sm font-bold" style={{ color: "#0f172a" }}>Upcoming Schedule</h2>
            </div>
            <div className="space-y-2">
              {p.schedule.map((ev, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0" style={{ backgroundColor: "#f0fdfa" }}>
                    <span className="text-[9px] font-bold uppercase leading-none" style={{ color: "#0f766e" }}>
                      {ev.start_date ? new Date(ev.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short" }) : "TBA"}
                    </span>
                    <span className="text-sm font-bold leading-none" style={{ color: "#0f766e" }}>
                      {ev.start_date ? new Date(ev.start_date + "T00:00:00").getDate() : "?"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#1e293b" }}>{ev.name}</p>
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: "#94a3b8" }}>
                      {ev.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{ev.location}</span>}
                      {ev.division && <span>{ev.division}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(c.email || c.phone) && (
          <div className="rounded-xl border p-4 mb-4 shadow-sm" style={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}>
            <h2 className="text-sm font-bold mb-2" style={{ color: "#0f172a" }}>Contact</h2>
            <div className="space-y-1.5">
              {c.email && (
                <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-sm hover:underline" style={{ color: "#1a8a80" }}>
                  <Mail className="w-3.5 h-3.5" />{c.email}
                </a>
              )}
              {c.phone && (
                <span className="flex items-center gap-2 text-sm" style={{ color: "#475569" }}>
                  <Phone className="w-3.5 h-3.5" />{c.phone}
                </span>
              )}
              {c.parent_name && (
                <span className="text-xs" style={{ color: "#94a3b8" }}>Club Coach: {c.parent_name}{c.parent_email ? ` (${c.parent_email})` : ""}</span>
              )}
            </div>
          </div>
        )}

        {/* Download PDF + CTA */}
        <div className="text-center mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href={`${API}/api/p/${slug}/pdf`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 shadow-sm"
            style={{ backgroundColor: "#1a8a80", color: "white" }}
            data-testid="download-pdf-public-btn">
            <Download className="w-4 h-4" />Download PDF
          </a>
        </div>

        <div className="text-center mt-8 text-[10px]" style={{ color: "#94a3b8" }}>
          Powered by CapyMatch
        </div>
      </div>
    </div>
  );
}
