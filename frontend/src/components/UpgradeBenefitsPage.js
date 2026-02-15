import { useState } from "react";
import { Sparkles, TrendingUp, Video, Zap, MessageSquare, BarChart3, Shield, Check, ArrowRight, Crown } from "lucide-react";
import { useSubscription } from "../lib/subscription";
import UpgradeModal from "./UpgradeModal";

const FEATURE_BENEFITS = {
  "outreach-analysis": {
    title: "Engagement AI",
    subtitle: "Supercharge your recruiting outreach with AI-powered insights",
    icon: TrendingUp,
    color: "pink",
    benefits: [
      { icon: BarChart3, title: "Outreach Score", desc: "Get a personalized score measuring the strength of your recruiting engagement" },
      { icon: MessageSquare, title: "AI Email Drafts", desc: "Generate personalized emails to coaches with one click using AI" },
      { icon: TrendingUp, title: "Engagement Insights", desc: "See what's working in your outreach and where to improve" },
      { icon: Shield, title: "Coach Watch Alerts", desc: "Get notified when coaching staff changes at your target schools (Premium)" },
    ],
  },
  "highlight-advisor": {
    title: "Highlight AI",
    subtitle: "Get expert AI feedback on your highlight reel to impress coaches",
    icon: Video,
    color: "violet",
    benefits: [
      { icon: Video, title: "Reel Analysis", desc: "AI reviews your highlight video and gives actionable improvement tips" },
      { icon: Sparkles, title: "Coach Perspective", desc: "Understand what college coaches look for in recruiting videos" },
      { icon: Check, title: "Skill Breakdown", desc: "Get detailed feedback on technique, positioning, and game IQ" },
      { icon: TrendingUp, title: "Improvement Plan", desc: "Receive a step-by-step plan to create a standout highlight reel" },
    ],
  },
};

export default function UpgradeBenefitsPage({ featureKey }) {
  const { subscription } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const config = FEATURE_BENEFITS[featureKey] || FEATURE_BENEFITS["outreach-analysis"];
  const Icon = config.icon;
  const accent = "pink";

  return (
    <>
      <div className="max-w-3xl mx-auto py-8 px-4" data-testid={`upgrade-benefits-${featureKey}`}>
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-pink-500/15">
            <Icon className="w-8 h-8 text-pink-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "var(--t-text)" }}>
            Unlock {config.title}
          </h1>
          <p className="text-sm md:text-base max-w-md mx-auto" style={{ color: "var(--t-text-muted)" }}>
            {config.subtitle}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {config.benefits.map((b, i) => {
            const BIcon = b.icon;
            return (
              <div
                key={i}
                className="rounded-xl border p-5 transition-all hover:shadow-md"
                style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
              >
                <div className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center bg-pink-500/10">
                  <BIcon className="w-5 h-5 text-pink-500" />
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--t-text)" }}>{b.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--t-text-muted)" }}>{b.desc}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="rounded-xl border p-6 text-center"
          style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-pink-500" />
            <span className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
              Available on Active Recruit & Commit Ready plans
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--t-text-muted)" }}>
            Starting at $19/mo. Cancel anytime.
          </p>
          <button
            onClick={() => setShowUpgrade(true)}
            data-testid="upgrade-benefits-cta"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:shadow-pink-500/20"
          >
            View Plans <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="recruiting_insights"
        currentTier={subscription?.tier || "basic"}
      />
    </>
  );
}
