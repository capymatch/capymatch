import { Settings, User, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <div data-testid="settings-page" className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
        <Settings className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
      </div>
      <h2 className="font-heading text-2xl font-bold text-white mb-2">Settings</h2>
      <p className="text-white/60 text-center max-w-md">
        Customize your recruiting dashboard preferences and account settings.
        This feature is coming soon!
      </p>
      <div className="mt-8 flex items-center gap-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
          <User className="w-4 h-4 text-purple-400" />
          <span className="text-white/40 text-sm">Profile</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
          <Bell className="w-4 h-4 text-orange-400" />
          <span className="text-white/40 text-sm">Notifications</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-white/40 text-sm">Privacy</span>
        </div>
      </div>
    </div>
  );
}
