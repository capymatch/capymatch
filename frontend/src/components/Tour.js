import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const TOUR_STEPS = [
  {
    target: null,
    title: "Welcome to Recruiting HQ",
    description: "Let's take a quick 30-second tour so you know where everything is.",
    position: "center",
  },
  {
    target: '[data-testid="nav-dashboard"]',
    title: "Dashboard",
    description: "Your command center. See stats, upcoming events, follow-up reminders, and who's viewed your profile.",
    position: "right",
  },
  {
    target: '[data-testid="nav-pipeline"]',
    title: "Pipeline",
    description: "Track every school you're interested in. Manage recruiting status, coach contacts, and follow-ups.",
    position: "right",
  },
  {
    target: '[data-testid="nav-calendar"]',
    title: "Calendar",
    description: "Keep track of camps, showcases, tournaments, and campus visits all in one place.",
    position: "right",
  },
  {
    target: '[data-testid="nav-inbox"]',
    title: "Inbox",
    description: "Connect your Gmail to send and receive coach emails without leaving the app. AI can draft emails for you.",
    position: "right",
  },
  {
    target: '[data-testid="nav-schools"]',
    title: "School Database",
    description: "Browse 40+ D1, D2, and D3 volleyball programs. Add any school to your pipeline with one click.",
    position: "right",
  },
  {
    target: '[data-testid="profile-dropdown-trigger"]',
    title: "Your Profile",
    description: "Set up your athlete profile here — it powers your public page, share link, and AI-generated emails.",
    position: "bottom-left",
  },
  {
    target: null,
    title: "You're all set!",
    description: "Head to the Schools page to add your first target school, then set up your athlete profile. Happy recruiting!",
    position: "center",
  },
];

export default function Tour({ onComplete }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const navigate = useNavigate();

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
      setRect(null);
    }
  }, [current.target]);

  useEffect(() => {
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [updateRect]);

  const finish = () => {
    localStorage.setItem("tour_completed", "true");
    onComplete();
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  // Tooltip positioning
  const getTooltipStyle = () => {
    if (current.position === "center" || !rect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    if (current.position === "right") {
      return {
        position: "fixed",
        top: Math.max(8, rect.top - 10),
        left: rect.left + rect.width + 16,
      };
    }
    if (current.position === "bottom-left") {
      return {
        position: "fixed",
        top: rect.top + rect.height + 12,
        right: 16,
      };
    }
    return {};
  };

  return (
    <div className="fixed inset-0 z-[9999]" data-testid="tour-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" />

      {/* Spotlight cutout */}
      {rect && (
        <div
          className="absolute rounded-xl transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            zIndex: 1,
            pointerEvents: "none",
            border: "2px solid rgba(168, 85, 247, 0.6)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="w-[420px] rounded-2xl border p-8 shadow-2xl z-10"
        style={{
          ...getTooltipStyle(),
          backgroundColor: "#1a1a2e",
          borderColor: "rgba(168, 85, 247, 0.3)",
        }}
        data-testid="tour-tooltip"
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 28 : 8,
                  backgroundColor: i === step ? "#a855f7" : i < step ? "#a855f7" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
          <button
            onClick={finish}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
            data-testid="tour-skip-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {current.position === "center" && step === 0 && (
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-5 mx-auto">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        )}
        <h3 className="text-xl font-bold text-white mb-2">{current.title}</h3>
        <p className="text-base text-gray-400 leading-relaxed">{current.description}</p>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          {step > 0 ? (
            <button
              onClick={prev}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              data-testid="tour-prev-btn"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button
              onClick={finish}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              data-testid="tour-skip-all-btn"
            >
              Skip tour
            </button>
          )}
          <button
            onClick={next}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
            data-testid="tour-next-btn"
          >
            {step === TOUR_STEPS.length - 1 ? "Get Started" : step === 0 ? "Start Tour" : "Next"}
            {step < TOUR_STEPS.length - 1 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
