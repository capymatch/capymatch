import { useSubscription } from "../lib/subscription";
import { Zap, Sparkles, Crown } from "lucide-react";

const badges = {
  basic: { icon: Zap, label: "Starter", className: "bg-white/15 text-white/80" },
  pro: { icon: Sparkles, label: "Pro", className: "bg-teal-600/20 text-teal-600" },
  premium: { icon: Crown, label: "Premium", className: "bg-amber-600/20 text-amber-400" },
};

export default function SubscriptionBadge({ collapsed }) {
  const { subscription } = useSubscription();
  const tier = subscription?.tier || "basic";
  const badge = badges[tier] || badges.basic;
  const Icon = badge.icon;

  if (collapsed) {
    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${badge.className}`} title={badge.label}>
        <Icon className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${badge.className}`} data-testid="subscription-badge">
      <Icon className="w-3.5 h-3.5" />
      <span>{badge.label} Plan</span>
    </div>
  );
}
