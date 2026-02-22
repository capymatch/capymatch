import { useState } from "react";
import { Lightbulb, Link2, Upload, Bell, X, Check, Loader2 } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

const CARD_OPTIONS = {
  roster_stability: [
    { type: "link", label: "Add roster link", placeholder: "Paste the athletics roster page URL", icon: Link2 },
    { type: "upload", label: "Upload roster snapshot", accept: ".csv,.png,.jpg,.jpeg,.pdf,.xlsx", icon: Upload },
    { type: "request", label: "Request update", icon: Bell },
  ],
  timeline_intelligence: [
    { type: "link", label: "Add recruiting source", placeholder: "URL with commit timing data", icon: Link2 },
    { type: "request", label: "Request update", icon: Bell },
  ],
  scholarship_structure: [
    { type: "link", label: "Add scholarship info link", placeholder: "Athletics financial aid page URL", icon: Link2 },
    { type: "request", label: "Request update", icon: Bell },
  ],
  nil_readiness: [
    { type: "link", label: "Add NIL info link", placeholder: "NIL collective or program page URL", icon: Link2 },
    { type: "request", label: "Request update", icon: Bell },
  ],
};

export function ImproveCardNudge({ cardType, programId }) {
  const [open, setOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(null);
  const [linkValue, setLinkValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const options = CARD_OPTIONS[cardType] || CARD_OPTIONS.roster_stability;

  const handleSubmitLink = async () => {
    if (!linkValue.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/intelligence/contribute", {
        program_id: programId,
        card_type: cardType,
        contribution_type: "link",
        data: linkValue.trim(),
      });
      setSubmitted(true);
      toast.success("Submitted for review");
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("program_id", programId);
      formData.append("card_type", cardType);
      await api.post("/intelligence/contribute/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitted(true);
      toast.success("File submitted for review");
    } catch {
      toast.error("Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      await api.post("/intelligence/contribute", {
        program_id: programId,
        card_type: cardType,
        contribution_type: "request",
        data: "User requested data update",
      });
      setSubmitted(true);
      toast.success("Update requested");
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 mt-3" data-testid="improve-card-submitted">
        <Check className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
        <span className="text-[12px] font-medium" style={{ color: "#10b981" }}>
          Submitted for review — thank you!
        </span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-medium transition-opacity hover:opacity-70"
        style={{ color: "#6366f1" }}
        data-testid="improve-card-btn"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        Improve this card
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg p-3 space-y-2.5" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
      data-testid="improve-card-panel">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold" style={{ color: "#334155" }}>Help improve this insight</span>
        <button onClick={() => { setOpen(false); setActiveOption(null); }} className="p-0.5" data-testid="improve-card-close">
          <X className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
        </button>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: "#64748b" }}>
        Your contribution will be reviewed before it affects any insights.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = activeOption === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => {
                if (opt.type === "request") {
                  handleRequest();
                } else if (opt.type === "upload") {
                  setActiveOption("upload");
                } else {
                  setActiveOption(isActive ? null : opt.type);
                }
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
              style={{
                background: isActive ? "rgba(99,102,241,0.08)" : "#fff",
                color: isActive ? "#4f46e5" : "#475569",
                border: `1px solid ${isActive ? "rgba(99,102,241,0.25)" : "#e2e8f0"}`,
              }}
              disabled={submitting}
              data-testid={`improve-option-${opt.type}`}
            >
              {submitting && opt.type === "request" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>

      {activeOption === "link" && (
        <div className="flex gap-2">
          <input
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder={options.find(o => o.type === "link")?.placeholder || "Paste URL"}
            className="flex-1 px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#1e293b", outline: "none" }}
            data-testid="improve-link-input"
          />
          <button
            onClick={handleSubmitLink}
            disabled={submitting || !linkValue.trim()}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity disabled:opacity-40"
            style={{ background: "#6366f1", color: "#fff" }}
            data-testid="improve-link-submit"
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Submit"}
          </button>
        </div>
      )}

      {activeOption === "upload" && (
        <label
          className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white"
          style={{ border: "1px dashed #cbd5e1" }}
          data-testid="improve-upload-label"
        >
          <Upload className="w-4 h-4" style={{ color: "#94a3b8" }} />
          <span className="text-[12px]" style={{ color: "#64748b" }}>
            {submitting ? "Uploading..." : "Choose file (CSV, image, PDF)"}
          </span>
          <input
            type="file"
            accept={options.find(o => o.type === "upload")?.accept || ".csv,.png,.jpg,.pdf"}
            onChange={handleUpload}
            className="hidden"
            disabled={submitting}
          />
        </label>
      )}
    </div>
  );
}
