import { useState } from "react";
import { MapPin, Star } from "lucide-react";
import { CONV_CONFIG } from "./constants";

function decodeEntities(text) {
  if (!text) return "";
  const el = document.createElement("textarea");
  el.innerHTML = text;
  return el.value;
}

export function ConversationBubble({ event }) {
  const [expanded, setExpanded] = useState(false);
  const evtType = (event.event_type || event.type || "interaction").toLowerCase().replace(/\s+/g, "_");
  const cfg = CONV_CONFIG[evtType] || CONV_CONFIG.interaction;
  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };
  const content = decodeEntities(event.content || event.notes || "");
  const hasLong = content.length > 150;

  if (cfg.side === "center") {
    return (
      <div className="flex justify-center my-2" data-testid="conv-milestone">
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border" style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)" }}>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${cfg.color}-500/10`}>
            {evtType === "camp" || evtType === "camp_meeting" ? <span className="text-base">&#127947;&#65039;</span>
            : evtType === "visit" || evtType === "campus_visit" ? <MapPin className={`w-3.5 h-3.5 text-${cfg.color}-400`} />
            : <Star className={`w-3.5 h-3.5 text-${cfg.color}-400`} />}
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--t-text)" }}>{event.title || cfg.label}</p>
            <p className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>{formatDate(event.date)}</p>
          </div>
        </div>
      </div>
    );
  }

  const isRight = cfg.side === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"} my-1`} data-testid={`conv-bubble-${isRight ? "right" : "left"}`}>
      <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 border ${
        isRight
          ? "rounded-br-md bg-teal-800/[0.10] border-teal-700/25"
          : "rounded-bl-md bg-teal-700/[0.08] border-slate-500/20"
      }`}>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isRight ? "text-teal-700" : "text-slate-500"}`}>
          {isRight ? "You" : (event.coach_name || "Coach")}
        </p>
        {content && (
          <div className="text-[13px] leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
            {hasLong && !expanded ? (
              <><p className="line-clamp-3">{content}</p><button onClick={() => setExpanded(true)} className="text-teal-700 text-[10px] mt-1 font-medium">Show more</button></>
            ) : hasLong && expanded ? (
              <><p className="whitespace-pre-wrap">{content}</p><button onClick={() => setExpanded(false)} className="text-teal-700 text-[10px] mt-1 font-medium">Show less</button></>
            ) : <p>{content}</p>}
          </div>
        )}
        {!content && <p className="text-xs" style={{ color: "var(--t-text-secondary)" }}>{event.title || cfg.label}</p>}
        <p className="text-[10px] mt-1.5" style={{ color: "var(--t-text-muted)" }}>{formatDate(event.date)} &middot; {cfg.label}</p>
      </div>
    </div>
  );
}
