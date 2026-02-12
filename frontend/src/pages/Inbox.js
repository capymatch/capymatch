import { Inbox as InboxIcon, Mail, Sparkles } from "lucide-react";

export default function Inbox() {
  return (
    <div data-testid="inbox-page" className="flex flex-col items-center justify-center min-h-[60vh]">
      <div 
        className="w-24 h-24 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6 shadow-lg"
      >
        <InboxIcon className="w-12 h-12 text-purple-500" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-3xl font-bold mb-3" style={{ color: "var(--t-text)" }}>Inbox</h2>
      <p className="text-center max-w-md leading-relaxed" style={{ color: "var(--t-text-muted)" }}>
        Your email inbox and communications with coaches will appear here.
        This feature is coming soon!
      </p>
      <div 
        className="mt-8 flex items-center gap-3 px-5 py-3 rounded-xl border"
        style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      >
        <Mail className="w-5 h-5 text-purple-500" />
        <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>0 unread messages</span>
        <Sparkles className="w-4 h-4 text-amber-500" />
      </div>
    </div>
  );
}
