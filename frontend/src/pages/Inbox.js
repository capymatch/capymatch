import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Send, Search, RefreshCw, ChevronLeft, Reply, ReplyAll, Paperclip, X, Plus, AlertCircle, Loader2, UserPlus, Sparkles } from "lucide-react";
import api, { BACKEND_URL } from "../lib/api";
import { toast } from "sonner";

function parseEmailAddress(raw) {
  if (!raw) return { name: "", email: "" };
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].replace(/"/g, "").trim(), email: match[2] };
  return { name: "", email: raw.trim() };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EmailAvatar({ name, email: addr }) {
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#10b981", "#3b82f6", "#ef4444", "#14b8a6"];
  const char = (name || addr || "?").charAt(0).toUpperCase();
  const idx = char.charCodeAt(0) % colors.length;
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
      style={{ backgroundColor: colors[idx] }}
    >
      {char}
    </div>
  );
}

// ─── Compose Modal ───
function ComposeModal({ onClose, onSent, replyTo }) {
  const [to, setTo] = useState(replyTo?.to || "");
  const [subject, setSubject] = useState(replyTo?.subject || "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [emailType, setEmailType] = useState("intro");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    if (!replyTo) {
      api.get("/programs").then(res => setPrograms(res.data || [])).catch(() => {});
    }
  }, [replyTo]);

  const handleAiDraft = async () => {
    if (!selectedProgram) return toast.error("Select a program first");
    setDrafting(true);
    try {
      const res = await api.post("/ai/draft-email", {
        program_id: selectedProgram,
        email_type: emailType,
        custom_instructions: customInstructions,
      });
      setSubject(res.data.subject || "");
      setBody(res.data.body || "");
      if (res.data.coach_email) setTo(res.data.coach_email);
      setShowAiPanel(false);
      toast.success("Draft generated!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to generate draft");
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async () => {
    if (!to.trim()) return toast.error("Recipient is required");
    setSending(true);
    try {
      let response;
      if (replyTo?.thread_id && replyTo?.message_id) {
        response = await api.post("/gmail/reply", {
          thread_id: replyTo.thread_id,
          message_id: replyTo.message_id,
          body: body.replace(/\n/g, "<br>"),
          reply_all: false,
        });
      } else {
        response = await api.post("/gmail/send", {
          to: to.trim(),
          subject: subject.trim(),
          body: body.replace(/\n/g, "<br>"),
        });
      }
      toast.success("Email sent!");
      
      // Show toast if program status was auto-updated
      if (response.data?.program_updated) {
        const { university_name } = response.data.program_updated;
        toast.success(`${university_name} updated to "Contacted" → "Awaiting Reply"`, {
          duration: 5000,
        });
      }
      
      onSent?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const emailTypes = [
    { value: "intro", label: "Introduction" },
    { value: "follow_up", label: "Follow-Up" },
    { value: "thank_you", label: "Thank You" },
    { value: "interest_update", label: "Interest Update" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" data-testid="compose-modal">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col max-h-[80vh]"
        style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
          <h3 className="font-semibold" style={{ color: "var(--t-text)" }}>
            {replyTo ? "Reply" : "New Message"}
          </h3>
          <div className="flex items-center gap-2">
            {!replyTo && (
              <button
                data-testid="ai-draft-toggle"
                onClick={() => setShowAiPanel(!showAiPanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showAiPanel ? "bg-purple-600 text-white" : "bg-purple-500/15 text-purple-500 hover:bg-purple-500/25"}`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Draft
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--t-text-muted)" }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Draft Panel */}
        {showAiPanel && (
          <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: "var(--t-border)", backgroundColor: "rgba(139, 92, 246, 0.05)" }} data-testid="ai-draft-panel">
            <div className="flex items-center gap-3">
              <select
                data-testid="ai-program-select"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              >
                <option value="">Select a program...</option>
                {programs.map(p => (
                  <option key={p.program_id} value={p.program_id}>{p.university_name}</option>
                ))}
              </select>
              <select
                data-testid="ai-email-type"
                value={emailType}
                onChange={(e) => setEmailType(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              >
                {emailTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                data-testid="ai-custom-instructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                placeholder="Optional: custom instructions (e.g., 'mention I'll be at their camp next month')"
              />
              <button
                data-testid="ai-generate-btn"
                onClick={handleAiDraft}
                disabled={drafting || !selectedProgram}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {drafting ? "Drafting..." : "Generate"}
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-auto p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm w-12" style={{ color: "var(--t-text-muted)" }}>To</span>
            <input
              data-testid="compose-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50"
              style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              placeholder="recipient@email.com"
              disabled={!!replyTo}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm w-12" style={{ color: "var(--t-text-muted)" }}>Subject</span>
            <input
              data-testid="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50"
              style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
              placeholder="Subject"
              disabled={!!replyTo}
            />
          </div>
          <textarea
            data-testid="compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50 resize-none"
            style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
            placeholder="Write your message..."
            autoFocus
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: "var(--t-border)" }}>
          <div />
          <button
            data-testid="compose-send-btn"
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Thread View ───
function ThreadView({ thread, onBack, onReply }) {
  if (!thread) return null;
  const messages = thread.messages || [];

  return (
    <div className="flex flex-col h-full" data-testid="thread-view">
      {/* Thread Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--t-border)" }}>
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--t-text-muted)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-lg truncate flex-1" style={{ color: "var(--t-text)" }}>
          {thread.subject || "(no subject)"}
        </h2>
        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--t-surface-alt)", color: "var(--t-text-muted)" }}>
          {messages.length} message{messages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-5 space-y-4">
        {messages.map((msg, idx) => {
          const sender = parseEmailAddress(msg.from);
          const bodyContent = msg.body_html || msg.body_text || msg.snippet || "";
          return (
            <div
              key={msg.id}
              className="rounded-xl border p-5"
              style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
              data-testid={`thread-message-${idx}`}
            >
              <div className="flex items-start gap-3 mb-4">
                <EmailAvatar name={sender.name} email={sender.email} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: "var(--t-text)" }}>
                    {sender.name || sender.email}
                  </p>
                  <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
                    to {msg.to}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--t-text-muted)" }}>
                  {formatDate(msg.date)}
                </span>
              </div>
              {msg.body_html ? (
                <div
                  className="text-sm prose prose-sm max-w-none"
                  style={{ color: "var(--t-text-secondary)" }}
                  dangerouslySetInnerHTML={{ __html: bodyContent }}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--t-text-secondary)" }}>
                  {bodyContent}
                </p>
              )}
              {msg.attachments?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {msg.attachments.map((att, ai) => (
                    <div
                      key={ai}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border"
                      style={{ backgroundColor: "var(--t-surface-alt)", borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}
                    >
                      <Paperclip className="w-3 h-3" />
                      {att.filename}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply Bar */}
      <div className="px-5 py-4 border-t" style={{ borderColor: "var(--t-border)" }}>
        <button
          data-testid="reply-btn"
          onClick={() => {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg) onReply(lastMsg);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
        >
          <Reply className="w-4 h-4" />
          Reply
        </button>
      </div>
    </div>
  );
}

// ─── Main Inbox ───
export default function Inbox() {
  const [gmailStatus, setGmailStatus] = useState(null); // null = loading
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const navigate = useNavigate();

  // Check Gmail connection
  useEffect(() => {
    api.get("/gmail/status")
      .then((res) => setGmailStatus(res.data))
      .catch(() => setGmailStatus({ connected: false }));
  }, []);

  // Load emails when connected
  const [noCoaches, setNoCoaches] = useState(false);

  const fetchEmails = useCallback(async (query = "", append = false, pageToken = null) => {
    if (!gmailStatus?.connected) return;
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (pageToken) params.set("page_token", pageToken);
      const res = await api.get(`/gmail/emails?${params.toString()}`);
      setNoCoaches(!!res.data.no_coaches);
      if (append) {
        setEmails((prev) => [...prev, ...res.data.emails]);
      } else {
        setEmails(res.data.emails);
      }
      setNextPageToken(res.data.next_page_token);
    } catch (err) {
      if (err.response?.status === 403) {
        setGmailStatus({ connected: false });
        toast.error("Gmail disconnected. Please reconnect.");
      } else {
        toast.error("Failed to load emails");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [gmailStatus?.connected]);

  useEffect(() => {
    if (gmailStatus?.connected) fetchEmails();
  }, [gmailStatus?.connected, fetchEmails]);

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    fetchEmails(searchQuery);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmails(activeSearch);
  };

  const openThread = async (em) => {
    setSelectedEmail(em);
    setThreadLoading(true);
    try {
      const res = await api.get(`/gmail/threads/${em.thread_id}`);
      setThread(res.data);
    } catch {
      toast.error("Failed to load conversation");
    } finally {
      setThreadLoading(false);
    }
  };

  const handleReply = (msg) => {
    const sender = parseEmailAddress(msg.from);
    setReplyTo({
      to: sender.email || msg.from,
      subject: msg.subject?.startsWith("Re:") ? msg.subject : `Re: ${msg.subject}`,
      thread_id: msg.thread_id,
      message_id: msg.id,
    });
    setShowCompose(true);
  };

  const handleConnect = async () => {
    try {
      const res = await api.get("/gmail/connect");
      window.location.href = res.data.auth_url;
    } catch {
      toast.error("Failed to start Gmail connection");
    }
  };

  // ─── Not Connected State ───
  if (gmailStatus !== null && !gmailStatus.connected) {
    return (
      <div data-testid="inbox-page" className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center mb-6">
          <Mail className="w-10 h-10 text-purple-500" strokeWidth={1.5} />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-2" style={{ color: "var(--t-text)" }}>Connect Your Gmail</h2>
        <p className="text-center max-w-md text-sm mb-6" style={{ color: "var(--t-text-muted)" }}>
          Connect your Gmail account to send and receive emails directly from your recruiting dashboard.
        </p>
        <button
          data-testid="connect-gmail-btn"
          onClick={handleConnect}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-lg"
        >
          <Mail className="w-4 h-4" />
          Connect Gmail Account
        </button>
      </div>
    );
  }

  // ─── Loading State ───
  if (gmailStatus === null) {
    return (
      <div data-testid="inbox-page" className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ─── Connected Inbox ───
  return (
    <div data-testid="inbox-page" className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>
            Coach conversations &middot; {gmailStatus.gmail_email}
        </p>
        <div className="flex items-center gap-2">
          <button
            data-testid="refresh-btn"
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border transition-colors"
            style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            data-testid="compose-btn"
            onClick={() => { setReplyTo(null); setShowCompose(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Compose
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t-text-muted)" }} />
          <input
            data-testid="inbox-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emails..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-purple-500/50 transition-colors"
            style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
          />
        </div>
      </form>

      {/* Content */}
      <div className="flex-1 flex rounded-xl border overflow-hidden" style={{ borderColor: "var(--t-border)" }}>
        {/* Email List */}
        <div
          className={`flex-shrink-0 border-r overflow-auto ${thread ? "hidden lg:block lg:w-96" : "w-full"}`}
          style={{ borderColor: "var(--t-border)", backgroundColor: "var(--t-surface)" }}
          data-testid="email-list"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Mail className="w-10 h-10 mb-3" style={{ color: "var(--t-text-faint)" }} />
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                {activeSearch ? "No emails match your search" : "No recruiting emails found"}
              </p>
              <p className="text-xs text-center max-w-xs mt-2" style={{ color: "var(--t-text-faint)" }}>
                Emails from .edu addresses and your tracked coaches will appear here.
              </p>
            </div>
          ) : (
            <>
              {emails.map((em) => {
                const sender = parseEmailAddress(em.from);
                const isActive = selectedEmail?.id === em.id;
                return (
                  <div
                    key={em.id}
                    onClick={() => openThread(em)}
                    data-testid={`email-row-${em.id}`}
                    className={`flex items-start gap-3 px-4 py-3.5 border-b cursor-pointer transition-colors ${
                      isActive ? "bg-purple-500/10" : ""
                    }`}
                    style={{
                      borderColor: "var(--t-border)",
                      backgroundColor: isActive ? undefined : "transparent",
                    }}
                  >
                    <EmailAvatar name={sender.name} email={sender.email} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${em.is_unread ? "font-semibold" : "font-medium"}`}
                          style={{ color: "var(--t-text)" }}
                        >
                          {sender.name || sender.email}
                        </span>
                        {em.is_known_coach ? (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 flex-shrink-0">Coach</span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 flex-shrink-0">New</span>
                        )}
                        <span className="text-xs flex-shrink-0 ml-auto" style={{ color: "var(--t-text-muted)" }}>
                          {formatDate(em.date)}
                        </span>
                      </div>
                      <p
                        className={`text-sm truncate mt-0.5 ${em.is_unread ? "font-medium" : ""}`}
                        style={{ color: em.is_unread ? "var(--t-text)" : "var(--t-text-secondary)" }}
                      >
                        {em.subject || "(no subject)"}
                      </p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--t-text-muted)" }}>
                        {em.snippet}
                      </p>
                    </div>
                    {em.is_unread && (
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
              {nextPageToken && (
                <div className="p-4 text-center">
                  <button
                    data-testid="load-more-btn"
                    onClick={() => fetchEmails(activeSearch, true, nextPageToken)}
                    disabled={loadingMore}
                    className="text-sm text-purple-500 hover:text-purple-400 transition-colors"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Thread Panel */}
        <div className={`flex-1 ${!thread ? "hidden lg:flex" : "flex"} flex-col`} style={{ backgroundColor: "var(--t-bg)" }}>
          {threadLoading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : thread ? (
            <ThreadView
              thread={thread}
              onBack={() => { setThread(null); setSelectedEmail(null); }}
              onReply={handleReply}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1">
              <Mail className="w-12 h-12 mb-3" style={{ color: "var(--t-text-faint)" }} />
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Select an email to read</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => { setShowCompose(false); setReplyTo(null); }}
          onSent={() => fetchEmails(activeSearch)}
          replyTo={replyTo}
        />
      )}
    </div>
  );
}
