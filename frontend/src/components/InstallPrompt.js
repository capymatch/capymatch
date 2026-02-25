import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed recently
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone) return;
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after a short delay
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: listen for install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm" data-testid="install-prompt">
      <div className="rounded-2xl p-4 shadow-2xl border"
        style={{ background: "#1a2030", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
            <img src="/images/icon-96x96.png" alt="CapyMatch" className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white">Install CapyMatch</h3>
              <button onClick={dismiss} className="p-1 rounded-lg hover:bg-white/10" data-testid="install-dismiss">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
            {isIOS ? (
              <p className="text-xs text-white/50 leading-relaxed">
                Tap <Share className="w-3.5 h-3.5 inline-block mx-0.5 -mt-0.5" style={{ color: "#2dd4bf" }} /> in your browser, then <span className="text-white/70 font-medium">"Add to Home Screen"</span>
              </p>
            ) : (
              <>
                <p className="text-xs text-white/50 mb-3">Get quick access from your home screen</p>
                <button onClick={install}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-semibold text-white transition-colors"
                  style={{ backgroundColor: "#1a8a80" }}
                  data-testid="install-btn">
                  <Download className="w-4 h-4" /> Install App
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
