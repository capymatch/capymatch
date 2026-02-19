import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useSubscription, canAccess } from "../lib/subscription";
import UpgradeModal from "./UpgradeModal";

export default function FeatureGate({ feature, children, fallback }) {
  const { subscription } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const hasAccess = canAccess(subscription, feature);

  if (hasAccess) return children;

  if (fallback) return fallback;

  return (
    <>
      <div
        className="relative rounded-xl border p-6 text-center cursor-pointer group"
        style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
        onClick={() => setShowUpgrade(true)}
        data-testid={`feature-gate-${feature}`}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-full bg-teal-600/15 flex items-center justify-center">
            <Lock className="w-5 h-5 text-slate-500" />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
            Upgrade to Unlock
          </h3>
          <p className="text-xs max-w-xs" style={{ color: "var(--t-text-muted)" }}>
            This feature requires a higher subscription plan.
          </p>
          <button
            className="mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-teal-600 text-white text-xs font-semibold hover:from-slate-500 hover:to-slate-500 transition-all flex items-center gap-2 shadow-lg shadow-teal-900/30"
            data-testid={`feature-gate-upgrade-${feature}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            View Plans
          </button>
        </div>
      </div>
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={feature}
        currentTier={subscription?.tier || "basic"}
      />
    </>
  );
}
