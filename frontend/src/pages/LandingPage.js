import { Activity, ArrowRight, Sparkles, BarChart3, Calendar, Mail, Shield, Zap, CheckCircle, ChevronRight, Eye } from "lucide-react";

export default function LandingPage() {
  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleLocalLogin = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: "#f8faf9", fontFamily: "'DM Sans', 'Inter', sans-serif" }}>

      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b" style={{ backgroundColor: "rgba(248,250,249,0.85)", backdropFilter: "blur(16px)", borderColor: "#e8eeeb" }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/capymatch-logo.png" alt="CapyMatch" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-[15px] tracking-tight" style={{ color: "#1a2b2a" }}>CapyMatch</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] font-medium transition-colors" style={{ color: "#6b7f7a" }}>Features</a>
            <a href="#how" className="text-[13px] font-medium transition-colors" style={{ color: "#6b7f7a" }}>How It Works</a>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={handleLocalLogin} className="text-[13px] font-semibold px-4 py-2 rounded-full transition-all" style={{ color: "#1a2b2a" }} data-testid="header-login-btn">
              Log In
            </button>
            <button onClick={handleLogin} className="text-[13px] font-semibold px-5 py-2 rounded-full text-white transition-all hover:opacity-90" style={{ backgroundColor: "#2ec4b6" }} data-testid="header-cta-btn">
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-8 md:pt-40 md:pb-12 overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(46,196,182,0.06) 0%, transparent 60%)"
        }} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-6" style={{ backgroundColor: "rgba(46,196,182,0.08)", color: "#2ec4b6" }}>
            <span className="text-[11px] font-bold uppercase tracking-wider">For Volleyball Families</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-6" style={{ color: "#1a2b2a" }} data-testid="hero-headline">
            Recruiting doesn't have to feel{" "}
            <span className="italic font-normal" style={{ color: "#8fa5a0", fontFamily: "'Libre Baskerville', 'Georgia', serif" }}>
              overwhelming.
            </span>
          </h1>

          <p className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10" style={{ color: "#5a6e69" }}>
            The NCAA just changed the recruiting timeline — again. New contact rules,
            shifting deadlines, NIL questions, and an inbox full of uncertainty. CapyMatch
            brings calm, clarity, and honest guidance so you can support your athlete with
            confidence — even when the rules keep changing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleLogin}
              data-testid="hero-cta-btn"
              className="flex items-center justify-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full text-white transition-all hover:opacity-90 hover:-translate-y-[1px]"
              style={{ backgroundColor: "#2ec4b6", boxShadow: "0 4px 20px rgba(46,196,182,0.25)" }}
            >
              Start Free <ChevronRight className="w-4 h-4" />
            </button>
            <a
              href="#how"
              className="flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full border transition-all hover:bg-white"
              style={{ borderColor: "#d8e2de", color: "#3a4f4a" }}
            >
              Watch Demo
            </a>
          </div>
        </div>

        {/* ─── HERO APP MOCKUP ─── */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 mt-16 md:mt-20">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 25px 80px rgba(26,43,42,0.12), 0 8px 32px rgba(46,196,182,0.08)",
              border: "1px solid rgba(46,196,182,0.12)"
            }}
          >
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: "#f0f4f2", borderBottom: "1px solid #e2e8e5" }}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ff6058" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ffbd2e" }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#27ca40" }} />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-1.5 px-4 py-1 rounded-md text-[11px]" style={{ backgroundColor: "#e8eeeb", color: "#8fa5a0" }}>
                  <Shield className="w-3 h-3" />
                  app.capymatch.com
                </div>
              </div>
              <div className="w-12" />
            </div>
            {/* App screenshot */}
            <img
              src="/images/app-dashboard.jpg"
              alt="CapyMatch Dashboard - Track schools, response rates, and recruiting actions"
              className="w-full block"
              style={{ backgroundColor: "#f4f6f5" }}
              data-testid="hero-app-image"
            />
          </div>

          {/* Subtle reflection glow underneath */}
          <div className="mx-auto mt-[-2px]" style={{
            width: "80%",
            height: "60px",
            background: "radial-gradient(ellipse at center, rgba(46,196,182,0.08) 0%, transparent 70%)",
            filter: "blur(20px)"
          }} />
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="py-12 md:py-16" style={{ borderTop: "1px solid #e8eeeb", borderBottom: "1px solid #e8eeeb" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 text-center">
            {[
              { number: "500+", label: "Volleyball Programs" },
              { number: "AI", label: "Email Drafts" },
              { number: "100%", label: "Source-Aware" },
              { number: "Free", label: "To Start" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: "#1a2b2a" }}>{s.number}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: "#2ec4b6" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: "#1a2b2a" }} data-testid="features-heading">
              Everything your family needs
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "#6b7f7a" }}>Built for volleyball recruiting. Grounded in data. Designed for parents who want clarity, not noise.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Sparkles,
                title: "AI-Powered Insights",
                desc: "Source-aware intelligence cards that explain scholarship structures, NIL readiness, and roster reality — with citations, not guesses.",
                iconBg: "rgba(46,196,182,0.1)",
                iconColor: "#2ec4b6",
              },
              {
                icon: Mail,
                title: "Gmail Integration",
                desc: "Send and track coach emails without leaving the app. Smart filters show only recruiting conversations.",
                iconBg: "rgba(239,68,68,0.08)",
                iconColor: "#ef4444",
              },
              {
                icon: BarChart3,
                title: "Recruiting Pipeline",
                desc: "Visual board to track every school from first contact to offer. Automated follow-up reminders keep you on pace.",
                iconBg: "rgba(99,102,241,0.08)",
                iconColor: "#6366f1",
              },
              {
                icon: Eye,
                title: "NCAA Timeline Guidance",
                desc: "Know exactly when your athlete can contact coaches, visit campuses, and receive offers — by division.",
                iconBg: "rgba(168,85,247,0.08)",
                iconColor: "#a855f7",
              },
              {
                icon: Calendar,
                title: "Events & Calendar",
                desc: "Track camps, showcases, and campus visits. Share your athlete's schedule with interested coaches.",
                iconBg: "rgba(16,185,129,0.08)",
                iconColor: "#10b981",
              },
              {
                icon: Zap,
                title: "Smart Follow-Ups",
                desc: "Never miss a follow-up window. Context-aware reminders tell you when and how to reach out again.",
                iconBg: "rgba(245,158,11,0.08)",
                iconColor: "#f59e0b",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl border p-7 transition-all duration-300 hover:shadow-md hover:-translate-y-[2px]"
                style={{ backgroundColor: "white", borderColor: "#e8eeeb" }}
                data-testid={`feature-card-${i}`}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: f.iconBg }}>
                  <f.icon className="w-5 h-5" style={{ color: f.iconColor }} strokeWidth={2} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "#1a2b2a" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6b7f7a" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="py-20 md:py-28" style={{ backgroundColor: "white", borderTop: "1px solid #e8eeeb", borderBottom: "1px solid #e8eeeb" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: "#1a2b2a" }}>
              Up and running in 2 minutes
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "#6b7f7a" }}>No complicated setup. No learning curve.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: "01", title: "Build the athlete profile", desc: "Add stats, highlight video, and contact info. This powers your public profile page and AI-drafted emails." },
              { step: "02", title: "Add target schools", desc: "Browse 500+ volleyball programs across D1, D2, D3, and NAIA. Get AI-matched suggestions based on your athlete's fit." },
              { step: "03", title: "Start reaching out", desc: "Use AI to draft personalized emails, send them through Gmail, and let smart reminders handle the follow-up cadence." },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-extrabold mb-4" style={{ color: "rgba(46,196,182,0.15)" }}>{s.step}</div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "#1a2b2a" }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6b7f7a" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BUILT FOR FAMILIES ─── */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4" style={{ color: "#1a2b2a" }}>
            Built for families,{" "}
            <span style={{ color: "#2ec4b6" }}>not agents</span>
          </h2>
          <p className="text-base mb-12 max-w-xl mx-auto" style={{ color: "#6b7f7a" }}>
            We believe every family deserves access to honest, data-driven recruiting guidance.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
            {[
              "AI that cites its sources — never guesses",
              "Scholarship & NIL intelligence with safe-to-ask questions",
              "Timeline guidance aligned to your athlete's division",
              "Follow-up reminders so nothing falls through the cracks",
              "Public profile page you can share with any coach",
              "Free tier that's actually useful — no bait-and-switch",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5">
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#2ec4b6" }} strokeWidth={2} />
                <span className="text-sm" style={{ color: "#3a4f4a" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-20 md:py-28 relative overflow-hidden" style={{ backgroundColor: "#1a2b2a" }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(46,196,182,0.1) 0%, transparent 70%)"
        }} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Ready to take control
            <br />
            of recruiting?
          </h2>
          <p className="text-base mb-10 max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
            Join families who are navigating the recruiting process with confidence.
            Set up takes less than 2 minutes.
          </p>

          <button
            onClick={handleLogin}
            data-testid="final-cta-btn"
            className="inline-flex items-center justify-center gap-2 font-semibold text-sm px-8 py-4 rounded-full transition-all hover:-translate-y-[1px]"
            style={{ backgroundColor: "#2ec4b6", color: "white", boxShadow: "0 4px 30px rgba(46,196,182,0.3)" }}
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs mt-5" style={{ color: "rgba(255,255,255,0.35)" }}>Free forever. No credit card required.</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8" style={{ borderTop: "1px solid #e8eeeb" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/capymatch-logo.png" alt="CapyMatch" className="w-7 h-7 rounded-md object-cover" />
            <span className="font-bold text-sm" style={{ color: "#1a2b2a" }}>CapyMatch</span>
          </div>
          <p className="text-xs" style={{ color: "#8fa5a0" }}>Built for volleyball families navigating high-visibility recruiting seasons.</p>
        </div>
      </footer>
    </div>
  );
}
