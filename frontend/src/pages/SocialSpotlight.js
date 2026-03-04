import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Radio, RefreshCw, ExternalLink, MapPin, ChevronRight, Layers, Flame, Tent, UserCheck, Trophy } from "lucide-react";
import UniversityLogo from "../components/UniversityLogo";

/* ── Platform definitions ── */
const PLATFORMS = {
  twitter: {
    label: "X / Twitter",
    color: "#e7e7e7",
    bg: "rgba(231,231,231,0.06)",
    icon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    color: "#e1306c",
    bg: "rgba(225,48,108,0.08)",
    icon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5"/>
        <circle cx="12" cy="12" r="5"/>
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  facebook: {
    label: "Facebook",
    color: "#1877f2",
    bg: "rgba(24,119,242,0.08)",
    icon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  youtube: {
    label: "YouTube",
    color: "#ff0000",
    bg: "rgba(255,0,0,0.08)",
    icon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  tiktok: {
    label: "TikTok",
    color: "#69c9d0",
    bg: "rgba(105,201,208,0.08)",
    icon: () => (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.94a8.19 8.19 0 004.78 1.52V7.01a4.85 4.85 0 01-1.01-.32z"/>
      </svg>
    ),
  },
};

const STAGE_STYLES = {
  overdue:         { label: "Overdue",       bg: "rgba(248,113,113,0.1)",  color: "#f87171" },
  waiting_on_reply:{ label: "Waiting",       bg: "rgba(245,158,11,0.1)",   color: "#f59e0b" },
  needs_outreach:  { label: "Needs Outreach",bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
  in_conversation: { label: "In Convo",      bg: "rgba(26,138,128,0.1)",   color: "#1a8a80" },
  committed:       { label: "Committed",     bg: "rgba(34,197,94,0.1)",    color: "#22c55e" },
};

function getStagePriority(p) {
  if (p.recruiting_status === "Committed") return 0;
  const map = { overdue: 1, waiting_on_reply: 2, in_conversation: 3, needs_outreach: 4 };
  return map[p.board_group] ?? 5;
}

function getStageStyle(p) {
  if (p.recruiting_status === "Committed") return STAGE_STYLES.committed;
  return STAGE_STYLES[p.board_group] || STAGE_STYLES.needs_outreach;
}

/* ── Platform button ── */
function PlatformButton({ platform, url }) {
  const cfg = PLATFORMS[platform];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105 active:scale-95"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20` }}
      data-testid={`platform-link-${platform}`}
      onClick={e => e.stopPropagation()}
    >
      <Icon />{cfg.label}
    </a>
  );
}

/* ── School Card ── */
function SchoolCard({ program: p, active, onClick }) {
  const ss = getStageStyle(p);
  const links = p.social_links || {};
  const platforms = Object.keys(links).filter(k => PLATFORMS[k]);
  const hasSocial = platforms.length > 0;

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all cursor-pointer group"
      style={{
        background: active ? "var(--t-surface)" : "var(--t-surface)",
        borderColor: active ? "#1a8a80" : "var(--t-border)",
        boxShadow: active ? "0 0 0 1px #1a8a8040" : "none",
      }}
      onClick={onClick}
      data-testid={`spotlight-card-${p.program_id}`}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: "var(--t-border)" }}>
        <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={p.logo_url} size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate" style={{ color: "var(--t-text)" }}>{p.university_name}</div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {p.division && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: "var(--t-surface-alt, #f0f0f0)", color: "var(--t-text-muted)", border: "1px solid var(--t-border)" }}>{p.division}</span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
          </div>
        </div>
        {hasSocial && (
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ background: "rgba(26,138,128,0.1)", color: "#1a8a80" }}>
            {platforms.length}
          </div>
        )}
      </div>

      {/* Platform links */}
      <div className="px-4 py-3">
        {hasSocial ? (
          <div className="flex flex-wrap gap-2">
            {platforms.map(pl => <PlatformButton key={pl} platform={pl} url={links[pl]} />)}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50" />
            <span className="text-[11px]" style={{ color: "var(--t-text-faint, #aaa)" }}>No social accounts found yet</span>
          </div>
        )}
      </div>

      {/* Footer meta */}
      {(p.conference || p.location) && (
        <div className="px-4 pb-3 flex items-center gap-1 text-[10px]" style={{ color: "var(--t-text-muted)" }}>
          <MapPin className="w-2.5 h-2.5" />
          {[p.conference, p.location || p.state].filter(Boolean).join(" · ")}
        </div>
      )}

      {/* Journey link */}
      <div className="border-t px-4 py-2.5 flex items-center justify-between" style={{ borderColor: "var(--t-border)" }}>
        <span className="text-[10px] font-semibold" style={{ color: "var(--t-text-muted)" }}>
          {p.coach_email ? p.primary_coach || "Coach on file" : "View journey for details"}
        </span>
        <span className="text-[10px] font-bold flex items-center gap-1 group-hover:gap-1.5 transition-all" style={{ color: "#1a8a80" }}>
          Open Journey <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function SocialSpotlight() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activePlatform, setActivePlatform] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedSchool, setSelectedSchool] = useState(null);

  useEffect(() => {
    api.get("/programs").then(res => {
      const data = Array.isArray(res.data) ? res.data.filter(p => p.board_group !== "archived") : [];
      data.sort((a, b) => getStagePriority(a) - getStagePriority(b));
      setPrograms(data);
      if (data.length > 0) setSelectedSchool(data[0].program_id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const platformCounts = useMemo(() => {
    const counts = {};
    programs.forEach(p => {
      Object.keys(p.social_links || {}).forEach(pl => {
        counts[pl] = (counts[pl] || 0) + 1;
      });
    });
    return counts;
  }, [programs]);

  const filtered = useMemo(() => {
    let list = programs;
    if (activeFilter === "social") list = list.filter(p => Object.keys(p.social_links || {}).length > 0);
    if (activeFilter === "nosocial") list = list.filter(p => Object.keys(p.social_links || {}).length === 0);
    if (activePlatform) list = list.filter(p => p.social_links?.[activePlatform]);
    return list;
  }, [programs, activeFilter, activePlatform]);

  const topSchools = useMemo(() => {
    return [...programs]
      .filter(p => Object.keys(p.social_links || {}).length > 0)
      .sort((a, b) => Object.keys(b.social_links || {}).length - Object.keys(a.social_links || {}).length)
      .slice(0, 5);
  }, [programs]);

  const withSocial = programs.filter(p => Object.keys(p.social_links || {}).length > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="spotlight-loading">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--t-border)", borderTopColor: "var(--t-text-muted)" }} />
          <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Loading social profiles...</span>
        </div>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="spotlight-empty">
        <Radio className="w-10 h-10 mb-4 opacity-30" style={{ color: "var(--t-text-muted)" }} />
        <p className="text-base font-semibold mb-1" style={{ color: "var(--t-text)" }}>No schools on your list yet</p>
        <p className="text-sm mb-6" style={{ color: "var(--t-text-muted)" }}>Add schools to your pipeline to see their social profiles here.</p>
        <button
          className="px-5 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "#1a8a80" }}
          onClick={() => navigate("/knowledge-base")}
          data-testid="spotlight-add-schools"
        >
          Find Schools
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-6" data-testid="social-spotlight">
      {/* ── LEFT: School List ── */}
      <aside className="hidden xl:flex flex-col gap-1 w-52 flex-shrink-0">
        <div className="text-[9px] font-extrabold tracking-[1.5px] uppercase mb-2 px-1" style={{ color: "var(--t-text-faint, #aaa)" }}>
          Your Pipeline
        </div>
        {programs.map(p => {
          const ss = getStageStyle(p);
          const hasSocial = Object.keys(p.social_links || {}).length > 0;
          const isActive = selectedSchool === p.program_id;
          return (
            <button
              key={p.program_id}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group w-full"
              style={{
                background: isActive ? "var(--t-surface)" : "transparent",
                border: isActive ? "1px solid var(--t-border-strong, #ddd)" : "1px solid transparent",
              }}
              onClick={() => setSelectedSchool(p.program_id)}
              data-testid={`sidebar-school-${p.program_id}`}
            >
              <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={p.logo_url} size={26} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold truncate" style={{ color: "var(--t-text)" }}>{p.university_name}</div>
                <div className="text-[9px] font-semibold mt-0.5" style={{ color: ss.color }}>{ss.label}</div>
              </div>
              {hasSocial
                ? <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#1a8a80" }} />
                : <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--t-border, #ddd)" }} />
              }
            </button>
          );
        })}
        <div className="mt-4 px-3 py-2.5 rounded-xl border" style={{ borderColor: "var(--t-border)", background: "var(--t-surface)" }}>
          <div className="text-[9px] font-extrabold tracking-[1.5px] uppercase mb-2" style={{ color: "var(--t-text-faint, #aaa)" }}>Platforms</div>
          {Object.entries(platformCounts).map(([pl, count]) => {
            const cfg = PLATFORMS[pl];
            if (!cfg) return null;
            const Icon = cfg.icon;
            return (
              <div key={pl} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: cfg.bg, color: cfg.color }}><Icon /></div>
                <span className="text-[11px]" style={{ color: "var(--t-text-secondary, #555)" }}>{cfg.label}</span>
                <span className="ml-auto text-[10px] font-bold" style={{ color: "var(--t-text-muted)" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── CENTER: Feed ── */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--t-text)" }}>Social Spotlight</h1>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>
              {withSocial} of {programs.length} schools have social profiles · Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border"
            style={{ background: "rgba(26,138,128,0.08)", borderColor: "rgba(26,138,128,0.2)", color: "#1a8a80" }}
            onClick={() => setLastUpdated(new Date())}
            data-testid="spotlight-refresh"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap mb-5" data-testid="spotlight-filters">
          {[
            { key: "all", label: "All Schools", icon: <Layers className="w-3 h-3" />, count: programs.length },
            { key: "social", label: "Has Social", icon: <Radio className="w-3 h-3" />, count: withSocial },
            { key: "nosocial", label: "Missing Links", icon: <Flame className="w-3 h-3" />, count: programs.length - withSocial },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => { setActiveFilter(f.key); setActivePlatform(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] transition-all"
              style={activeFilter === f.key && !activePlatform
                ? { background: "var(--t-text)", color: "var(--t-bg, #fff)", borderColor: "var(--t-text)" }
                : { background: "var(--t-surface)", color: "var(--t-text-secondary, #555)", borderColor: "var(--t-border)" }
              }
              data-testid={`filter-${f.key}`}
            >
              {f.icon}{f.label}
              <span className="font-extrabold">{f.count}</span>
            </button>
          ))}
          {/* Platform filters */}
          {Object.entries(platformCounts).map(([pl, count]) => {
            const cfg = PLATFORMS[pl];
            if (!cfg) return null;
            const Icon = cfg.icon;
            const isActive = activePlatform === pl;
            return (
              <button
                key={pl}
                onClick={() => { setActivePlatform(isActive ? null : pl); setActiveFilter("all"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border-[1.5px] transition-all"
                style={isActive
                  ? { background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}40` }
                  : { background: "var(--t-surface)", color: "var(--t-text-secondary, #555)", borderColor: "var(--t-border)" }
                }
                data-testid={`platform-filter-${pl}`}
              >
                <span style={{ color: isActive ? cfg.color : "var(--t-text-muted)" }}><Icon /></span>
                {cfg.label} <span className="font-extrabold">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: "var(--t-text-muted)" }}>
            No schools match this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((p, i) => (
              <div
                key={p.program_id}
                style={{ animationDelay: `${i * 0.05}s` }}
                className="spotlight-card-enter"
              >
                <SchoolCard
                  program={p}
                  active={selectedSchool === p.program_id}
                  onClick={() => navigate(`/journey/${p.program_id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: Stats ── */}
      <aside className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">
        {/* Coverage stat */}
        <div className="rounded-2xl border p-4" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="text-[9px] font-extrabold tracking-[1.5px] uppercase mb-3" style={{ color: "var(--t-text-faint, #aaa)" }}>Social Coverage</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--t-border)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9155" fill="none"
                  stroke="#1a8a80" strokeWidth="3"
                  strokeDasharray={`${(withSocial / Math.max(programs.length, 1)) * 100} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-extrabold" style={{ color: "var(--t-text)" }}>
                  {Math.round((withSocial / Math.max(programs.length, 1)) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold" style={{ color: "var(--t-text)", lineHeight: 1 }}>{withSocial}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>of {programs.length} schools</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--t-text-muted)" }}>have social links</div>
            </div>
          </div>
          {/* Platform breakdown */}
          <div className="space-y-2">
            {Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([pl, count]) => {
              const cfg = PLATFORMS[pl];
              if (!cfg) return null;
              const Icon = cfg.icon;
              const pct = (count / programs.length) * 100;
              return (
                <div key={pl}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: cfg.color }}><Icon /></span>
                      <span className="text-[10px] font-semibold" style={{ color: "var(--t-text-secondary, #555)" }}>{cfg.label}</span>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: "var(--t-text-muted)" }}>{count}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--t-border)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color, opacity: 0.7 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most connected schools */}
        <div className="rounded-2xl border p-4" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="text-[9px] font-extrabold tracking-[1.5px] uppercase mb-3" style={{ color: "var(--t-text-faint, #aaa)" }}>
            Most Connected
          </div>
          <div className="space-y-2.5">
            {topSchools.map((p, i) => {
              const ss = getStageStyle(p);
              const count = Object.keys(p.social_links || {}).length;
              return (
                <div
                  key={p.program_id}
                  className="flex items-center gap-2.5 cursor-pointer group"
                  onClick={() => navigate(`/journey/${p.program_id}`)}
                  data-testid={`top-school-${p.program_id}`}
                >
                  <span className="text-[10px] font-bold w-4 text-right flex-shrink-0" style={{ color: "var(--t-text-faint, #bbb)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={p.logo_url} size={24} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold truncate group-hover:underline" style={{ color: "var(--t-text)" }}>
                      {p.university_name}
                    </div>
                    <div className="text-[9px] font-semibold" style={{ color: ss.color }}>{ss.label}</div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    {Object.keys(p.social_links || {}).slice(0, 4).map(pl => {
                      const cfg = PLATFORMS[pl];
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return <span key={pl} style={{ color: cfg.color, opacity: 0.7 }}><Icon /></span>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border p-4 space-y-2" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="text-[9px] font-extrabold tracking-[1.5px] uppercase mb-1" style={{ color: "var(--t-text-faint, #aaa)" }}>Quick Actions</div>
          <button
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-left transition-all border"
            style={{ background: "rgba(26,138,128,0.06)", borderColor: "rgba(26,138,128,0.15)", color: "#1a8a80" }}
            onClick={() => navigate("/pipeline")}
            data-testid="spotlight-goto-pipeline"
          >
            <Trophy className="w-3.5 h-3.5" /> View My Pipeline
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-bold text-left transition-all border"
            style={{ background: "var(--t-surface-alt, #f5f5f5)", borderColor: "var(--t-border)", color: "var(--t-text-secondary, #555)" }}
            onClick={() => navigate("/knowledge-base")}
            data-testid="spotlight-goto-kb"
          >
            <UserCheck className="w-3.5 h-3.5" /> Add More Schools
          </button>
        </div>

        {/* Coming soon */}
        <div className="rounded-2xl border p-4" style={{ background: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="text-[9px] font-extrabold tracking-[1.5px] uppercase mb-1" style={{ color: "var(--t-text-faint, #aaa)" }}>Coming Soon</div>
          <p className="text-[11px] leading-relaxed mt-2" style={{ color: "var(--t-text-muted)" }}>
            Live post feed, camp alerts, and commitment tracking — powered by social media API integration.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Live Feed", "Camp Alerts", "Commit Watch", "Trending"].map(tag => (
              <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}>{tag}</span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
