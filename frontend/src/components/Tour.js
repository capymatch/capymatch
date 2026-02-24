import { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, ArrowLeft, Rocket } from "lucide-react";
import api from "../lib/api";

const TOUR_STEPS = [
  {
    target: null,
    title: "Welcome to CapyMatch",
    description: "Let's take a quick tour so you know where everything is. This will only take 30 seconds.",
    position: "center",
  },
  {
    target: '[data-testid="nav-dashboard"]',
    title: "Dashboard",
    description: "Your command center — stats, upcoming events, follow-up reminders, and profile views at a glance.",
    position: "right",
  },
  {
    target: '[data-testid="nav-my schools"]',
    title: "My Schools",
    description: "Track every school you're recruiting with. Drag-and-drop to update status, manage contacts, and log follow-ups.",
    position: "right",
  },
  {
    target: '[data-testid="nav-calendar"]',
    title: "Calendar",
    description: "Camps, showcases, tournaments, and campus visits — all in one place so you never miss an opportunity.",
    position: "right",
  },
  {
    target: '[data-testid="nav-find schools"]',
    title: "School Database",
    description: "Browse 1,000+ volleyball programs across D1, D2, and D3. Add schools to your list with one click.",
    position: "right",
  },
  {
    target: '[data-testid="nav-ai-features-toggle"]',
    title: "AI-Powered Tools",
    description: "Pro & Premium members get AI outreach analysis, highlight reel advice, and a personal recruiting assistant.",
    position: "right",
  },
  {
    target: '[data-testid="profile-dropdown-trigger"]',
    title: "Your Profile",
    description: "Set up your athlete profile — it powers your public page, share link, and AI-generated emails to coaches.",
    position: "bottom-left",
  },
  {
    target: null,
    title: "You're all set!",
    description: "You've added your first school — now build out your athlete profile and start reaching out to coaches!",
    position: "center",
  },
];

export default function Tour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const current = TOUR_STEPS[step];

  const updateRect = useCallback(() => {
    if (!current.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(current.target);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      // Target not found — skip to next step automatically
      setRect(null);
    }
  }, [current.target]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [updateRect]);

  // Auto-skip steps where target element doesn't exist
  useEffect(() => {
    if (!current.target) return; // center steps are fine
    const el = document.querySelector(current.target);
    if (!el) {
      // Element not in DOM, skip forward
      if (step < TOUR_STEPS.length - 1) {
        setStep(s => s + 1);
      } else {
        finish();
      }
    }
  }, [step, current.target]);

  const finish = () => {
    localStorage.setItem("tour_completed", "true");
    localStorage.removeItem("show_tour");
    api.post("/user/tours/main_tour/complete").catch(() => {});
    onComplete();
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const getTooltipStyle = () => {
    const isMobile = window.innerWidth < 768;
    if (current.position === "center" || !rect || isMobile) {
      return { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    if (current.position === "right") {
      return { position: "fixed", top: Math.max(8, rect.top - 10), left: rect.left + rect.width + 16 };
    }
    if (current.position === "bottom-left") {
      return { position: "fixed", top: rect.top + rect.height + 12, right: 16 };
    }
    return {};
  };

  return (
    <div className="fixed inset-0 z-[9999]" data-testid="tour-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Spotlight cutout */}
      {rect && window.innerWidth >= 768 && (
        <div
          className="absolute rounded-xl transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.40), 0 0 20px 4px rgba(244,63,94,0.25)",
            zIndex: 1,
            pointerEvents: "none",
            border: "2px solid rgba(244, 63, 94, 0.5)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="w-[90vw] max-w-[340px] rounded-2xl p-5 shadow-2xl z-10"
        style={{
          ...getTooltipStyle(),
          backgroundColor: "var(--t-surface, #1a1625)",
          border: "1px solid rgba(244, 63, 94, 0.2)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(244,63,94,0.1)",
        }}
        data-testid="tour-tooltip"
      >
        {/* Step dots */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6,
                  backgroundColor: i <= step ? "#1a8a80" : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>
          <button
            onClick={finish}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--t-text-muted, #6b7280)" }}
            data-testid="tour-skip-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Icon for center steps */}
        {current.position === "center" && step === 0 && (
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 to-teal-600 flex items-center justify-center mb-3 mx-auto shadow-lg shadow-teal-900/30">
            <Rocket className="w-5 h-5 text-white" />
          </div>
        )}
        {current.position === "center" && step === TOUR_STEPS.length - 1 && (
          <div className="text-3xl text-center mb-2">&#127751;</div>
        )}

        <h3
          className="text-base font-bold mb-1.5 text-center"
          style={{ color: "var(--t-text, #fff)" }}
        >
          {current.title}
        </h3>
        <p
          className="text-sm leading-relaxed text-center"
          style={{ color: "var(--t-text-muted, #9ca3af)" }}
        >
          {current.description}
        </p>

        {/* Step counter */}
        <div className="text-center mt-2">
          <span className="text-[11px] font-medium" style={{ color: "rgba(244,63,94,0.6)" }}>
            {step + 1} / {TOUR_STEPS.length}
          </span>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          {step > 0 ? (
            <button
              onClick={prev}
              className="flex items-center gap-1.5 text-xs transition-colors hover:text-white"
              style={{ color: "var(--t-text-muted, #9ca3af)" }}
              data-testid="tour-prev-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          ) : (
            <button
              onClick={finish}
              className="text-xs transition-colors hover:text-white"
              style={{ color: "var(--t-text-muted, #6b7280)" }}
              data-testid="tour-skip-all-btn"
            >
              Skip tour
            </button>
          )}
          <button
            onClick={next}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all bg-gradient-to-r from-teal-600 to-teal-600 hover:from-slate-500 hover:to-slate-500 shadow-lg shadow-teal-900/30"
            data-testid="tour-next-btn"
          >
            {step === TOUR_STEPS.length - 1 ? "Get Started" : step === 0 ? "Start Tour" : "Next"}
            {step < TOUR_STEPS.length - 1 && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
