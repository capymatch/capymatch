import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Mail, Shield, Search, Check, Loader2, AlertCircle, ChevronDown,
  ChevronRight, ArrowUpCircle, Clock, MessageSquare, RefreshCw,
  BadgeCheck, UserSearch, ExternalLink, Copy
} from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const STAGE_LABELS = {
  added: { label: "Added", color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  outreach: { label: "Outreach", color: "#1a8a80", bg: "rgba(26,138,128,0.12)" },
  in_conversation: { label: "Talking", color: "#16a34a", bg: "rgba(22,163,74,0.12)" },
};

function SuggestionRow({ s, checked, onToggle, onMapSchool, disabled }) {
  const stage = STAGE_LABELS[s.proposed_stage] || STAGE_LABELS.added;
  const name = s.school_id || s.normalized_domain;

  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
        checked ? "border-teal-600/30" : "hover:border-white/15"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      style={{
        background: checked ? "rgba(26,138,128,0.04)" : "rgba(255,255,255,0.02)",
        borderColor: checked ? "rgba(26,138,128,0.25)" : "rgba(255,255,255,0.08)",
      }}
      data-testid={`suggestion-row-${s.normalized_domain}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(s)}
        disabled={disabled}
        className="mt-1 accent-teal-600 w-4 h-4 rounded flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
            {name}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: stage.bg, color: stage.color }}
          >
            {stage.label}
          </span>
          {s.attention_required && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              Reply due
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs mb-1 flex-wrap" style={{ color: "var(--t-text-muted)" }}>
          <span>{s.outbound_count} sent</span>
          <span>&middot;</span>
          <span>{s.inbound_count} received</span>
          <span>&middot;</span>
          <span>{s.thread_count} thread{s.thread_count !== 1 ? "s" : ""}</span>
          {s.discovered_emails?.length > 0 && (
            <>
              <span>&middot;</span>
              <span>{s.discovered_emails.length} contact{s.discovered_emails.length !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
        {s.last_message_at && (
          <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Last activity: {new Date(s.last_message_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
        )}
        <p className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.25)" }}>
          {s.match_reason}
        </p>
      </div>
    </label>
  );
}

export default function GmailImportModal({ onClose, onComplete }) {
  const [state, setState] = useState("consent"); // consent | scanning | preview | done
  const [consent, setConsent] = useState(true);
  const [runId, setRunId] = useState(null);
  const [progress, setProgress] = useState({ messages_scanned: 0, schools_found: 0, phase: "" });
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [showIgnored, setShowIgnored] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startImport = async () => {
    if (!consent) return;
    setState("scanning");
    setError(null);
    try {
      const res = await api.post("/gmail/import-history");
      const rid = res.data.run_id;
      setRunId(rid);
      startPolling(rid);
    } catch (err) {
      if (err.response?.status === 409) {
        // Already in progress — try to poll existing run
        const existingRunId = err.response?.headers?.["x-run-id"];
        if (existingRunId) {
          setRunId(existingRunId);
          startPolling(existingRunId);
          return;
        }
      }
      setError(err.response?.data?.detail || "Failed to start import");
      setState("consent");
    }
  };

  const startPolling = useCallback((rid) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/gmail/import-history/${rid}/status`);
        const d = res.data;
        setProgress({ messages_scanned: d.messages_scanned, schools_found: d.schools_found, phase: d.phase });

        if (d.phase === "ready") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          const suggs = d.suggestions || [];
          setSuggestions(suggs);
          // Auto-select verified matches
          const autoSelect = new Set();
          suggs.forEach(s => {
            if (s.school_id && (s.confidence || 0) >= 80 && !s.ignored) {
              autoSelect.add(s.school_id || s.normalized_domain);
            }
          });
          setSelected(autoSelect);
          setState("preview");
        } else if (d.phase === "failed") {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setError(d.error?.message || "Import failed");
          setState("consent");
        }
      } catch {
        // Polling error — keep trying
      }
    }, 2000);
  }, []);

  const toggleSuggestion = (s) => {
    const key = s.school_id || s.normalized_domain;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const confirmImport = async () => {
    if (selected.size === 0) return;
    setConfirming(true);
    try {
      const payload = Array.from(selected).map(id => {
        const s = suggestions.find(sg => (sg.school_id || sg.normalized_domain) === id);
        return { school_id: s?.school_id || id };
      }).filter(x => x.school_id);

      const res = await api.post(`/gmail/import-history/${runId}/confirm`, { selected: payload });
      const { created_count, skipped_count } = res.data;

      let msg = `${created_count} school${created_count !== 1 ? "s" : ""} added to your board`;
      if (skipped_count > 0) msg += ` (${skipped_count} already existed)`;
      toast.success(msg);
      setState("done");
      if (onComplete) onComplete(created_count);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setConfirming(false);
    }
  };

  // Categorize suggestions
  const verified = suggestions.filter(s => s.school_id && (s.confidence || 0) >= 80 && !s.ignored);
  const needsReview = suggestions.filter(s => (!s.school_id || (s.confidence || 0) < 80) && !s.ignored);
  const ignored = suggestions.filter(s => s.ignored);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: "rgba(10,10,20,0.85)", backdropFilter: "blur(8px)" }}
      data-testid="gmail-import-modal"
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ backgroundColor: "var(--t-surface)", border: "1px solid var(--t-border)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,138,128,0.15)" }}>
              <Mail className="w-5 h-5" style={{ color: "#1a8a80" }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>
                {state === "consent" && "Import from Gmail"}
                {state === "scanning" && "Scanning your inbox..."}
                {state === "preview" && "Review & Import"}
                {state === "done" && "Import Complete"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                {state === "consent" && "Build your recruiting board from your email history"}
                {state === "scanning" && `${progress.phase === "scanning" ? "Scanning" : progress.phase === "aggregating" ? "Aggregating" : "Processing"}...`}
                {state === "preview" && `${suggestions.length} schools found in your email`}
                {state === "done" && "Your board has been updated"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--t-text-faint)" }} data-testid="import-close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">

          {/* STATE 1: CONSENT */}
          {state === "consent" && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(26,138,128,0.06)", border: "1px solid rgba(26,138,128,0.15)" }}>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#1a8a80" }} />
                  <div>
                    <p className="text-sm font-medium mb-1" style={{ color: "var(--t-text)" }}>Privacy-first scanning</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
                      We scan email headers (From, To, Subject, Date) to find schools you've contacted.
                      We <strong style={{ color: "var(--t-text)" }}>never read message bodies</strong> during import.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                  <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Scans the last 6 months of email headers</p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                  <ArrowUpCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Automatically matches schools and sets recruiting stages</p>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--t-surface-alt)" }}>
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: "var(--t-text-muted)" }} />
                  <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>You review and confirm before anything is added</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.08)" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="accent-teal-600 w-4 h-4 rounded"
                  data-testid="import-consent-toggle"
                />
                <span className="text-xs" style={{ color: "var(--t-text-secondary)" }}>
                  I allow CapyMatch to scan my email headers for this import
                </span>
              </label>

              <button
                onClick={startImport}
                disabled={!consent}
                className="w-full h-10 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: "#1a8a80" }}
                data-testid="start-import-btn"
              >
                Start Import
              </button>
            </div>
          )}

          {/* STATE 2: SCANNING */}
          {state === "scanning" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(26,138,128,0.1)" }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1a8a80" }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium mb-1" style={{ color: "var(--t-text)" }}>
                  {progress.messages_scanned > 0
                    ? `${progress.messages_scanned} messages processed`
                    : "Starting scan..."}
                </p>
                <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                  {progress.schools_found > 0
                    ? `${progress.schools_found} schools found so far`
                    : "Looking for school-related emails..."}
                </p>
              </div>
            </div>
          )}

          {/* STATE 3: PREVIEW */}
          {state === "preview" && (
            <div className="space-y-4 pt-2">
              {/* Verified Matches */}
              {verified.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4" style={{ color: "#16a34a" }} />
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#16a34a" }}>
                      Verified Matches ({verified.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {verified.map(s => (
                      <SuggestionRow
                        key={s.school_id || s.normalized_domain}
                        s={s}
                        checked={selected.has(s.school_id || s.normalized_domain)}
                        onToggle={toggleSuggestion}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Needs Review */}
              {needsReview.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" style={{ color: "#d97706" }} />
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#d97706" }}>
                      Needs Review ({needsReview.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {needsReview.map(s => (
                      <SuggestionRow
                        key={s.normalized_domain}
                        s={s}
                        checked={selected.has(s.school_id || s.normalized_domain)}
                        onToggle={toggleSuggestion}
                        disabled={!s.school_id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Ignored */}
              {ignored.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowIgnored(!showIgnored)}
                    className="flex items-center gap-2 text-xs font-medium py-1"
                    style={{ color: "var(--t-text-faint)" }}
                    data-testid="toggle-ignored"
                  >
                    {showIgnored ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Ignored ({ignored.length})
                  </button>
                  {showIgnored && (
                    <div className="space-y-2 mt-2">
                      {ignored.map(s => (
                        <SuggestionRow
                          key={s.normalized_domain}
                          s={s}
                          checked={selected.has(s.school_id || s.normalized_domain)}
                          onToggle={toggleSuggestion}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {suggestions.length === 0 && (
                <div className="text-center py-10">
                  <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--t-text)" }}>No schools found</p>
                  <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                    We didn't find any school-related emails in the last 6 months.
                  </p>
                </div>
              )}

              {/* Footer */}
              {suggestions.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <button onClick={onClose} className="px-4 h-9 rounded-xl text-xs font-medium" style={{ color: "var(--t-text-muted)" }}>
                    Cancel
                  </button>
                  <button
                    onClick={confirmImport}
                    disabled={selected.size === 0 || confirming}
                    className="flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                    style={{ backgroundColor: "#1a8a80" }}
                    data-testid="confirm-import-btn"
                  >
                    {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirm Import ({selected.size} selected)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STATE 4: DONE */}
          {state === "done" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(22,163,74,0.1)" }}>
                <Check className="w-8 h-8" style={{ color: "#16a34a" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--t-text)" }}>
                Schools added to your board
              </p>
              <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                Check your pipeline to see them
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
