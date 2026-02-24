import { useState } from "react";

const SOURCES = {
  primary: (domain) => `https://icon.horse/icon/${domain}`,
  fallback: (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
};

export default function UniversityLogo({ domain, name, size = 40, className = "", logoUrl }) {
  const initialSrc = logoUrl || (domain ? SOURCES.primary(domain) : null);
  const [src, setSrc] = useState(initialSrc);
  const [triedFallback, setTriedFallback] = useState(false);

  const initials = (name || "")
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "U";

  const gradients = [
    "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    "linear-gradient(135deg,#10b981,#059669)",
    "linear-gradient(135deg,#f59e0b,#d97706)",
    "linear-gradient(135deg,#1a8a80,#14b8a6)",
    "linear-gradient(135deg,#a855f7,#7c3aed)",
    "linear-gradient(135deg,#06b6d4,#0891b2)",
  ];
  const hash = (name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  if (!src) {
    return (
      <div
        className={`rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
        style={{ width: size, height: size, background: gradients[hash % gradients.length], fontSize: size * 0.35 }}
        data-testid="university-logo-fallback"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={`rounded-lg flex-shrink-0 object-contain ${className}`}
      style={{ backgroundColor: "#fff", border: "1px solid var(--t-border)" }}
      onError={() => {
        if (!triedFallback && domain) {
          setTriedFallback(true);
          setSrc(logoUrl ? SOURCES.primary(domain) : SOURCES.fallback(domain));
        } else if (triedFallback && domain && src !== SOURCES.fallback(domain)) {
          setSrc(SOURCES.fallback(domain));
        } else {
          setSrc(null);
        }
      }}
      loading="lazy"
      data-testid="university-logo"
    />
  );
}
