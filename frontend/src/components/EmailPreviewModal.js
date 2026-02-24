import { Send, X, Edit2, Paperclip, User, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

export default function EmailPreviewModal({ to, subject, body, attachments = [], coachName, universityName, onEdit, onConfirm, onClose, sending }) {
  const formatFileSize = (bytes) => bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1048576).toFixed(1)}MB`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="email-preview-overlay">
      <div className="w-full max-w-[580px] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(26,138,128,0.08)" }}
        data-testid="email-preview-modal">

        {/* Header */}
        <div className="p-5 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white tracking-tight">Review Your Message</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="preview-close-btn">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>To</span>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-semibold"
              style={{ background: "rgba(26,138,128,0.1)", border: "1px solid rgba(26,138,128,0.2)", color: "#1a8a80" }}
              data-testid="preview-recipient-badge">
              <User className="w-3.5 h-3.5 opacity-70" />
              {coachName || to}
            </div>
          </div>
          {(to && coachName) && (
            <p className="text-[12px] mt-1.5 ml-[42px]" style={{ color: "rgba(255,255,255,0.3)" }} data-testid="preview-recipient-email">
              {to}{universityName ? ` — ${universityName}` : ""}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: "55vh" }}>
          <div className="mb-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Subject</div>
            <div className="text-[15px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }} data-testid="preview-subject">{subject}</div>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "rgba(255,255,255,0.3)" }}>Message</div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }} data-testid="preview-body">
            {body}
          </div>

          {attachments.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                Attachments ({attachments.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map(att => (
                  <div key={att.file_id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                    data-testid={`preview-attachment-${att.file_id}`}>
                    <Paperclip className="w-3 h-3 opacity-50" />
                    <span className="truncate max-w-[150px]">{att.filename}</span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>({formatFileSize(att.size)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between gap-3" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="preview-edit-btn">
            <Edit2 className="w-3.5 h-3.5" />Edit Message
          </button>
          <Button
            onClick={onConfirm}
            disabled={sending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(26,138,128,0.4)]"
            style={{ background: "linear-gradient(135deg, #1a8a80, #25a99e)" }}
            data-testid="preview-confirm-send-btn">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Confirm & Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
