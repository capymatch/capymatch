import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Calendar, MapPin, Clock, Play, Mail, Phone, User, Loader2, ExternalLink } from "lucide-react";
import { BACKEND_URL } from "../lib/api";

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  let videoId = null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.pathname === "/watch") {
      videoId = u.searchParams.get("v");
    } else if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/embed/")) {
      videoId = u.pathname.split("/embed/")[1]?.split("?")[0];
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1).split("?")[0];
    } else if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/shorts/")) {
      videoId = u.pathname.split("/shorts/")[1]?.split("?")[0];
    }
  } catch { return null; }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

const EVENT_COLORS = {
  Camp: "bg-purple-500",
  Showcase: "bg-blue-500",
  Tournament: "bg-amber-500",
  Visit: "bg-emerald-500",
  Tryout: "bg-pink-500",
  Meeting: "bg-cyan-500",
  Deadline: "bg-red-500",
  Other: "bg-gray-500",
};

function formatDate(dateStr) {
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

function EventCard({ event }) {
  const color = EVENT_COLORS[event.event_type] || "bg-gray-500";
  return (
    <div className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
      <div className={`w-1.5 rounded-full ${color} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold text-white">{event.title}</h4>
            <span className="text-xs text-purple-300 font-medium">{event.event_type}</span>
          </div>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            {formatDate(event.start_date)}
            {event.end_date && event.end_date !== event.start_date && ` – ${formatDate(event.end_date)}`}
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {event.location}
            </div>
          )}
          {event.start_time && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ""}
            </div>
          )}
        </div>
        {event.description && (
          <p className="mt-2 text-sm text-gray-400">{event.description}</p>
        )}
      </div>
    </div>
  );
}

export default function PublicSchedule() {
  const { shortId, tenantId: legacyTenantId } = useParams();
  const tenantId = legacyTenantId || (shortId ? `tenant_${shortId}` : "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/public/schedule/${tenantId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Athlete not found"))
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Athlete Not Found</h1>
          <p className="text-gray-400">This schedule link may be invalid or the profile hasn't been set up yet.</p>
        </div>
      </div>
    );
  }

  const { profile, upcoming_events, past_events } = data;
  const hasPhoto = profile.photo_url && profile.photo_url.startsWith("data:");

  return (
    <div data-testid="public-schedule" className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/30 to-indigo-900/30" />
        <div className="relative max-w-4xl mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            {/* Photo */}
            <div className="flex-shrink-0">
              {hasPhoto ? (
                <img
                  src={profile.photo_url}
                  alt={profile.athlete_name}
                  className="w-36 h-36 rounded-2xl object-cover border-2 border-purple-500/40 shadow-2xl"
                  data-testid="athlete-photo"
                />
              ) : (
                <div className="w-36 h-36 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center border-2 border-purple-500/40 shadow-2xl">
                  <User className="w-16 h-16 text-white/70" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-4xl font-bold text-white mb-1" data-testid="athlete-name">
                {profile.athlete_name || "Athlete"}
              </h1>

              <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                {profile.position && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {profile.position}
                  </span>
                )}
                {profile.grad_year && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Class of {profile.grad_year}
                  </span>
                )}
                {profile.height && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {profile.height}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 justify-center sm:justify-start text-sm text-gray-300">
                {profile.club_team && <span>{profile.club_team}</span>}
                {profile.high_school && <span>{profile.high_school}</span>}
                {profile.city && profile.state && <span>{profile.city}, {profile.state}</span>}
                {profile.jersey_number && <span>#{profile.jersey_number}</span>}
                {profile.gpa && <span>GPA: {profile.gpa}</span>}
              </div>

              {/* Physical Stats */}
              {(profile.weight || profile.handed || profile.standing_reach || profile.approach_touch || profile.block_touch || profile.wingspan) && (
                <div className="flex flex-wrap gap-3 mt-4 justify-center sm:justify-start">
                  {profile.weight && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                      {profile.weight} lbs
                    </span>
                  )}
                  {profile.handed && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                      {profile.handed} Handed
                    </span>
                  )}
                  {profile.standing_reach && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                      Reach: {profile.standing_reach}
                    </span>
                  )}
                  {profile.approach_touch && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                      Approach: {profile.approach_touch}
                    </span>
                  )}
                  {profile.block_touch && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                      Block: {profile.block_touch}
                    </span>
                  )}
                  {profile.wingspan && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300 border border-white/10">
                      Wingspan: {profile.wingspan}
                    </span>
                  )}
                </div>
              )}

              {profile.bio && (
                <p className="mt-4 text-gray-400 text-sm max-w-lg leading-relaxed">{profile.bio}</p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 mt-5 justify-center sm:justify-start">
                {profile.video_link && (
                  <a
                    href={profile.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="video-link"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Watch Highlights
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </a>
                )}
                {profile.contact_email && (
                  <a
                    href={`mailto:${profile.contact_email}`}
                    data-testid="email-link"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                )}
                {profile.contact_phone && (
                  <a
                    href={`tel:${profile.contact_phone}`}
                    data-testid="phone-link"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Club Coach Contact */}
      {(profile.parent_name || profile.parent_email || profile.parent_phone) && (
        <div className="max-w-4xl mx-auto px-6 mt-10 mb-8">
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Club Coach</h3>
            <div className="flex flex-wrap gap-6 text-sm text-gray-300">
              {profile.parent_name && <span>{profile.parent_name}</span>}
              {profile.parent_email && (
                <a href={`mailto:${profile.parent_email}`} className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300">
                  <Mail className="w-3.5 h-3.5" /> {profile.parent_email}
                </a>
              )}
              {profile.parent_phone && (
                <a href={`tel:${profile.parent_phone}`} className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300">
                  <Phone className="w-3.5 h-3.5" /> {profile.parent_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Video */}
      {profile.video_link && getYouTubeEmbedUrl(profile.video_link) && (
        <div className="max-w-4xl mx-auto px-6 mt-10 mb-8" data-testid="video-embed-section">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-purple-400" />
            Highlights
          </h2>
          <div className="rounded-xl overflow-hidden border border-white/10 aspect-video">
            <iframe
              src={getYouTubeEmbedUrl(profile.video_link)}
              title="Highlights Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              data-testid="video-embed-iframe"
            />
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white mb-6">
          Upcoming Events
          {upcoming_events.length > 0 && (
            <span className="ml-3 text-base font-normal text-gray-400">({upcoming_events.length})</span>
          )}
        </h2>

        {upcoming_events.length > 0 ? (
          <div className="space-y-3" data-testid="upcoming-events">
            {upcoming_events.map((evt) => (
              <EventCard key={evt.event_id} event={evt} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl bg-white/5 border border-white/10">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No upcoming events scheduled</p>
          </div>
        )}

        {/* Past Events */}
        {past_events.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">
              Past Events
              <span className="ml-3 text-base font-normal text-gray-400">({past_events.length})</span>
            </h2>
            <div className="space-y-3 opacity-60" data-testid="past-events">
              {past_events.map((evt) => (
                <EventCard key={evt.event_id} event={evt} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 py-6 text-center text-xs text-gray-500">
        Powered by Recruiting HQ
      </div>
    </div>
  );
}
