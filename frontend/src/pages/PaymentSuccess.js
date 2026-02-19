import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useSubscription } from "../lib/subscription";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const { refresh } = useSubscription();
  const [status, setStatus] = useState("polling"); // polling | success | failed
  const [plan, setPlan] = useState("");
  const polledRef = useRef(false);

  useEffect(() => {
    if (!sessionId || polledRef.current) return;
    polledRef.current = true;

    let attempt = 0;
    const maxAttempts = 8;
    const interval = 2500;

    async function poll() {
      try {
        const res = await api.get(`/stripe/checkout/status/${sessionId}`);
        const data = res.data;
        setPlan(data.plan || "");

        if (data.payment_status === "paid") {
          setStatus("success");
          refresh();
          return;
        }
        if (data.status === "expired" || data.status === "canceled") {
          setStatus("failed");
          return;
        }
      } catch {
        // continue polling
      }

      attempt++;
      if (attempt < maxAttempts) {
        setTimeout(poll, interval);
      } else {
        setStatus("failed");
      }
    }

    poll();
  }, [sessionId, refresh]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="payment-no-session">
        <p style={{ color: "var(--t-text-muted)" }}>No payment session found.</p>
      </div>
    );
  }

  const TIER_LABELS = { pro: "Pro", premium: "Premium" };

  return (
    <div className="flex items-center justify-center py-20" data-testid="payment-success-page">
      <div
        className="w-full max-w-md rounded-2xl border p-8 text-center"
        style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
      >
        {status === "polling" && (
          <div className="space-y-4" data-testid="payment-polling">
            <Loader2 className="w-12 h-12 mx-auto text-slate-500 animate-spin" />
            <h2 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
              Processing Payment...
            </h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
              Please wait while we confirm your payment.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4" data-testid="payment-confirmed">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
              Welcome to {TIER_LABELS[plan] || "your new plan"}!
            </h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
              Your subscription has been upgraded. All {TIER_LABELS[plan] || "premium"} features are now unlocked.
            </p>
            <Button
              onClick={() => navigate("/board")}
              className="mt-4 bg-gradient-to-r from-teal-600 to-teal-600 text-white hover:from-slate-500 hover:to-slate-500"
              data-testid="payment-go-dashboard"
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-4" data-testid="payment-failed">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-500/15 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-teal-400" />
            </div>
            <h2 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>
              Payment Not Completed
            </h2>
            <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
              Your payment could not be confirmed. Please try again or contact support.
            </p>
            <Button
              onClick={() => navigate("/board")}
              variant="outline"
              className="mt-4"
              style={{ borderColor: "var(--t-border)", color: "var(--t-text-secondary)" }}
              data-testid="payment-back-dashboard"
            >
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
