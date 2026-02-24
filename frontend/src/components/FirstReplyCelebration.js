import { useState, useEffect } from "react";
import { X } from "lucide-react";
import api from "../lib/api";

export function FirstReplyCelebration() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    api.get("/first-reply-celebration")
      .then(res => { if (res.data.should_celebrate) setShow(true); })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    setShow(false);
    api.post("/first-reply-celebration/dismiss").catch(() => {});
  };

  if (!show) return null;

  return (
    <div data-testid="first-reply-celebration" className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(26,26,46,0.85)", backdropFilter: "blur(12px)" }} onClick={dismiss}>
      <div className="relative text-center px-8 py-12 max-w-md" style={{ animation: "celebrationScale 0.5s ease" }} onClick={e => e.stopPropagation()}>
        <div className="mb-4" style={{ animation: "celebrationBounce 0.6s ease 0.3s both" }}><img src="/images/capymatch-celebrate.png" alt="" style={{ width: 120, height: 120, objectFit: "contain", margin: "0 auto", display: "block" }} /></div>
        <h2 className="text-3xl font-extrabold text-white mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          A Coach Replied!
        </h2>
        <p className="text-white/60 text-sm mb-6 leading-relaxed">
          This is a huge milestone in your recruiting journey.<br />Your hard work is paying off!
        </p>
        <button data-testid="celebration-dismiss" onClick={dismiss}
          className="px-7 py-3 rounded-xl text-sm font-semibold border-none cursor-pointer transition-transform hover:scale-105"
          style={{ background: "#1a8a80", color: "white" }}>
          View Response
        </button>
        <button onClick={dismiss} className="absolute top-6 right-6 p-2 rounded-full transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
          <X className="w-5 h-5" />
        </button>
      </div>
      <style>{`
        @keyframes celebrationScale { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes celebrationBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
      `}</style>
    </div>
  );
}
