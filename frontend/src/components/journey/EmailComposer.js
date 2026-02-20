import { useState, useRef } from "react";
import { Send, X, Sparkles, Loader2, Paperclip, AlertCircle, Crown } from "lucide-react";
import api from "../../lib/api";
import { useSubscription } from "../../lib/subscription";
import { toast } from "sonner";
import { Button } from "../ui/button";
import EmailPreviewModal from "../EmailPreviewModal";

export function EmailComposer({ coaches, programId, universityName, onSent, onCancel }) {
  const { subscription } = useSubscription();
  const canUseAIDrafts = subscription?.tier === "premium";
  const [to, setTo] = useState(coaches?.[0]?.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };

  const draftAI = async (type) => {
    if (!canUseAIDrafts) return;
    setDrafting(true);
    try {
      const res = await api.post("/ai/draft-email", { program_id: programId, email_type: type });
      setSubject(res.data.subject || ""); setBody(res.data.body || "");
      if (res.data.coach_email) setTo(res.data.coach_email);
      toast.success("AI draft ready");
    } catch (e) {
      if (e.response?.data?.detail?.error === "subscription_limit") return;
      toast.error("Failed to generate draft");
    } finally { setDrafting(false); }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is too large (max 10MB)`); continue; }
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/gmail/upload-attachment", formData, { headers: { "Content-Type": "multipart/form-data" } });
        setAttachments(prev => [...prev, res.data]);
      }
    } catch { toast.error("Failed to upload file"); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const removeAttachment = (fileId) => setAttachments(prev => prev.filter(a => a.file_id !== fileId));
  const formatFileSize = (bytes) => bytes < 1024 ? `${bytes}B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1048576).toFixed(1)}MB`;

  const send = async () => {
    if (!to || !subject || !body) { toast.error("Fill all fields"); return; }
    setSending(true);
    try {
      await api.post("/gmail/send", { to, subject, body, attachment_ids: attachments.map(a => a.file_id) });
      toast.success("Email sent!"); setShowPreview(false); onSent();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed to send. Is Gmail connected?"); }
    finally { setSending(false); }
  };

  const handleReview = () => {
    if (!to || !subject || !body) { toast.error("Fill all fields"); return; }
    setShowPreview(true);
  };

  const selectedCoach = coaches.find(c => c.email === to);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="email-composer-overlay">
      <div className="w-full max-w-[620px] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(46,196,182,0.08)", maxHeight: "90vh", colorScheme: "dark" }}
        data-testid="email-composer">
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white tracking-tight">Compose Email</h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="composer-close-btn">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            {canUseAIDrafts ? (
              ["intro", "follow_up", "thank_you", "interest_update"].map(t => (
                <button key={t} onClick={() => draftAI(t)} disabled={drafting}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors disabled:opacity-50"
                  style={{ background: "rgba(46,196,182,0.1)", color: "#2ec4b6", border: "1px solid rgba(46,196,182,0.2)" }}
                  data-testid={`draft-${t}-btn`}>
                  <Sparkles className="w-3 h-3 inline mr-1" />{t.replace(/_/g, " ")}
                </button>
              ))
            ) : (
              <div className="flex items-center gap-2 w-full py-1.5 px-3 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }} data-testid="ai-draft-locked">
                <Crown className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>AI email drafts require <a href="/account" className="text-purple-400 hover:underline font-medium">Premium</a></span>
              </div>
            )}
          </div>
          {canUseAIDrafts && (
            <p className="text-[10px] flex items-center gap-1 mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              AI uses your <a href="/profile" className="text-teal-600 hover:underline">athlete profile</a> to generate emails.
            </p>
          )}
          {drafting && <div className="flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /><span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>AI is drafting...</span></div>}
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1" style={{ colorScheme: "dark" }}>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>To</label>
            <select value={to} onChange={e => setTo(e.target.value)} className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="email-to-select">
              <option value="" style={{ background: "#1e2230", color: "#94a3b8" }}>Select recipient...</option>
              {coaches.filter(c => c.email).map(c => <option key={c.coach_id} value={c.email} style={{ background: "#1e2230", color: "#e2e8f0" }}>{c.coach_name} ({c.email})</option>)}
              <option value="_custom" style={{ background: "#1e2230", color: "#e2e8f0" }}>Type custom email...</option>
            </select>
            {to === "_custom" && <input placeholder="coach@university.edu" onChange={e => setTo(e.target.value)} className={`${inputCls} mt-2`} style={inputStyle} />}
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Subject</label>
            <input placeholder="e.g. Introduction — Class of 2027" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} style={inputStyle} data-testid="email-subject-input" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Message</label>
            <textarea placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} rows={10}
              className={`${inputCls} resize-none`} style={inputStyle} data-testid="email-body-input" />
          </div>
          <div>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" data-testid="file-input" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
              data-testid="attach-file-btn">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
              {uploading ? "Uploading..." : "Attach Files"}
            </button>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map(att => (
                  <div key={att.file_id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
                    style={{ background: "rgba(46,196,182,0.06)", border: "1px solid rgba(46,196,182,0.15)", color: "rgba(255,255,255,0.6)" }}
                    data-testid={`attachment-${att.file_id}`}>
                    <Paperclip className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="truncate max-w-[150px]">{att.filename}</span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>({formatFileSize(att.size)})</span>
                    <button onClick={() => removeAttachment(att.file_id)} className="ml-0.5 p-0.5 rounded hover:bg-white/10"><X className="w-3 h-3 text-white/40" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="composer-cancel-btn">
            Cancel
          </button>
          <Button onClick={handleReview} disabled={sending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(46,196,182,0.4)]"
            style={{ background: "linear-gradient(135deg, #2ec4b6, #25a99e)" }}
            data-testid="send-email-btn">
            <Send className="w-4 h-4" />Review & Send{attachments.length > 0 ? ` (${attachments.length})` : ""}
          </Button>
        </div>
      </div>

      {showPreview && (
        <EmailPreviewModal
          to={to}
          subject={subject}
          body={body}
          attachments={attachments}
          coachName={selectedCoach?.coach_name}
          universityName={universityName}
          onEdit={() => setShowPreview(false)}
          onConfirm={send}
          onClose={() => setShowPreview(false)}
          sending={sending}
        />
      )}
    </div>
  );
}
