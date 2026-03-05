import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import {
  Plus, ChevronRight, ChevronDown, Loader2, Filter,
  PartyPopper, Rocket, CheckCircle2, Send, Eye, Link2, Users, Lightbulb,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import EmptyBoardState from "./pipeline/EmptyBoardState";
import UniversityLogo from "../components/UniversityLogo";
import { RAIL_STAGES } from "../components/journey/constants";

/* ── Section Config ── */
const SECTIONS = [
  { key: "outreach", label: "Needs outreach", color: "#d97706", bg: "#fffbeb" },
  { key: "waiting", label: "Upcoming follow-ups", color: "#dc2626", bg: "#fef2f2" },
  { key: "convo", label: "In conversation", color: "#2563eb", bg: "#eff6ff" },
  { key: "committed", label: "Committed", color: "#16a34a", bg: "#f0fdf4" },
];

/* ── Grouping ── */
function groupIntoSections(programs) {
  const s = { outreach: [], waiting: [], convo: [], committed: [] };
  for (const p of programs) {
    if (p.recruiting_status === "Committed" || p.journey_stage === "committed") {
      s.committed.push(p);
      continue;
    }
    const g = p.board_group;
    if (g === "needs_outreach") s.outreach.push(p);
    else if (g === "waiting_on_reply" || g === "overdue") s.waiting.push(p);
    else if (g === "in_conversation") s.convo.push(p);
    else if (g !== "archived") s.outreach.push(p);
  }
  return s;
}

/* ── Compute rail from journey_stage ── */
function computeRail(journeyStage) {
  const activeIdx = journeyStage
    ? RAIL_STAGES.findIndex(s => s.key === journeyStage)
    : 0;
  const idx = activeIdx >= 0 ? activeIdx : 0;
  return RAIL_STAGES.map((s, i) => ({
    ...s,
    state: i < idx ? "past" : i === idx ? "active" : "future",
  }));
}

/* ── Temperature tag ── */
function getTemperature(p) {
  const sig = p.signals || {};
  if (p.board_group === "in_conversation") {
    if (sig.days_since_activity != null && sig.days_since_activity <= 3) return { label: "Hot", cls: "hot" };
    if (sig.days_since_activity != null && sig.days_since_activity <= 7) return { label: "Active", cls: "active-tag" };
    return { label: "Warm", cls: "warm" };
  }
  if (p.board_group === "overdue") return { label: "Hot", cls: "hot" };
  if (p.board_group === "waiting_on_reply") return { label: "Warm", cls: "warm" };
  if (p.board_group === "needs_outreach" && !sig.outreach_count) return { label: "New", cls: "new-tag" };
  if (sig.outreach_count > 0) return { label: "Warm", cls: "warm" };
  return { label: "New", cls: "new-tag" };
}

/* ── Due text ── */
function getDueInfo(p) {
  const sig = p.signals || {};
  if (p.next_action_due) {
    const today = new Date().toISOString().split("T")[0];
    const diff = Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date(today + "T00:00:00")) / 86400000);
    if (diff < 0) return { text: `Due ${Math.abs(diff)}d`, color: "#dc2626", bg: "#fef2f2" };
    if (diff === 0) return { text: "Due today", color: "#d97706", bg: "#fffbeb" };
    if (diff <= 3) return { text: `Due ${diff}d`, color: "#d97706", bg: "#fffbeb" };
  }
  if (sig.days_since_activity != null && sig.days_since_activity > 0) {
    return { text: `${sig.days_since_activity}d ago`, color: "#16a34a", bg: "#f0fdf4" };
  }
  return null;
}

/* ── Next action ── */
function getNextAction(p, matchScore) {
  const ms = matchScore?.match_score;
  const sub = ms ? `${ms}% match` : null;
  const status = p.recruiting_status || "";

  if (p.recruiting_status === "Committed" || p.journey_stage === "committed")
    return { label: "Committed", sub, subColor: "#16a34a", subBg: "#f0fdf4" };
  if (status) return { label: status, sub, subColor: "#0d9488", subBg: "#e6f7f5" };
  if (p.board_group === "needs_outreach") return { label: "New", sub, subColor: "#0d9488", subBg: "#e6f7f5" };
  if (p.board_group === "waiting_on_reply" || p.board_group === "overdue") return { label: "Waiting", sub, subColor: "#d97706", subBg: "#fffbeb" };
  if (p.board_group === "in_conversation") return { label: "In Conversation", sub, subColor: "#2563eb", subBg: "#eff6ff" };
  return { label: "Active", sub, subColor: "#0d9488", subBg: "#e6f7f5" };
}

/* ── CTA config ── */
function getCTA(p) {
  if (p.board_group === "needs_outreach") return { label: "Start Outreach", cls: "primary" };
  if (p.board_group === "waiting_on_reply" || p.board_group === "overdue") return { label: "Follow Up", cls: "warn" };
  return { label: "Journey >", cls: "outline" };
}

/* ── Hero advice ── */
function getHeroAdvice(p) {
  if (!p) return "";
  const g = p.board_group;
  const s = p.signals || {};
  if (g === "overdue") {
    const days = p.next_action_due ? Math.abs(Math.ceil((new Date(p.next_action_due + "T00:00:00") - new Date()) / 86400000)) : "several";
    return `Coach hasn't heard from you in ${days} days. Send a short follow-up mentioning your recent results.`;
  }
  if (g === "needs_outreach") return "This school matches your profile well. Send an introductory email with your highlight reel.";
  if (g === "waiting_on_reply") {
    const d = s.days_since_outreach;
    return d > 5 ? "It's been a while since your outreach. Consider a brief follow-up." : "Give the coach a bit more time, then follow up with a quick check-in.";
  }
  if (g === "in_conversation") return "You've got momentum here — keep the conversation going and ask about a campus visit.";
  return "Review this school's program and plan your next outreach.";
}

/* ══════════════════════════════════════════ */
/* ── Mini Progress Rail (for school cards) ── */
/* ══════════════════════════════════════════ */
function SchoolRail({ journeyStage }) {
  const stages = computeRail(journeyStage || "added");
  return (
    <div data-testid="school-rail">
      <div style={{ display: "flex", alignItems: "center", height: 22 }}>
        {stages.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <div style={{
                flex: 1, height: 3,
                background: s.state === "past" || (stages[i - 1]?.state === "past" && s.state === "active")
                  ? "#0d9488" : "#eee",
              }} />
            )}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: s.state === "active" ? 18 : 12,
                height: s.state === "active" ? 18 : 12,
                borderRadius: "50%",
                background: s.state === "future" ? "var(--t-surface, white)" : s.color,
                border: s.state === "future" ? "2px solid #e5e7eb" : `2px solid ${s.color}`,
                boxShadow: s.state === "active" ? `0 0 10px ${s.color}66` : "none",
              }} />
              {s.state === "active" && (
                <div style={{
                  position: "absolute", inset: -3, borderRadius: "50%",
                  border: `2px solid ${s.color}`,
                  animation: "scPulse 2s ease-out infinite", pointerEvents: "none",
                }} />
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        {stages.map(s => (
          <span key={s.key} style={{
            flex: 1, textAlign: "center", fontSize: 8, fontWeight: s.state === "active" ? 800 : 600,
            color: s.state === "active" ? s.color : "#bbb",
          }}>
            {s.key === "in_conversation" ? "Talking" : s.key === "campus_visit" ? "Visit" : s.key === "committed" ? "Commit" : s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Hero Progress Rail (Journey style) ── */
/* ══════════════════════════════════════════ */
function HeroRail({ journeyStage }) {
  const stages = computeRail(journeyStage || "added");
  return (
    <div data-testid="hero-rail">
      <div style={{ display: "flex", alignItems: "center", height: 28 }}>
        {stages.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <div style={{
                flex: 1, height: 2,
                background: s.state === "past" || (stages[i - 1]?.state === "past" && s.state === "active")
                  ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
              }} />
            )}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: s.state === "active" ? 20 : 14,
                height: s.state === "active" ? 20 : 14,
                borderRadius: "50%",
                background: s.state === "future" ? "#141422" : s.color,
                border: s.state === "future" ? "2px solid rgba(255,255,255,0.1)" : `2px solid ${s.color}`,
                boxShadow: s.state === "active" ? `0 0 14px ${s.color}88` : "none",
              }} />
              {s.state === "active" && (
                <div style={{
                  position: "absolute", inset: -4, borderRadius: "50%",
                  border: `2px solid ${s.color}`,
                  animation: "heroPulse 2s ease-out infinite", pointerEvents: "none",
                }} />
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {stages.map(s => (
          <span key={s.key} style={{
            flex: 1, textAlign: "center", fontSize: 10, fontWeight: s.state === "active" ? 800 : 600,
            color: s.state === "active" ? "#5eead4" : "rgba(255,255,255,0.2)",
          }}>
            {s.key === "in_conversation" ? "Talking" : s.key === "campus_visit" ? "Visit" : s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Hero Card (Journey-style) ── */
/* ══════════════════════════════════════════ */
function PipelineHeroCard({ program: p, matchScore, engagement, navigate }) {
  if (!p) return null;
  const ms = matchScore?.match_score;
  const eng = engagement || {};
  const sig = p.signals || {};
  const riskBadges = matchScore?.risk_badges || [];
  const fundingBadge = riskBadges.find(b => b.key === "funding_dependent");
  const meta = [p.conference, sig.total_interactions ? `${sig.total_interactions} events` : null].filter(Boolean).join(" · ");

  return (
    <div style={{ background: "#141422", borderRadius: 14, overflow: "hidden" }} data-testid="pipeline-hero-card">
      <div style={{ height: 3, background: "linear-gradient(90deg, #0d9488, #14b8a6)" }} />
      <div style={{ padding: "22px 26px 0" }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={matchScore?.logo_url} size={48}
            className="rounded-[14px] border-2 border-white/10" />
          <span style={{ fontSize: 24, fontWeight: 800, color: "white", letterSpacing: -0.3 }}>{p.university_name}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <div style={{ width: 340 }} className="hidden md:block">
              <HeroRail journeyStage={p.journey_stage || (p.board_group === "needs_outreach" ? "added" : "outreach")} />
            </div>
            <button
              onClick={() => navigate(`/journey/${p.program_id}`)}
              style={{
                padding: "10px 22px", borderRadius: 10, border: "none", background: "#0d9488",
                color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex",
                alignItems: "center", gap: 6, fontFamily: "inherit", flexShrink: 0,
              }}
              data-testid="hero-follow-up-btn"
            >
              <Send style={{ width: 14, height: 14 }} />
              {p.board_group === "needs_outreach" ? "Start Outreach" : "Follow Up"}
            </button>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#94a3b8" }} />
            {sig.has_coach_reply ? "Interested" : "Neutral"}
          </span>
          {p.division && (
            <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(13,148,136,0.2)", color: "#5eead4" }}>{p.division}</span>
          )}
          {ms != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
              {ms}% Match
            </span>
          )}
          {meta && <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>{meta}</span>}
          {/* Social icons */}
          {p.social_links && (
            <div style={{ display: "flex", gap: 8, marginLeft: 4 }}>
              {p.social_links.twitter && <a href={p.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.3)" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>}
              {p.social_links.instagram && <a href={p.social_links.instagram} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.3)" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a>}
              {p.social_links.facebook && <a href={p.social_links.facebook} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.3)" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>}
            </div>
          )}
        </div>

        {/* Funding tag */}
        {fundingBadge && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 14px", borderRadius: 8, background: "rgba(22,163,74,0.15)", color: "#4ade80", fontSize: 12, fontWeight: 700, marginBottom: 18, border: "1px solid rgba(22,163,74,0.2)" }}>
            $ {fundingBadge.label}
          </div>
        )}

        {/* What to do next */}
        {(() => {
          const advice = getHeroAdvice(p);
          return advice ? (
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(13,148,136,0.2)",
              borderLeft: "3px solid #0d9488", borderRadius: 10, padding: "14px 18px",
              marginBottom: 18, display: "flex", gap: 12, alignItems: "flex-start",
            }} data-testid="hero-advice-card">
              <Lightbulb style={{ width: 16, height: 16, color: "#5eead4", flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.45)", marginBottom: 4, letterSpacing: 0.3 }}>What to do next</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{advice}</div>
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── School Card (compact row) ── */
/* ══════════════════════════════════════════ */
function PipelineSchoolCard({ program: p, matchScore, engagement, navigate }) {
  const temp = getTemperature(p);
  const due = getDueInfo(p);
  const next = getNextAction(p, matchScore);
  const cta = getCTA(p);
  const eng = engagement || {};
  const meta = [p.conference, p.state].filter(Boolean).join(" · ");

  const tempStyles = {
    hot: { background: "#fef2f2", color: "#dc2626" },
    warm: { background: "#fffbeb", color: "#d97706" },
    "new-tag": { background: "#e6f7f5", color: "#0d9488" },
    "active-tag": { background: "#eff6ff", color: "#2563eb" },
  };
  const ctaStyles = {
    primary: { background: "#0d9488", color: "white", border: "none" },
    warn: { background: "#d97706", color: "white", border: "none" },
    outline: { background: "var(--t-surface, white)", color: "var(--t-text-muted, #555)", border: "1px solid var(--t-border, #e5e7eb)" },
  };

  return (
    <div
      onClick={() => navigate(`/journey/${p.program_id}`)}
      style={{
        background: "var(--t-surface, white)", border: "1px solid var(--t-border, #e5e7eb)", borderRadius: 12,
        padding: "14px 16px", marginBottom: 8, display: "flex", alignItems: "center",
        gap: 12, cursor: "pointer", transition: "all 0.15s",
      }}
      className="hover:shadow-sm"
      data-testid={`pipeline-card-${p.program_id}`}
    >
      {/* Col 1: School identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginRight: "auto" }}>
        <UniversityLogo domain={p.domain} name={p.university_name} logoUrl={matchScore?.logo_url} size={38} className="rounded-[10px]" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: "var(--t-text, #1a1a1a)" }}>{p.university_name}</div>
          <div style={{ fontSize: 10, color: "var(--t-text-muted, #999)", marginTop: 2, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {p.division && <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: "var(--t-surface-alt, #f0f0f0)", color: "var(--t-text-muted, #555)" }}>{p.division}</span>}
            <span>{meta}</span>
            {due && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: due.bg, color: due.color }}>{due.text}</span>}
          </div>
        </div>
      </div>

      {/* Col 2: Progress rail */}
      <div style={{ width: 220, flexShrink: 0 }} className="hidden md:block">
        <SchoolRail journeyStage={p.journey_stage || (p.board_group === "needs_outreach" ? "added" : "outreach")} />
      </div>

      {/* Col 3: Temp tag */}
      <div style={{ width: 50, flexShrink: 0, textAlign: "center" }} className="hidden sm:block">
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "3px 0", borderRadius: 6,
          display: "inline-block", width: "100%", textAlign: "center",
          ...(tempStyles[temp.cls] || tempStyles["new-tag"]),
        }}>{temp.label}</span>
      </div>

      {/* Col 4: Engagement metrics */}
      <div style={{ width: 100, flexShrink: 0, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }} className="hidden lg:flex">
        <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: "var(--t-text-muted, #555)" }}>
          <Eye style={{ width: 13, height: 13, color: "var(--t-text-faint, #999)" }} />{eng.email_opens || 0}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: "var(--t-text-muted, #555)" }}>
          <Link2 style={{ width: 13, height: 13, color: "var(--t-text-faint, #999)" }} />{eng.link_clicks || 0}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: "var(--t-text-muted, #555)" }}>
          <Users style={{ width: 13, height: 13, color: "var(--t-text-faint, #999)" }} />{p.signals?.total_interactions || 0}
        </span>
      </div>

      {/* Col 5: Next action */}
      <div style={{ width: 120, flexShrink: 0, textAlign: "right" }} className="hidden sm:block">
        <div style={{ fontSize: 10, color: "var(--t-text-faint, #999)" }}>
          <strong style={{ color: "var(--t-text, #1a1a1a)", fontWeight: 700 }}>Status:</strong> {next.label}
        </div>
        {next.sub && (
          <span style={{
            display: "inline-block", marginTop: 2, fontSize: 9, fontWeight: 700,
            padding: "2px 7px", borderRadius: 4,
            background: next.subBg || "#f0fdf4", color: next.subColor || "#16a34a",
          }}>{next.sub}</span>
        )}
      </div>

      {/* Col 6: CTA */}
      <div style={{ width: 120, flexShrink: 0 }} className="hidden sm:block">
        <button
          onClick={e => { e.stopPropagation(); navigate(`/journey/${p.program_id}`); }}
          style={{
            padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", width: "100%", textAlign: "center",
            ...(ctaStyles[cta.cls] || ctaStyles.outline),
          }}
          data-testid={`card-cta-${p.program_id}`}
        >{cta.label}</button>
      </div>

      {/* Col 7: Arrow */}
      <div style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t-text-faint, #ccc)" }}>
        <ChevronRight style={{ width: 16, height: 16 }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Committed Card ── */
/* ══════════════════════════════════════════ */
function CommittedSchoolCard({ program: p, matchScore, navigate }) {
  const ms = matchScore?.match_score;
  const meta = [p.division, p.conference, p.state, ms ? `${ms}% match` : null].filter(Boolean).join(" · ");
  return (
    <div
      onClick={() => navigate(`/journey/${p.program_id}`)}
      style={{
        background: "#f0fdf4", border: "1px solid rgba(22,163,74,0.12)", borderRadius: 12,
        padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 8, cursor: "pointer",
      }}
      data-testid={`committed-card-${p.program_id}`}
    >
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <CheckCircle2 style={{ width: 18, height: 18, color: "white" }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--t-text, #1a1a1a)" }}>{p.university_name}</div>
        <div style={{ fontSize: 11, color: "var(--t-text-muted, #555)", marginTop: 2 }}>{meta}</div>
      </div>
      <span style={{ padding: "5px 14px", borderRadius: 8, background: "white", color: "#16a34a", fontSize: 11, fontWeight: 700, border: "1px solid rgba(22,163,74,0.12)" }}>Verbal Commit</span>
      <div style={{ width: 20, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t-text-faint, #ccc)" }}>
        <ChevronRight style={{ width: 16, height: 16 }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Section Header ── */
/* ══════════════════════════════════════════ */
function SectionHeader({ section, count, collapsed, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 0 10px", cursor: "pointer" }}
      data-testid={`section-header-${section.key}`}
    >
      <ChevronDown
        style={{ width: 14, height: 14, color: "var(--t-text-faint, #999)", transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "none" }}
      />
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: section.color }}>{section.label}</span>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6, background: section.bg, color: section.color }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: "var(--t-border, #f0f0f0)", marginLeft: 6 }} />
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── Filter Chips ── */
/* ══════════════════════════════════════════ */
function FilterChips({ sectionCounts, total, active, onFilter }) {
  const chips = [
    { key: null, label: `All ${total}` },
    ...SECTIONS.filter(s => (sectionCounts[s.key] || 0) > 0).map(s => ({
      key: s.key,
      label: `${s.key === "outreach" ? "Outreach" : s.key === "waiting" ? "Upcoming" : s.key === "convo" ? "In Convo" : "Committed"} ${sectionCounts[s.key]}`,
    })),
  ];
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }} data-testid="pipeline-filters">
      {chips.map(c => (
        <button
          key={c.key || "all"}
          onClick={() => onFilter(active === c.key && c.key !== null ? null : c.key)}
          style={{
            padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            fontFamily: "inherit", cursor: "pointer",
            background: active === c.key ? "var(--t-text, #1a1a1a)" : "var(--t-surface, white)",
            color: active === c.key ? "var(--t-bg, white)" : "var(--t-text-muted, #555)",
            border: active === c.key ? "1px solid var(--t-text, #1a1a1a)" : "1px solid var(--t-border, #e5e7eb)",
          }}
          data-testid={`filter-${c.key || "all"}`}
        >{c.label}</button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── View Toggle ── */
/* ══════════════════════════════════════════ */
function ViewToggle({ mode, onChange }) {
  return (
    <div style={{ display: "flex", border: "1px solid var(--t-border, #e5e7eb)", borderRadius: 8, overflow: "hidden" }} data-testid="view-toggle">
      {["compact", "expanded"].map(m => (
        <button key={m}
          onClick={() => onChange(m)}
          style={{
            padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none",
            fontFamily: "inherit", cursor: "pointer", textTransform: "capitalize",
            background: mode === m ? "var(--t-text, #1a1a1a)" : "var(--t-surface, white)",
            color: mode === m ? "var(--t-bg, white)" : "var(--t-text-muted, #555)",
          }}
          data-testid={`view-${m}`}
        >{m === "compact" ? "Compact" : "Expanded"}</button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════ */
/* ── CSS Keyframes ── */
/* ══════════════════════════════════════════ */
function PipelineStyles() {
  return (
    <style>{`
      @keyframes heroPulse { 0%{box-shadow:0 0 0 0 currentColor;} 100%{box-shadow:0 0 0 8px transparent;} }
      @keyframes scPulse { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.8);opacity:0} }
    `}</style>
  );
}

/* ══════════════════════════════════════════ */
/* ── Main Board ── */
/* ══════════════════════════════════════════ */
export default function RecruitingBoard() {
  const [allPrograms, setAllPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [viewMode, setViewMode] = useState("compact");
  const [matchScores, setMatchScores] = useState({});
  const [engagementBySchool, setEngagementBySchool] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({});
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    if (searchParams.get("congrats") === "true") {
      setShowCongrats(true);
      searchParams.delete("congrats");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    api.get("/match-scores").then(res => {
      if (res.data?.scores) {
        const map = {};
        res.data.scores.forEach(s => { map[s.program_id] = s; });
        setMatchScores(map);
      }
    }).catch(() => {});
    api.get("/engagement/summary").then(res => {
      setEngagementBySchool(res.data?.by_school || {});
    }).catch(() => {});
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await api.get("/programs");
      setAllPrograms(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="board-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--t-text-muted)" }} />
          <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>Loading your board...</span>
        </div>
      </div>
    );
  }

  const activePrograms = allPrograms.filter(p => p.board_group !== "archived");
  const total = activePrograms.length;
  const sectionGroups = groupIntoSections(activePrograms);
  const sectionCounts = {};
  SECTIONS.forEach(s => { sectionCounts[s.key] = sectionGroups[s.key].length; });

  // Congrats screen
  if (showCongrats && total > 0) {
    const first = activePrograms[0];
    return (
      <div className="flex items-center justify-center min-h-[70vh]" data-testid="congrats-screen">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(26,138,128,0.1)" }}>
              <PartyPopper className="w-10 h-10" style={{ color: "#1a8a80" }} />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#16a34a" }}>
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mb-3" style={{ color: "var(--t-text)", letterSpacing: "-0.5px" }}>Congratulations!</h1>
          <p className="text-base mb-2" style={{ color: "var(--t-text-secondary)" }}>
            You added <strong style={{ color: "var(--t-text)" }}>{first?.university_name || "your first school"}</strong> to your board.
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--t-text-muted)" }}>Your recruiting journey starts now.</p>
          <button
            className="inline-flex items-center gap-2 text-base font-bold px-8 py-3.5 rounded-xl transition-all hover:opacity-90"
            style={{ backgroundColor: "#1a8a80", color: "white", boxShadow: "0 4px 14px rgba(26,138,128,0.3)" }}
            onClick={() => first?.program_id ? navigate(`/journey/${first.program_id}`) : setShowCongrats(false)}
            data-testid="start-journey-btn"
          >
            <Rocket className="w-5 h-5" />Start Your Journey<ChevronRight className="w-5 h-5" />
          </button>
          <button className="block mx-auto mt-4 text-sm font-medium" style={{ color: "var(--t-text-muted)" }} onClick={() => setShowCongrats(false)} data-testid="skip-congrats-btn">
            or continue to My Schools
          </button>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return <EmptyBoardState onSchoolAdded={fetchPrograms} />;
  }

  // Focus program for hero card (most urgent)
  const focusPriority = ["overdue", "waiting_on_reply", "needs_outreach", "in_conversation"];
  const focusProgram = focusPriority.reduce((found, stage) => {
    if (found) return found;
    const candidates = activePrograms.filter(p => p.board_group === stage && p.recruiting_status !== "Committed" && p.journey_stage !== "committed");
    if (candidates.length === 0) return null;
    if (stage === "needs_outreach") {
      candidates.sort((a, b) => (matchScores[b.program_id]?.match_score ?? 0) - (matchScores[a.program_id]?.match_score ?? 0));
    } else {
      candidates.sort((a, b) => (a.next_action_due || "9999").localeCompare(b.next_action_due || "9999"));
    }
    return candidates[0];
  }, null);

  const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const getEngagement = (p) => engagementBySchool[p.program_id] || engagementBySchool[p.university_name] || null;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }} data-testid="recruiting-board">
      <PipelineStyles />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: "var(--t-text, #1a1a1a)" }} data-testid="pipeline-title">My Schools</h1>
        <span style={{ flex: 1 }} />
        <Button
          onClick={() => navigate("/knowledge-base")}
          style={{ background: "var(--t-text, #1a1a1a)", color: "var(--t-bg, white)", padding: "9px 18px", height: "auto", borderRadius: 8, fontSize: 13, fontWeight: 700 }}
          data-testid="add-school-btn"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add School
        </Button>
      </div>

      {/* Hero Card */}
      {focusProgram && (
        <div style={{ marginBottom: 18 }}>
          <PipelineHeroCard
            program={focusProgram}
            matchScore={matchScores[focusProgram.program_id]}
            engagement={getEngagement(focusProgram)}
            navigate={navigate}
          />
        </div>
      )}

      {/* Filter Chips */}
      <FilterChips sectionCounts={sectionCounts} total={total} active={activeSection} onFilter={setActiveSection} />

      {/* Sections */}
      {SECTIONS.filter(s => activeSection === null || activeSection === s.key).map(s => {
        const programs = sectionGroups[s.key];
        if (programs.length === 0) return null;
        const isCollapsed = collapsedSections[s.key];
        const isCommittedSection = s.key === "committed";

        return (
          <div key={s.key} data-testid={`section-${s.key}`}>
            <SectionHeader section={s} count={programs.length} collapsed={isCollapsed} onToggle={() => toggleSection(s.key)} />
            {!isCollapsed && (
              <>
                {programs.map(p =>
                  isCommittedSection ? (
                    <CommittedSchoolCard key={p.program_id} program={p} matchScore={matchScores[p.program_id]} navigate={navigate} />
                  ) : (
                    <PipelineSchoolCard key={p.program_id} program={p} matchScore={matchScores[p.program_id]} engagement={getEngagement(p)} navigate={navigate} />
                  )
                )}
              </>
            )}
          </div>
        );
      })}

      {activeSection && (sectionGroups[activeSection]?.length || 0) === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: "var(--t-text-muted)" }} data-testid="filtered-empty">
          No schools in {SECTIONS.find(s => s.key === activeSection)?.label || activeSection}
        </div>
      )}
    </div>
  );
}
