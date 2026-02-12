import { Inbox as InboxIcon, Mail, Sparkles } from "lucide-react";

export default function Inbox() {
  return (
    <div data-testid="inbox-page" className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/10">
        <InboxIcon className="w-12 h-12 text-purple-400" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-3xl font-bold text-white mb-3">Inbox</h2>
      <p className="text-white/50 text-center max-w-md leading-relaxed">
        Your email inbox and communications with coaches will appear here.
        This feature is coming soon!
      </p>
      <div className="mt-8 flex items-center gap-3 px-5 py-3 bg-white/5 rounded-xl border border-white/10">
        <Mail className="w-5 h-5 text-purple-400" />
        <span className="text-white/40 text-sm">0 unread messages</span>
        <Sparkles className="w-4 h-4 text-amber-400" />
      </div>
    </div>
  );
}
