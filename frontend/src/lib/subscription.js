import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "./api";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    refresh();
    // Re-fetch subscription every 30 seconds to catch admin-side changes
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refresh }}>
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
