import { useState, useEffect } from "react";
import { X, Sparkles, Check, Zap, Crown, Loader2 } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

const tierIcons = {
  basic: Zap,
  pro: Sparkles,
  premium: Crown,
};

const tierColors = {
  basic: { bg: "bg-zinc-800", border: "border-zinc-700", accent: "text-zinc-400" },
  pro: { bg: "bg-pink-950/40", border: "border-pink-700/60", accent: "text-pink-400" },
  premium: { bg: "bg-amber-950/30", border: "border-amber-600/50", accent: "text-amber-400" },
};

export default function UpgradeModal({ isOpen, onClose, feature, currentTier = "basic" }) {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get("/subscription/tiers").then(res => {
      setTiers(res.data.tiers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const featureMessages = {
    ai_drafts: "AI-powered email drafts help you write personalized outreach that gets coaches' attention.",
    gmail_integration: "Connect your Gmail to send and receive emails directly from your recruiting dashboard.",
    recruiting_insights: "Get data-driven insights about your recruiting outreach effectiveness.",
    analytics: "Unlock detailed analytics about your recruiting pipeline and performance.",
    max_schools: "Track more schools on your recruiting board to maximize your opportunities.",
    public_profile: "Create a public athlete profile that coaches can view anytime.",
    follow_up_reminders: "Never miss a follow-up with smart automated reminders.",
    auto_reply_detection: "Automatically detect when coaches reply to your emails.",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-3xl rounded-2xl border overflow-hidden"
        style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
        data-testid="upgrade-modal"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "var(--t-text-muted)" }}
            data-testid="upgrade-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--t-text)" }}>
                Unlock This Feature
              </h2>
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                {featureMessages[feature] || "Upgrade your plan to access this feature."}
              </p>
            </div>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="text-center py-8" style={{ color: "var(--t-text-muted)" }}>Loading plans...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((tier) => {
                const isCurrent = tier.id === currentTier;
                const colors = tierColors[tier.id] || tierColors.basic;
                const Icon = tierIcons[tier.id] || Zap;
                const isRecommended = tier.id === "pro";

                return (
                  <div
                    key={tier.id}
                    className={`relative rounded-xl border p-5 transition-all ${colors.border} ${
                      isCurrent ? "opacity-60" : "hover:border-pink-500/50 cursor-pointer"
                    }`}
                    style={{ backgroundColor: "var(--t-surface-alt)" }}
                    data-testid={`tier-card-${tier.id}`}
                  >
                    {isRecommended && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-pink-600 text-white text-[10px] font-bold uppercase tracking-wider">
                        Recommended
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-5 h-5 ${colors.accent}`} />
                      <span className={`text-sm font-bold ${colors.accent}`}>{tier.label}</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>
                        ${tier.price}
                      </span>
                      <span className="text-sm" style={{ color: "var(--t-text-muted)" }}>/mo</span>
                    </div>
                    <ul className="space-y-2 mb-5">
                      {tier.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--t-text-secondary)" }}>
                          <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colors.accent}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <div
                        className="w-full py-2 rounded-lg text-center text-sm font-medium border"
                        style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}
                        data-testid={`tier-current-${tier.id}`}
                      >
                        Current Plan
                      </div>
                    ) : (
                      <button
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                          isRecommended
                            ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:from-pink-500 hover:to-rose-500 shadow-lg shadow-pink-900/30"
                            : "bg-white/10 hover:bg-white/15 text-white"
                        }`}
                        data-testid={`tier-upgrade-${tier.id}`}
                        onClick={() => {
                          // For now, close modal - Stripe integration will replace this
                          onClose();
                        }}
                      >
                        {tier.price === 0 ? "Downgrade" : `Upgrade to ${tier.label}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
