import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api, { BACKEND_URL } from "./api";
import { toast } from "sonner";

const SubscriptionContext = createContext(null);

const TIER_LABELS = { basic: "Starter", pro: "Active Recruit", premium: "Commit Ready" };

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planEvent, setPlanEvent] = useState(null);
  const wsRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/subscription");
      setSubscription(res.data);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { refresh(); }, [refresh]);

  // WebSocket connection for real-time plan change notifications
  useEffect(() => {
    let ws;
    let reconnectTimer;

    function connect() {
      const wsUrl = BACKEND_URL.replace(/^http/, "ws") + "/api/ws/tenant_public_default";
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "plan_changed") {
            const newLabel = TIER_LABELS[data.new_plan] || data.new_plan;
            const oldLabel = TIER_LABELS[data.old_plan] || data.old_plan;
            const isUpgrade = ["basic", "pro", "premium"].indexOf(data.new_plan) > ["basic", "pro", "premium"].indexOf(data.old_plan);
            setPlanEvent({ ...data, isUpgrade });
            toast(isUpgrade ? "Plan Upgraded!" : "Plan Changed", {
              description: `Your plan was changed from ${oldLabel} to ${newLabel}.`,
              duration: 8000,
            });
            refresh();
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        reconnectTimer = setTimeout(connect, 5000);
      };

      ws.onerror = () => { ws.close(); };
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [refresh]);

  const dismissPlanEvent = useCallback(() => setPlanEvent(null), []);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refresh, planEvent, dismissPlanEvent }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) return { subscription: null, loading: true, refresh: () => {} };
  return ctx;
}

export function canAccess(subscription, feature) {
  if (!subscription) return false;
  return subscription.limits?.[feature] === true || subscription.limits?.[feature] === -1;
}

export function getUsage(subscription, key) {
  if (!subscription) return { used: 0, limit: 0, remaining: 0, unlimited: false };
  const usage = subscription.usage || {};
  const limit = usage[`${key}_limit`];
  return {
    used: usage[key] || 0,
    limit: limit,
    remaining: usage[`${key}_remaining`],
    unlimited: limit === -1,
  };
}
