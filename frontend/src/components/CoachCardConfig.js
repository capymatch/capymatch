import { useState, useEffect } from "react";
import { Share2, Copy, Mail, Check, Link, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";

const APP_URL = window.location.origin;

export default function CoachCardConfig({ programId, universityName, api }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get(`/coach-card/${programId}`)
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [programId, api]);

  const save = async (updates) => {
    setSaving(true);
    try {
      const res = await api.put(`/coach-card/${programId}`, updates);
      setConfig(res);
      toast.success("Coach Card updated");
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  const cardUrl = config?.slug ? `${APP_URL}/card/${config.slug}` : null;

  const copyLink = () => {
    if (!cardUrl) return;
    navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;

  const hasSlug = !!config?.slug;

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }} data-testid="coach-card-config">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(26,138,128,0.15)" }}>
          <Share2 className="w-3.5 h-3.5" style={{ color: "#1a8a80" }} />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--t-text)" }}>Coach Card</h3>
          <p className="text-[11px]" style={{ color: "var(--t-text-muted)" }}>Shareable profile for {universityName}</p>
        </div>
      </div>

      {/* Coach Note */}
      <div className="mb-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--t-text-muted)" }}>
          Personal note for this coach
        </label>
        <textarea
          value={config?.coach_note || ""}
          onChange={e => setConfig(prev => ({ ...prev, coach_note: e.target.value }))}
          onBlur={() => save({ coach_note: config?.coach_note || "" })}
          placeholder="e.g. I attended your camp last summer and loved the program..."
          rows={2}
          maxLength={300}
          className="w-full text-sm px-3 py-2 rounded-lg border bg-transparent resize-none"
          style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
          data-testid="coach-note-input"
        />
        <span className="text-[10px] block text-right" style={{ color: "var(--t-text-muted)" }}>
          {(config?.coach_note || "").length}/300
        </span>
      </div>

      {/* Featured Video */}
      <div className="mb-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--t-text-muted)" }}>
          Featured video link (optional override)
        </label>
        <input
          value={config?.featured_video || ""}
          onChange={e => setConfig(prev => ({ ...prev, featured_video: e.target.value }))}
          onBlur={() => save({ featured_video: config?.featured_video || "" })}
          placeholder="Paste a specific video URL for this school..."
          className="w-full text-sm px-3 py-2 rounded-lg border bg-transparent"
          style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
          data-testid="featured-video-input"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-3">
        {!hasSlug ? (
          <button
            onClick={() => save({ coach_note: config?.coach_note || "" })}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
            style={{ backgroundColor: "#1a8a80", color: "white" }}
            data-testid="generate-card-btn"
          >
            <Link className="w-3.5 h-3.5" />
            {saving ? "Generating..." : "Generate Coach Card"}
          </button>
        ) : (
          <>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
              style={{ backgroundColor: "#1a8a80", color: "white" }}
              data-testid="copy-card-link-btn"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a
              href={cardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all hover:bg-white/5"
              style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
              data-testid="preview-card-btn"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </a>
          </>
        )}
      </div>

      {/* Card URL display */}
      {cardUrl && (
        <div className="mt-2 text-[11px] px-2.5 py-1.5 rounded-lg truncate" style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-muted)" }}>
          {cardUrl}
        </div>
      )}
    </div>
  );
}
