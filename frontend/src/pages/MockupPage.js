import { Mail, Phone, FileText } from "lucide-react";
import { Button } from "../components/ui/button";

export default function MockupPage() {
  return (
    <div style={{ backgroundColor: "#f4f6f5", minHeight: "100vh", padding: "40px 24px" }}>
      <h1 style={{ textAlign: "center", fontSize: "14px", fontWeight: 700, color: "#8fa5a0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 32 }}>
        Celebration Cards Mockup
      </h1>

      <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap", maxWidth: 900, margin: "0 auto" }}>

        {/* ─── COACH REPLIED CARD ─── */}
        <div style={{ flex: "1 1 380px", maxWidth: 440 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#8fa5a0", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Coach Replied</p>
          <div className="rounded-2xl border p-5 sm:p-6 text-center relative overflow-hidden"
            style={{ backgroundColor: "#fff", borderColor: "rgba(16,185,129,0.2)", background: "linear-gradient(135deg, rgba(16,185,129,0.04), #fff 60%)" }}>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%)" }} />
            <div className="relative">
              <img src="/images/capymatch-logo.png" alt="CapyMatch" style={{ width: 72, height: 72, objectFit: "contain", margin: "0 auto 12px", display: "block" }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a2b2a", marginBottom: 4 }}>Coach Smith is interested!</h3>
              <p style={{ fontSize: 12, color: "#6b7f7a", marginBottom: 16, maxWidth: 320, margin: "0 auto 16px" }}>
                Replied yesterday — keep the momentum going:
              </p>
              <div className="flex gap-2.5 justify-center flex-wrap">
                <Button className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 px-4 shadow-md">
                  <Mail className="w-3.5 h-3.5 mr-1.5" />Send Thank You
                </Button>
                <Button variant="outline" className="text-xs h-8 px-4" style={{ color: "#5a6e69", borderColor: "#d8e2de" }}>
                  <Phone className="w-3.5 h-3.5 mr-1.5" />Schedule Call
                </Button>
                <Button variant="outline" className="text-xs h-8 px-4 border-teal-700/30 text-teal-600 hover:bg-teal-700/10">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />Log a Note
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── COMMITTED CARD ─── */}
        <div style={{ flex: "1 1 380px", maxWidth: 440 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#8fa5a0", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Committed</p>
          <div className="rounded-2xl border relative overflow-hidden"
            style={{
              borderColor: "rgba(251,191,36,0.3)",
              background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(16,185,129,0.06) 40%, #fff 100%)",
            }}>
            <style>{`
              @keyframes confettiFallMock {
                0% { transform: translateY(-12px) rotate(0deg); opacity: 0; }
                10% { opacity: 1; }
                100% { transform: translateY(120px) rotate(720deg); opacity: 0; }
              }
              @keyframes shimmerMock {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
              }
            `}</style>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[
                { left: "8%", delay: "0s", dur: "3s", color: "#fbbf24", size: 6 },
                { left: "18%", delay: "0.4s", dur: "3.5s", color: "#2ec4b6", size: 5 },
                { left: "30%", delay: "0.8s", dur: "2.8s", color: "#22c55e", size: 7 },
                { left: "45%", delay: "0.2s", dur: "3.2s", color: "#fbbf24", size: 5 },
                { left: "58%", delay: "1s", dur: "3s", color: "#2ec4b6", size: 6 },
                { left: "70%", delay: "0.6s", dur: "3.4s", color: "#22c55e", size: 4 },
                { left: "82%", delay: "0.3s", dur: "2.9s", color: "#fbbf24", size: 7 },
                { left: "92%", delay: "0.9s", dur: "3.1s", color: "#2ec4b6", size: 5 },
              ].map((p, i) => (
                <div key={i} style={{
                  position: "absolute", top: 0, left: p.left,
                  width: p.size, height: p.size, borderRadius: i % 2 === 0 ? "50%" : "1px",
                  backgroundColor: p.color,
                  animation: `confettiFallMock ${p.dur} ${p.delay} ease-in infinite`,
                }} />
              ))}
            </div>
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)" }} />
            <div className="relative p-6 sm:p-8 text-center">
              <img src="/images/capymatch-logo.png" alt="CapyMatch" style={{ width: 80, height: 80, objectFit: "contain", margin: "0 auto 12px", display: "block" }} />
              <p style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8,
                background: "linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "shimmerMock 3s linear infinite",
              }}>
                Committed
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a2b2a", marginBottom: 8 }}>
                Stanford University
              </h2>
              <p style={{ fontSize: 14, color: "#5a6e69", marginBottom: 4 }}>
                The hard work paid off. Congratulations!
              </p>
              <p style={{ fontSize: 12, color: "#8fa5a0" }}>
                This is a moment to celebrate with your family.
              </p>
              <div style={{ margin: "20px auto 0", height: 1, width: 96, background: "linear-gradient(90deg, transparent, #fbbf24, transparent)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
