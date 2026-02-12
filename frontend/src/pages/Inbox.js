import { Inbox as InboxIcon, Mail } from "lucide-react";

export default function Inbox() {
  return (
    <div data-testid="inbox-page" className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
        <InboxIcon className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-2xl font-bold text-white mb-2">Inbox</h2>
      <p className="text-white/60 text-center max-w-md">
        Your email inbox and communications with coaches will appear here.
        This feature is coming soon!
      </p>
      <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
        <Mail className="w-4 h-4 text-purple-400" />
        <span className="text-white/40 text-sm">0 unread messages</span>
      </div>
    </div>
  );
}
