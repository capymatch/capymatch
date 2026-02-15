import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Zap, Crown, Loader2, Rocket, ArrowRight, Star } from "lucide-react";
import { useTheme } from "../lib/theme";
import api from "../lib/api";
import { toast } from "sonner";

const TIER_CONFIG = {
  basic: {
    icon: Zap, gradient: "from-slate-500 to-zinc-600",
    badge: null,
  },
  pro: {
    icon: Rocket, gradient: "from-pink-500 via-rose-500 to-pink-600",
    badge: "Most Popular",
  },
  premium: {
    icon: Crown, gradient: "from-amber-400 via-yellow-500 to-orange-500",
    badge: "Best Value",
  },
};

function TierCard({ tier, isCurrent, isRecommended, checkoutLoading, onUpgrade, dark }) {
  const config = TIER_CONFIG[tier.id] || TIER_CONFIG.basic;
  const Icon = config.icon;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all duration-500 ${
        isRecommended ? `md:scale-[1.05] z-10 shadow-2xl ring-2 ${tier.id === "pro" ? "ring-pink-500/50" : "ring-amber-500/40"}` : "hover:scale-[1.02]"
      } ${isCurrent ? "opacity-55 pointer-events-none" : ""}`}
      style={{
        backgroundColor: dark
          ? (isRecommended ? "rgba(30, 24, 42, 0.95)" : "rgba(24, 20, 36, 0.85)")
          : (isRecommended ? "#ffffff" : "#f8f9fb"),
        borderColor: dark
          ? (isRecommended ? "rgba(244,63,94,0.35)" : "rgba(255,255,255,0.06)")
          : (isRecommended ? "rgba(244,63,94,0.3)" : "#e5e7eb"),
        boxShadow: isRecommended
          ? (dark ? "0 0 60px rgba(244,63,94,0.18), 0 20px 40px rgba(0,0,0,0.4)" : "0 0 40px rgba(244,63,94,0.1), 0 10px 30px rgba(0,0,0,0.08)")
          : (dark ? "0 4px 20px rgba(0,0,0,0.2)" : "0 2px 12px rgba(0,0,0,0.06)"),
      }}
      data-testid={`tier-card-${tier.id}`}
    >
      {config.badge && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div className={`px-3 py-0.5 rounded-full bg-gradient-to-r ${config.gradient} text-white text-[9px] font-bold uppercase tracking-widest shadow-lg flex items-center gap-1`}>
            <Star className="w-2.5 h-2.5" fill="currentColor" />
            {config.badge}
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: dark ? "#fff" : "#1f2937" }}>{tier.label}</h3>
            {isCurrent && <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: dark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>Current Plan</span>}
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight" style={{ color: dark ? "#fff" : "#1f2937" }}>${tier.price}</span>
            <span className="text-[10px] font-medium" style={{ color: dark ? "rgba(255,255,255,0.35)" : "#9ca3af" }}>/mo</span>
          </div>
          {tier.price === 0 && <p className="text-[10px]" style={{ color: dark ? "rgba(255,255,255,0.3)" : "#9ca3af" }}>Free forever</p>}
          {tier.id === "pro" && <p className="text-[10px] text-pink-500">Save $48/yr annually</p>}
          {tier.id === "premium" && <p className="text-[10px] text-amber-500">Save $96/yr annually</p>}
        </div>

        <div className="h-px mb-2" style={{ background: dark ? (isRecommended ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.06)") : (isRecommended ? "rgba(244,63,94,0.12)" : "#e5e7eb") }} />

        <ul className="space-y-1.5 mb-3 flex-1">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <div className={`w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                tier.id === "premium" ? "bg-amber-500/10" : tier.id === "pro" ? "bg-pink-500/10" : "bg-zinc-500/10"
              }`}>
                <Check className={`w-2 h-2 ${
                  tier.id === "premium" ? "text-amber-500" : tier.id === "pro" ? "text-pink-500" : "text-zinc-400"
                }`} strokeWidth={3} />
              </div>
              <span className="text-[11px] leading-snug" style={{ color: dark ? "rgba(255,255,255,0.7)" : "#4b5563" }}>{f}</span>
            </li>
          ))}
        </ul>

        {isCurrent ? (
          <div
            className="w-full py-2.5 rounded-xl text-center text-xs font-medium border"
            style={{ borderColor: dark ? "rgba(255,255,255,0.1)" : "#e5e7eb", color: dark ? "rgba(255,255,255,0.3)" : "#9ca3af" }}
            data-testid={`tier-current-${tier.id}`}
          >
            Your Current Plan
          </div>
        ) : (
          <button
            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
              isRecommended
                ? `bg-gradient-to-r ${config.gradient} text-white hover:shadow-xl hover:shadow-pink-500/20`
                : tier.id === "premium"
                  ? `bg-gradient-to-r ${config.gradient} text-black hover:shadow-lg hover:shadow-amber-500/20`
                  : dark
                    ? "bg-white/8 hover:bg-white/12 text-white/80 border border-white/10"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
            }`}
            data-testid={`tier-upgrade-${tier.id}`}
            disabled={checkoutLoading === tier.id}
            onClick={() => onUpgrade(tier)}
          >
            {checkoutLoading === tier.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {tier.price === 0 ? "Downgrade" : `Get ${tier.label}`}
                {tier.price > 0 && <ArrowRight className="w-3.5 h-3.5" />}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function UpgradeModal({ isOpen, onClose, feature, currentTier = "basic" }) {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const { theme } = useTheme();
  const dark = theme === "dark";

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

  const tierOrder = ["basic", "pro", "premium"];
  const currentIdx = tierOrder.indexOf(currentTier);
  const recommendedTier = currentIdx < tierOrder.length - 1 ? tierOrder[currentIdx + 1] : "premium";

  const handleUpgrade = async (tier) => {
    if (tier.price === 0) { onClose(); return; }
    setCheckoutLoading(tier.id);
    try {
      const res = await api.post("/stripe/checkout", { plan: tier.id, origin_url: window.location.origin });
      window.location.href = res.data.url;
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to start checkout");
      setCheckoutLoading(null);
    }
  };

  const bgColor = dark ? "#1e1a2e" : "#f0f1f5";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0" style={{ backgroundColor: bgColor }} onClick={onClose} />

      <div
        className="relative w-full max-h-[100vh] md:max-w-4xl rounded-2xl md:rounded-3xl border overflow-y-auto"
        style={{
          backgroundColor: bgColor,
          borderColor: dark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
        }}
        data-testid="upgrade-modal"
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:top-5 md:right-5 z-20 p-2 rounded-xl transition-colors"
          style={{ color: dark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}
          data-testid="upgrade-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="relative px-5 pt-4 pb-3 md:px-8 md:pt-6 md:pb-4 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-gradient-to-b from-pink-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 mb-3">
              <Rocket className="w-3 h-3 text-pink-500" />
              <span className="text-[10px] font-semibold text-pink-500 uppercase tracking-wider">Upgrade</span>
            </div>
            <h2 className="text-lg md:text-2xl font-bold mb-1" style={{ color: dark ? "#fff" : "#1f2937" }}>
              Choose Your Plan
            </h2>
            <p className="text-xs md:text-sm max-w-lg mx-auto" style={{ color: dark ? "rgba(255,255,255,0.4)" : "#6b7280" }}>
              {featureMessages[feature] || "Unlock powerful tools to elevate your college volleyball recruiting."}
            </p>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="px-4 pb-3 md:px-6 md:pb-5">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-pink-400 mx-auto mb-3" />
              <p className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>Loading plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  isCurrent={tier.id === currentTier}
                  isRecommended={tier.id === recommendedTier}
                  checkoutLoading={checkoutLoading}
                  onUpgrade={handleUpgrade}
                  dark={dark}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-3 md:px-8 md:pb-4 text-center">
          <p className="text-[10px]" style={{ color: dark ? "rgba(255,255,255,0.25)" : "#9ca3af" }}>14-day money-back guarantee. Cancel anytime.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
