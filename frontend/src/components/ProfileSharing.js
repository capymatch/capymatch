import { useState, useEffect, useCallback } from "react";
import { Share2, Copy, Check, Eye, Download, Link, BarChart3, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

const APP_URL = window.location.origin;
const API = process.env.REACT_APP_BACKEND_URL;

export default function ProfileSharing() {
  const [settings, setSettings] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([
      api.get("/athlete-profile/sharing"),
      api.get("/athlete-profile/analytics"),
    ])
      .then(([sRes, aRes]) => {
        setSettings(sRes.data);
        setAnalytics(aRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateToggle = async (field, value) => {
    try {
      const res = await api.put("/athlete-profile/sharing", { [field]: value });
      setSettings(res.data);
    } catch { toast.error("Failed to update"); }
  };

  const generateLink = async () => {
    try {
      const res = await api.put("/athlete-profile/sharing", {});
      setSettings(res.data);
      toast.success("Public profile link created!");
    } catch { toast.error("Failed to generate link"); }
  };

  const slug = settings?.public_slug;
  const profileUrl = slug ? `${APP_URL}/p/${slug}` : null;

  const copyLink = () => {
    if (!profileUrl) return;
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!slug) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API}/api/p/${slug}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Profile.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch { toast.error("Failed to download PDF"); }
    setDownloading(false);
  };

  if (loading) return null;

  const Toggle = ({ label, field }) => (
    <label className="flex items-center justify-between py-1.5 cursor-pointer">
      <span className="text-xs" style={{ color: "var(--t-text)" }}>{label}</span>
      <button
        onClick={() => updateToggle(field, !settings?.[field])}
        className="relative w-9 h-5 rounded-full transition-colors"
        style={{ backgroundColor: settings?.[field] !== false ? "#1a8a80" : "var(--t-border)" }}
        data-testid={`toggle-${field}`}
      >
        <span
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm"
          style={{ left: settings?.[field] !== false ? 18 : 2 }}
        />
      </button>
    </label>
  );

  return (
    <div className="space-y-3" data-testid="profile-sharing">
      {/* Visibility Toggles */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--t-text-muted)" }}>
          What coaches can see
        </p>
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface)" }}>
          <Toggle label="Measurables" field="show_measurables" />
          <Toggle label="Academics" field="show_academics" />
          <Toggle label="Tournament Schedule" field="show_schedule" />
          <Toggle label="Videos" field="show_videos" />
          <Toggle label="Contact Info" field="show_contact" />
        </div>
      </div>

      {/* Share Actions */}
      <div className="flex flex-wrap gap-2">
        {!slug ? (
          <button
            onClick={generateLink}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
            style={{ backgroundColor: "#1a8a80", color: "white" }}
            data-testid="generate-profile-link-btn"
          >
            <Link className="w-3.5 h-3.5" />Create public link
          </button>
        ) : (
          <>
            <button onClick={copyLink}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all"
              style={{ backgroundColor: "#1a8a80", color: "white" }}
              data-testid="copy-profile-link-btn"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all hover:bg-white/5"
              style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
              data-testid="preview-profile-btn"
            >
              <Eye className="w-3.5 h-3.5" />Preview
            </a>
            <button onClick={handleDownloadPdf} disabled={downloading}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all hover:bg-white/5"
              style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}
              data-testid="download-profile-pdf-btn"
            >
              <Download className="w-3.5 h-3.5" />{downloading ? "Generating..." : "PDF"}
            </button>
          </>
        )}
      </div>

      {/* Link display */}
      {profileUrl && (
        <div className="text-[11px] px-2.5 py-1.5 rounded-lg truncate" style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-muted)" }}>
          {profileUrl}
        </div>
      )}

      {/* Analytics */}
      {analytics && analytics.total_views > 0 && (
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface-alt)" }} data-testid="profile-analytics">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="w-3.5 h-3.5" style={{ color: "#1a8a80" }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--t-text-muted)" }}>Profile Views</span>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" style={{ color: "#1a8a80" }} />
              <span className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{analytics.total_views}</span>
              <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3" style={{ color: "#1a8a80" }} />
              <span className="text-lg font-bold" style={{ color: "var(--t-text)" }}>{analytics.unique_visitors}</span>
              <span className="text-[10px]" style={{ color: "var(--t-text-muted)" }}>unique</span>
            </div>
          </div>
          {analytics.views_by_day && Object.keys(analytics.views_by_day).length > 0 && (
            <div className="mt-2 flex items-end gap-1" style={{ height: 32 }}>
              {(() => {
                const days = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(); d.setDate(d.getDate() - i);
                  const key = d.toISOString().split("T")[0];
                  days.push({ key, count: analytics.views_by_day[key] || 0 });
                }
                const max = Math.max(...days.map(d => d.count), 1);
                return days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-sm transition-all"
                      style={{ height: `${Math.max((d.count / max) * 24, 2)}px`, backgroundColor: d.count > 0 ? "#1a8a80" : "var(--t-border)" }}
                      title={`${d.key}: ${d.count} views`} />
                    <span className="text-[8px]" style={{ color: "var(--t-text-muted)" }}>
                      {new Date(d.key + "T00:00:00").toLocaleDateString("en-US", { weekday: "narrow" })}
                    </span>
                  </div>
                ));
              })()}
            </div>
          )}
          {analytics.recent_views?.length > 0 && (
            <p className="text-[10px] mt-2" style={{ color: "var(--t-text-muted)" }}>
              Last viewed {new Date(analytics.recent_views[0].viewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
