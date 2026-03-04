import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "../lib/api";
import { Play, Lock, Sparkles, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import UniversityLogo from "../components/UniversityLogo";
import { useSubscription } from "../lib/subscription";
import UpgradeModal from "../components/UpgradeModal";

/* ── Decode HTML entities from YouTube API ── */
function decodeHtml(text) {
  if (!text) return "";
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

/* ── Relative time helper ── */
function timeAgo(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── Filters ── */
const BEACH_FILTER = /\bbeach\b/i;
const VB_FILTER = /w\.?\s*volley|women'?s?\s*volley|wvb/i;

/* ── Video Card ── */
function VideoCard({ video }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group outline-none"
      style={{ textDecoration: "none" }}
      data-testid={`video-card-${video.video_id}`}
    >
      {/* Thumbnail */}
      <div
        className="relative rounded-xl overflow-hidden mb-3"
        style={{ aspectRatio: "16/9", background: "#0a0a0a" }}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--t-surface)" }}>
            <Play className="w-8 h-8 opacity-20" style={{ color: "var(--t-text-muted)" }} />
          </div>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.9)" }}
          >
            <Play className="w-5 h-5 ml-0.5" style={{ color: "#000" }} fill="#000" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex gap-3">
        <UniversityLogo
          domain={video.domain}
          name={video.university_name}
          logoUrl={video.logo_url}
          size={36}
          className="mt-0.5 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2 mb-1 transition-colors duration-200 group-hover:opacity-80"
            style={{ color: "var(--t-text)" }}
          >
            {decodeHtml(video.title)}
          </h3>
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
            {video.university_name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)", opacity: 0.7 }}>
            {timeAgo(video.published_at)}
          </p>
        </div>
      </div>
    </a>
  );
}

/* ── Horizontal school filter bar ── */
function SchoolFilter({ schools, selected, onSelect, videoCounts }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, schools]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  if (!schools.length) return null;

  return (
    <div className="relative" data-testid="school-filter-bar">
      {/* Scroll arrows */}
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          data-testid="filter-scroll-left"
        >
          <ChevronLeft className="w-4 h-4" style={{ color: "var(--t-text)" }} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          data-testid="filter-scroll-right"
        >
          <ChevronRight className="w-4 h-4" style={{ color: "var(--t-text)" }} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto py-1 px-1 scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* All pill */}
        <button
          onClick={() => onSelect(null)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0"
          style={
            !selected
              ? { background: "var(--t-text)", color: "var(--t-bg)" }
              : { background: "var(--t-surface)", color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }
          }
          data-testid="filter-all-schools"
        >
          All Schools
        </button>

        {schools.map((s) => {
          const isActive = selected === s.university_name;
          const count = videoCounts[s.university_name] || 0;
          return (
            <button
              key={s.program_id}
              onClick={() => onSelect(isActive ? null : s.university_name)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0"
              style={
                isActive
                  ? { background: "var(--t-text)", color: "var(--t-bg)" }
                  : { background: "var(--t-surface)", color: "var(--t-text-secondary, var(--t-text-muted))", border: "1px solid var(--t-border)" }
              }
              data-testid={`school-filter-${s.program_id}`}
            >
              <UniversityLogo
                domain={s.domain}
                name={s.university_name}
                logoUrl={s.logo_url}
                size={20}
                className="rounded-full"
              />
              <span>{s.university_name?.replace(/\s*University\s*/gi, " U. ").trim()}</span>
              {count > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={
                    isActive
                      ? { background: "rgba(255,255,255,0.2)", color: "var(--t-bg)" }
                      : { background: "var(--t-border)", color: "var(--t-text-muted)" }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Locked / Upsell overlay ── */
function LockedOverlay({ onUpgrade }) {
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 400 }}>
      {/* Blurred placeholder grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6"
        style={{ filter: "blur(6px)", userSelect: "none", pointerEvents: "none", opacity: 0.5 }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>
            <div className="rounded-xl mb-3" style={{ aspectRatio: "16/9", background: "var(--t-border)" }} />
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: "var(--t-border)" }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded-full w-4/5" style={{ background: "var(--t-border)" }} />
                <div className="h-3 rounded-full w-2/3" style={{ background: "var(--t-border)" }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
        style={{ background: "linear-gradient(to bottom, transparent 0%, var(--t-bg) 60%)" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(26,138,128,0.1)", border: "1px solid rgba(26,138,128,0.15)" }}
        >
          <Lock className="w-6 h-6" style={{ color: "#1a8a80" }} />
        </div>
        <h2 className="text-lg font-bold mb-1.5" style={{ color: "var(--t-text)" }}>
          Live Feed
        </h2>
        <p className="text-sm max-w-sm mb-6" style={{ color: "var(--t-text-muted)", lineHeight: 1.7 }}>
          See the latest volleyball content from schools in your pipeline. Camp alerts, new commits, and more.
        </p>
        <button
          onClick={onUpgrade}
          data-testid="live-feed-upgrade-btn"
          className="flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "#1a8a80" }}
        >
          <Sparkles className="w-4 h-4" /> Upgrade to unlock
        </button>
      </div>
    </div>
  );
}

/* ── Skeleton loader ── */
function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="rounded-xl mb-3" style={{ aspectRatio: "16/9", background: "var(--t-border)" }} />
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: "var(--t-border)" }} />
            <div className="flex-1 space-y-2.5">
              <div className="h-3 rounded-full w-4/5" style={{ background: "var(--t-border)" }} />
              <div className="h-2.5 rounded-full w-1/2" style={{ background: "var(--t-border)" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Page
══════════════════════════════════════════ */
export default function SocialSpotlight() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedVideos, setFeedVideos] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [selectedName, setSelectedName] = useState(null);
  const [vbOnly, setVbOnly] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { subscription } = useSubscription();
  const tier = subscription?.tier || "basic";
  const isLocked = !tier || tier === "basic";

  /* Load pipeline schools */
  useEffect(() => {
    api.get("/programs")
      .then((res) => {
        const data = (Array.isArray(res.data) ? res.data : []).filter(
          (p) => p.board_group !== "archived"
        );
        setPrograms(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Load YouTube feed */
  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await api.get("/social-spotlight/feed");
      setFeedVideos(res.data.videos || []);
    } catch {
      setFeedVideos([]);
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tier && tier !== "basic") fetchFeed();
  }, [tier, fetchFeed]);

  const handleRefresh = useCallback(async () => {
    if (tier !== "basic") {
      await api.post("/social-spotlight/feed/refresh").catch(() => {});
      fetchFeed();
    }
  }, [tier, fetchFeed]);

  /* Filtered videos */
  const displayed = useMemo(() => {
    let list = feedVideos.filter((v) => !BEACH_FILTER.test(v.title));
    if (selectedName) list = list.filter((v) => v.university_name === selectedName);
    if (vbOnly) list = list.filter((v) => VB_FILTER.test(v.title) || VB_FILTER.test(v.description || ""));
    return list;
  }, [feedVideos, selectedName, vbOnly]);

  /* Video counts per school */
  const videoCounts = useMemo(() => {
    const counts = {};
    feedVideos
      .filter((v) => !BEACH_FILTER.test(v.title))
      .forEach((v) => {
        counts[v.university_name] = (counts[v.university_name] || 0) + 1;
      });
    return counts;
  }, [feedVideos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" data-testid="spotlight-loading">
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--t-border)", borderTopColor: "var(--t-text-muted)" }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto" data-testid="social-spotlight">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--t-text)" }}>
            Social Spotlight
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>
            Latest volleyball content from your pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isLocked && feedVideos.length > 0 && (
            <button
              onClick={() => setVbOnly((v) => !v)}
              data-testid="vb-only-toggle"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200"
              style={
                vbOnly
                  ? { background: "#1a8a80", color: "white" }
                  : { background: "var(--t-surface)", color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }
              }
            >
              Women's Only
            </button>
          )}
          {!isLocked && (
            <button
              onClick={handleRefresh}
              disabled={feedLoading}
              data-testid="spotlight-refresh"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200"
              style={{ background: "var(--t-surface)", color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${feedLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* School filter pills */}
      {!isLocked && programs.length > 0 && (
        <div className="mb-8">
          <SchoolFilter
            schools={programs}
            selected={selectedName}
            onSelect={setSelectedName}
            videoCounts={videoCounts}
          />
        </div>
      )}

      {/* Feed content */}
      {isLocked ? (
        <LockedOverlay onUpgrade={() => setShowUpgrade(true)} />
      ) : feedLoading ? (
        <FeedSkeleton />
      ) : displayed.length === 0 ? (
        <div className="py-20 text-center" data-testid="empty-feed">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--t-text-muted)" }}>
            {selectedName
              ? `No videos found for ${selectedName}`
              : "No videos yet"}
          </p>
          <p className="text-xs" style={{ color: "var(--t-text-muted)", opacity: 0.6 }}>
            {selectedName
              ? "Try selecting a different school or remove the filter."
              : "Add schools to your pipeline or try refreshing."}
          </p>
          {(selectedName || vbOnly) && (
            <button
              onClick={() => { setSelectedName(null); setVbOnly(false); }}
              className="mt-4 text-xs font-semibold px-4 py-2 rounded-full transition-all"
              style={{ background: "var(--t-surface)", color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}
              data-testid="clear-filters-btn"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Result count */}
          <div className="mb-5">
            <span className="text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>
              {displayed.length} video{displayed.length !== 1 ? "s" : ""}
              {selectedName && ` from ${selectedName}`}
            </span>
          </div>

          {/* Video grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8" data-testid="video-grid">
            {displayed.map((v) => (
              <VideoCard key={v.video_id} video={v} />
            ))}
          </div>
        </>
      )}

      {/* Upgrade modal */}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="social_spotlight"
        message="Unlock the Live Feed to see real posts from your target schools."
        currentTier={tier}
      />
    </div>
  );
}
