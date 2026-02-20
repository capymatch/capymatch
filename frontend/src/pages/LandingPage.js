import { Activity, ArrowRight, Mail, Sparkles, BarChart3, Calendar, Eye, Shield, Zap, CheckCircle } from "lucide-react";

export default function LandingPage() {
  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: "#0d0d1a", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.06]" style={{ backgroundColor: "rgba(13,13,26,0.85)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center">
              <Activity className="w-4.5 h-4.5 text-white" strokeWidth={2} />
            </div>
            <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RECRUITING HQ</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 hover:text-[#ccff00] transition-colors">Features</a>
            <a href="#how" className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 hover:text-[#ccff00] transition-colors">How It Works</a>
          </nav>
          <button
            onClick={handleLogin}
            data-testid="header-cta-btn"
            className="text-xs font-bold uppercase tracking-[0.15em] px-5 py-2.5 transition-all hover:-translate-y-[1px]"
            style={{ backgroundColor: "#ccff00", color: "#0a0a0a" }}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background glow shapes */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)" }} />

        {/* Court lines SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1200 800" preserveAspectRatio="none">
          <line x1="600" y1="0" x2="600" y2="800" stroke="white" strokeWidth="1" strokeDasharray="8 8" />
          <line x1="0" y1="300" x2="1200" y2="300" stroke="white" strokeWidth="1" strokeDasharray="8 8" />
          <line x1="0" y1="500" x2="1200" y2="500" stroke="white" strokeWidth="1" strokeDasharray="8 8" />
          <circle cx="600" cy="400" r="150" fill="none" stroke="white" strokeWidth="1" strokeDasharray="6 6" />
        </svg>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8" style={{ animationDelay: "0.1s" }}>
            <Sparkles className="w-3.5 h-3.5 text-[#ccff00]" />
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">AI-Powered Recruiting</span>
          </div>

          <h1
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tighter leading-[0.85] text-white mb-6"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            data-testid="hero-headline"
          >
            Own Your
            <br />
            <span className="bg-gradient-to-r from-[#ccff00] via-[#ccff00] to-teal-600 bg-clip-text text-transparent">Recruiting</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one platform for volleyball athletes to track schools,
            email coaches, and manage their path to playing college ball.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLogin}
              data-testid="hero-cta-btn"
              className="flex items-center justify-center gap-3 font-bold uppercase tracking-[0.12em] text-sm px-8 py-4 transition-all hover:-translate-y-[2px]"
              style={{ backgroundColor: "#ccff00", color: "#0a0a0a", boxShadow: "0 0 30px rgba(204,255,0,0.2)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Start Free with Google
            </button>
            <a
              href="#features"
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-400 hover:text-white transition-colors px-6 py-4"
            >
              See Features <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <p className="text-xs text-slate-600 mt-6">Free forever for athletes. No credit card required.</p>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: "linear-gradient(to top, #0d0d1a, transparent)" }} />
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="relative border-y border-white/[0.06] py-16" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 md:gap-24">
          {[
            { number: "45+", label: "D1-D3 Programs" },
            { number: "AI", label: "Email Drafts" },
            { number: "1-Click", label: "Pipeline Tracking" },
            { number: "100%", label: "Free" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-6xl font-black text-white tracking-tighter" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{s.number}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00] mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES BENTO GRID ─── */}
      <section id="features" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight text-white mb-4"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              data-testid="features-heading"
            >
              Everything You Need
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">Built specifically for volleyball recruiting. Every tool in one place.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Sparkles,
                title: "AI Email Drafts",
                desc: "Generate personalized outreach emails that sound like you, not a robot. Powered by Claude AI.",
                accent: "from-[#ccff00]/20 to-transparent",
                iconColor: "#ccff00",
              },
              {
                icon: Mail,
                title: "Gmail Integration",
                desc: "Send and receive coach emails without leaving the app. Smart filtering shows only recruiting conversations.",
                accent: "from-red-500/20 to-transparent",
                iconColor: "#ef4444",
              },
              {
                icon: BarChart3,
                title: "Pipeline Tracking",
                desc: "Kanban board to track every school from first contact to offer. Automated follow-up reminders.",
                accent: "from-indigo-500/20 to-transparent",
                iconColor: "#6366f1",
              },
              {
                icon: Eye,
                title: "Profile View Tracking",
                desc: "Know when coaches view your public profile. Highlights visits from .edu domains.",
                accent: "from-teal-600/20 to-transparent",
                iconColor: "#a855f7",
              },
              {
                icon: Calendar,
                title: "Events & Calendar",
                desc: "Track camps, showcases, tournaments, and campus visits. Share your schedule with coaches.",
                accent: "from-slate-500/20 to-transparent",
                iconColor: "#10b981",
              },
              {
                icon: Zap,
                title: "Smart Follow-Ups",
                desc: "Never miss a follow-up. AI-powered reminders tell you exactly when to reach out again.",
                accent: "from-amber-500/20 to-transparent",
                iconColor: "#f59e0b",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative overflow-hidden border border-white/[0.08] p-8 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]"
                style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                data-testid={`feature-card-${i}`}
              >
                {/* Corner glow on hover */}
                <div className={`absolute top-0 left-0 w-32 h-32 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div className="relative z-10">
                  <f.icon className="w-8 h-8 mb-5" style={{ color: f.iconColor }} strokeWidth={1.5} />
                  <h3
                    className="text-lg font-bold uppercase tracking-wide text-white mb-2"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="py-24 md:py-32 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="text-3xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight text-white mb-4"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              3 Steps to Start
            </h2>
            <p className="text-slate-400 text-base md:text-lg">Get recruiting in under 2 minutes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Set Up Your Profile", desc: "Add your stats, highlight video, and contact info. This powers your public page and AI-drafted emails." },
              { step: "02", title: "Build Your Target List", desc: "Browse 45+ volleyball programs across D1, D2, and D3. Add schools to your pipeline with one click." },
              { step: "03", title: "Start Reaching Out", desc: "Use AI to draft personalized emails, send them through Gmail, and let smart reminders handle follow-ups." },
            ].map((s, i) => (
              <div key={i} className="relative pl-6 border-l border-white/10">
                <div className="absolute left-0 top-0 w-px h-full">
                  <div className="w-full h-1/3 bg-gradient-to-b from-[#ccff00] to-transparent" />
                </div>
                <span
                  className="text-5xl font-black text-white/10 block mb-3"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {s.step}
                </span>
                <h3
                  className="text-xl font-bold uppercase tracking-wide text-white mb-2"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  {s.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BUILT FOR ATHLETES ─── */}
      <section className="py-24 md:py-32 border-t border-white/[0.06]" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2
            className="text-3xl sm:text-5xl md:text-6xl font-bold uppercase tracking-tight text-white mb-8"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Built for Athletes,
            <br />
            <span className="text-[#ccff00]">Not Agents</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto mb-12">
            {[
              "AI drafts emails that sound like a teenager, not a template",
              "Smart inbox filters for coach and .edu conversations only",
              "Public profile page you can share with any coach",
              "Follow-up reminders so you never drop the ball",
              "Tracks which coaches view your profile",
              "Free forever — no premium tier needed",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <CheckCircle className="w-5 h-5 text-[#ccff00] flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-sm text-slate-300">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, rgba(204,255,0,0.15) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter text-white mb-6"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Ready to Get
            <br />
            Recruited?
          </h2>
          <p className="text-slate-400 text-base md:text-lg mb-10 max-w-lg mx-auto">
            Join athletes who are taking control of their recruiting journey. Set up takes less than 2 minutes.
          </p>

          <button
            onClick={handleLogin}
            data-testid="final-cta-btn"
            className="inline-flex items-center justify-center gap-3 font-bold uppercase tracking-[0.12em] text-sm px-10 py-5 transition-all hover:-translate-y-[2px] mx-auto"
            style={{ backgroundColor: "#ccff00", color: "#0a0a0a", boxShadow: "0 0 40px rgba(204,255,0,0.25)" }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Start Free with Google
          </button>
          <p className="text-xs text-slate-600 mt-6">Free forever. No credit card. No catch.</p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.06] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            </div>
            <span className="text-white font-bold text-sm tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>RECRUITING HQ</span>
          </div>
          <p className="text-xs text-slate-600">Built for volleyball athletes and their families</p>
        </div>
      </footer>
    </div>
  );
}
