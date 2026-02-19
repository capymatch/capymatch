import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Check, Loader2 } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

function TierCard({ tier, isCurrent, isPopular, checkoutLoading, onUpgrade }) {
  const isFree = tier.price === 0;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all ${
        isPopular ? "border-[var(--t-accent)] border-2" : "border-[var(--t-border)]"
      }`}
      style={{ backgroundColor: "var(--t-surface)" }}
      data-testid={`tier-card-${tier.id}`}
    >
      {/* Most Popular badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="px-5 py-1.5 rounded-full text-white text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: "var(--t-accent)" }}>
            Most Popular
          </div>
        </div>
      )}

      <div className="p-7 flex flex-col flex-1">
        {/* Tier name */}
        <p className="text-[11px] uppercase tracking-[0.15em] font-bold mb-5" style={{ color: "var(--t-text-secondary)" }}>
          {tier.label}
        </p>

        {/* Price */}
        <div className="mb-1">
          {isFree ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black tracking-tight" style={{ color: "var(--t-text)" }}>Free</span>
              <span className="text-base font-medium" style={{ color: "var(--t-text-muted)" }}>forever</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-0.5">
              <span className="text-4xl font-black tracking-tight" style={{ color: "var(--t-text)" }}>${tier.price}</span>
              <span className="text-sm font-medium" style={{ color: "var(--t-text-muted)" }}>/month</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs mb-7" style={{ color: "var(--t-text-muted)" }}>
          {tier.description}
        </p>

        {/* Features */}
        <ul className="space-y-4 mb-8 flex-1">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--t-accent)" }} strokeWidth={2.5} />
              <span className="text-sm" style={{ color: "var(--t-text)" }}>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        {isCurrent ? (
          <div
            className="w-full py-3 rounded-xl text-center text-sm font-semibold border"
            style={{ borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}
            data-testid={`tier-current-${tier.id}`}
          >
            Current Plan
          </div>
        ) : (
          <button
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              isPopular
                ? "text-white"
                : "border"
            }`}
            style={
              isPopular
                ? { backgroundColor: "var(--t-text)" }
                : { borderColor: "var(--t-border)", color: "var(--t-text)" }
            }
            data-testid={`tier-upgrade-${tier.id}`}
            disabled={checkoutLoading === tier.id}
            onClick={() => onUpgrade(tier)}
          >
            {checkoutLoading === tier.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFree ? (
              "Start Free"
            ) : (
              `Upgrade to ${tier.label}`
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

  useEffect(() => {
    if (!isOpen) return;
    api.get("/subscription/tiers").then(res => {
      setTiers(res.data.tiers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose} />

      <div
        className="relative w-full max-w-4xl rounded-2xl border overflow-y-auto max-h-[95vh]"
        style={{ backgroundColor: "var(--t-bg)", borderColor: "var(--t-border)" }}
        data-testid="upgrade-modal"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl transition-colors"
          style={{ color: "var(--t-text-muted)" }}
          data-testid="upgrade-modal-close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-2 text-center">
          <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: "var(--t-text)" }}>
            Choose Your Plan
          </h2>
          <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
            Stay organized, never miss a coach response, and always know your next move.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="px-6 py-8">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "var(--t-accent)" }} />
              <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>Loading plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {tiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  isCurrent={tier.id === currentTier}
                  isPopular={tier.id === "pro"}
                  checkoutLoading={checkoutLoading}
                  onUpgrade={handleUpgrade}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 text-center">
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>14-day money-back guarantee. Cancel anytime.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
