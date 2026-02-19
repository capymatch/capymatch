import { Sparkles, Trophy, MapPin, Building2, Plus, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import UniversityLogo from "../UniversityLogo";
import { Button } from "../ui/button";
import { useRef } from "react";

const DIV_COLORS = {
  D1: "bg-teal-700 text-white",
  D2: "bg-blue-600 text-white",
  D3: "bg-violet-600 text-white",
  NAIA: "bg-orange-600 text-white",
  JUCO: "bg-yellow-600 text-white",
};

export default function SpotlightHero({ suggestions, adding, addToBoard, boardSchools }) {
  const scrollRef = useRef(null);
  if (!suggestions || suggestions.length === 0) return null;

  const hero = suggestions[0];
  const rest = suggestions.slice(1, 8);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 220, behavior: "smooth" });
    }
  };

  const isOnBoard = boardSchools.has(hero.university_name);

  return (
    <div className="space-y-4" data-testid="spotlight-section">
      {/* Section Label */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-0.5 rounded-full bg-gray-700" />
        <span className="font-heading font-bold text-[11px] uppercase tracking-widest text-gray-700">
          Your #1 Match
        </span>
      </div>

      {/* Hero Card */}
      <div
        className="rounded-xl overflow-hidden border shadow-md hover:shadow-lg transition-shadow duration-300"
        style={{ borderColor: "var(--t-border)" }}
        data-testid="spotlight-hero-card"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[260px]">
          {/* Left - Visual */}
          <div className="relative p-8 lg:p-10 flex flex-col justify-center" style={{ background: "linear-gradient(135deg, #0a2540, #1a365d)" }}>
            <div className="absolute right-[-60px] bottom-[-60px] w-[200px] h-[200px] rounded-full" style={{ background: "radial-gradient(circle, rgba(46,196,182,0.2), transparent 70%)" }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-heading text-[11px] font-bold uppercase tracking-widest text-white/50">
                  Best Match for You
                </span>
              </div>
              <h2 className="font-heading text-3xl lg:text-4xl font-extrabold uppercase text-white tracking-tight leading-none mb-3" data-testid="spotlight-hero-name">
                {hero.university_name}
              </h2>
              <div className="flex items-center gap-3 text-white/60 text-sm mb-5">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${DIV_COLORS[hero.division] || "bg-gray-600 text-white"}`}>
                  {hero.division}
                </span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {hero.region}</span>
                {hero.conference && <span>{hero.conference}</span>}
              </div>
              <div className="rounded-lg p-3 text-[13px] text-white/70 leading-relaxed border border-white/[0.06]" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
                <strong className="text-white/90"><Sparkles className="w-3.5 h-3.5 inline mr-1" />Why this school?</strong><br />
                {hero.match_reasons?.length > 0
                  ? `Strong match across ${hero.match_reasons.join(", ").toLowerCase()}. This program aligns well with your recruiting profile and preferences.`
                  : "This school matches your profile criteria across multiple dimensions."}
              </div>
            </div>
          </div>

          {/* Right - Details */}
          <div className="p-8 lg:p-10 flex flex-col justify-center gap-5" style={{ backgroundColor: "var(--t-surface)" }}>
            <div className="flex items-center gap-4">
              <span className="font-heading text-5xl font-extrabold text-gray-800 leading-none" data-testid="spotlight-hero-score">
                {hero.match_score}%
              </span>
              <div>
                <div className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: "var(--t-text-muted)" }}>Match Score</div>
                <div className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                  {hero.match_score >= 90 ? "Top 1% of all matches" : hero.match_score >= 80 ? "Excellent match" : "Good match"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {hero.match_reasons?.map(r => (
                <span key={r} className="text-xs px-2.5 py-1 rounded-md font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  {r}
                </span>
              ))}
            </div>

            {(hero.primary_coach || hero.recruiting_coordinator) && (
              <div className="rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: "var(--t-surface-alt)", border: "1px solid var(--t-border)" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                  {(hero.primary_coach || hero.recruiting_coordinator || "").split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: "var(--t-text)" }}>{hero.primary_coach || hero.recruiting_coordinator}</div>
                  <div className="text-xs" style={{ color: "var(--t-text-muted)" }}>{hero.primary_coach ? "Head Coach" : "Recruiting Coordinator"}</div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => addToBoard(hero)}
                disabled={adding[hero.university_name] || isOnBoard}
                data-testid="spotlight-add-to-board"
                className={`flex-1 h-11 text-sm font-semibold gap-2 ${isOnBoard ? "bg-teal-700 hover:bg-teal-700 text-white" : "bg-gray-800 hover:bg-gray-900 text-white"}`}
              >
                {isOnBoard ? (<><span className="text-white">On Your Board</span></>) : (<><Plus className="w-4 h-4" />{adding[hero.university_name] ? "Adding..." : "Add to Board"}</>)}
              </Button>
              {hero.domain && (
                <Button variant="outline" className="h-11 gap-2 text-sm" style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
                  onClick={() => window.open(`https://${hero.domain}`, "_blank")} data-testid="spotlight-website-btn">
                  <ExternalLink className="w-4 h-4" /> Website
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* More Matches Carousel */}
      {rest.length > 0 && (
        <div className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded-full bg-gray-700" />
              <span className="font-heading font-bold text-[11px] uppercase tracking-widest text-gray-700">
                More Matches
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-500/10 text-gray-600">
                {suggestions.length} total
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => scroll(-1)} className="p-1.5 rounded-md hover:bg-black/5 transition-colors" style={{ color: "var(--t-text-muted)" }} data-testid="carousel-prev">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => scroll(1)} className="p-1.5 rounded-md hover:bg-black/5 transition-colors" style={{ color: "var(--t-text-muted)" }} data-testid="carousel-next">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }} data-testid="matches-carousel">
            {rest.map(s => {
              const onBoard = boardSchools.has(s.university_name);
              return (
                <div
                  key={s.university_name}
                  className="min-w-[200px] p-4 rounded-lg border flex-shrink-0 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    backgroundColor: "var(--t-surface)",
                    borderColor: onBoard ? "var(--t-teal, #0d9488)" : "var(--t-border)",
                    boxShadow: "var(--t-shadow, 0 1px 3px rgba(0,0,0,0.06))",
                  }}
                  onClick={() => !onBoard && !adding[s.university_name] && addToBoard(s)}
                  data-testid={`mini-card-${s.university_name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <UniversityLogo domain={s.domain} name={s.university_name} size={32} />
                    <span className="font-heading text-lg font-bold text-gray-700">{s.match_score}%</span>
                  </div>
                  <div className="font-semibold text-[13px] leading-tight mb-1" style={{ color: "var(--t-text)" }}>{s.university_name}</div>
                  <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--t-text-muted)" }}>
                    <MapPin className="w-3 h-3" /> {s.region} {s.conference && `· ${s.conference}`}
                  </div>
                  {onBoard && (
                    <div className="mt-2 text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> On Board
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
