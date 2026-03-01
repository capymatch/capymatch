import { useState, useEffect } from "react";
import { Share2, Copy, Mail, Check, Link, Eye, Download, ChevronDown, Video, BarChart3, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const APP_URL = window.location.origin;
const API = process.env.REACT_APP_BACKEND_URL;

export default function CoachCardConfig({ programId, universityName, api, onEmailCard }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [profileVideos, setProfileVideos] = useState([]);
  const [videoMode, setVideoMode] = useState("profile");
  const [downloading, setDownloading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get(`/coach-card/${programId}`)
      .then(c => {
        setConfig(c);
        setVideoMode(c.featured_video && !["highlight_video","hudl_url","full_game_film_url"].includes(c._video_source) ? "custom" : "profile");
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch athlete profile videos
    api.get("/athlete-profile")
      .then(p => {
        const vids = [];
        if (p.highlight_video) vids.push({ label: "Highlights", url: p.highlight_video });
        if (p.hudl_url) vids.push({ label: "Hudl Profile", url: p.hudl_url });
        if (p.full_game_film_url) vids.push({ label: "Full Game Film", url: p.full_game_film_url });
        setProfileVideos(vids);
      })
      .catch(() => {});

    // Fetch analytics
    api.get(`/coach-card/${programId}/analytics`)
      .then(setAnalytics)
      .catch(() => {});
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
  const pdfUrl = config?.slug ? `${API}/api/card/${config.slug}/pdf` : null;

  const copyLink = () => {
    if (!cardUrl) return;
    navigator.clipboard.writeText(cardUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!pdfUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CoachCard_${universityName?.replace(/\s/g, "_") || "card"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch { toast.error("Failed to download PDF"); }
    setDownloading(false);
  };

  const handleVideoSelect = (url) => {
    setConfig(prev => ({ ...prev, featured_video: url }));
    save({ featured_video: url });
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

      {/* Featured Video Selector */}
      <div className="mb-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--t-text-muted)" }}>
          Featured video for this school
        </label>

        {/* Video source tabs */}
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setVideoMode("profile")}
            className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-all"
            style={{
              backgroundColor: videoMode === "profile" ? "rgba(26,138,128,0.15)" : "transparent",
              color: videoMode === "profile" ? "#1a8a80" : "var(--t-text-muted)",
              border: `1px solid ${videoMode === "profile" ? "rgba(26,138,128,0.3)" : "var(--t-border)"}`,
            }}
            data-testid="video-mode-profile"
          >
            <Video className="w-3 h-3 inline mr-1" />My Videos
          </button>
          <button
            onClick={() => setVideoMode("custom")}
            className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-all"
            style={{
              backgroundColor: videoMode === "custom" ? "rgba(26,138,128,0.15)" : "transparent",
              color: videoMode === "custom" ? "#1a8a80" : "var(--t-text-muted)",
              border: `1px solid ${videoMode === "custom" ? "rgba(26,138,128,0.3)" : "var(--t-border)"}`,
            }}
            data-testid="video-mode-custom"
          >
            Custom URL
          </button>
        </div>

        {videoMode === "profile" ? (
          <div className="space-y-1.5">
            {profileVideos.length > 0 ? profileVideos.map((v, i) => (
              <label key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all hover:bg-white/5"
                style={{
                  borderColor: config?.featured_video === v.url ? "rgba(26,138,128,0.5)" : "var(--t-border)",
                  backgroundColor: config?.featured_video === v.url ? "rgba(26,138,128,0.06)" : "transparent",
                }}
                data-testid={`video-option-${i}`}
              >
                <input
                  type="radio"
                  name="featured_video"
                  checked={config?.featured_video === v.url}
                  onChange={() => handleVideoSelect(v.url)}
                  className="accent-teal-600"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium block" style={{ color: "var(--t-text)" }}>{v.label}</span>
                  <span className="text-[10px] truncate block" style={{ color: "var(--t-text-muted)" }}>{v.url}</span>
                </div>
              </label>
            )) : (
              <p className="text-[11px] py-2 px-3 rounded-lg" style={{ color: "var(--t-text-muted)", backgroundColor: "var(--t-surface-alt)" }}>
                No videos on your profile yet. Add them in your <a href="/profile" className="underline" style={{ color: "#1a8a80" }}>athlete profile</a>.
              </p>
            )}
            {profileVideos.length > 0 && (
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all hover:bg-white/5"
                style={{
                  borderColor: !config?.featured_video ? "rgba(26,138,128,0.5)" : "var(--t-border)",
                  backgroundColor: !config?.featured_video ? "rgba(26,138,128,0.06)" : "transparent",
                }}
                data-testid="video-option-none"
              >
                <input type="radio" name="featured_video" checked={!config?.featured_video} onChange={() => handleVideoSelect("")} className="accent-teal-600" />
                <span className="text-xs font-medium" style={{ color: "var(--t-text)" }}>No featured video</span>
              </label>
            )}
          </div>
        ) : (
          <input
            value={config?.featured_video || ""}
            onChange={e => setConfig(prev => ({ ...prev, featured_video: e.target.value }))}
            onBlur={() => save({ featured_video: config?.featured_video || "" })}
            placeholder="Paste a specific video URL for this school..."
            className="w-full text-sm px-3 py-2 rounded-lg border bg-transparent"
            style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
            data-testid="featured-video-input"
          />
        )}
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
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all hover:bg-white/5"
              style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
              data-testid="download-pdf-btn"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? "Generating..." : "PDF"}
            </button>
            {onEmailCard && (
              <button
                onClick={() => onEmailCard(cardUrl)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all hover:bg-white/5"
                style={{ borderColor: "rgba(26,138,128,0.3)", color: "#1a8a80" }}
                data-testid="email-card-btn"
              >
                <Mail className="w-3.5 h-3.5" />
                Send to Coach
              </button>
            )}
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
