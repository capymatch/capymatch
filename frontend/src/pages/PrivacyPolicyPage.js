import { Shield, Lock, Eye, Trash2, Download, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: Eye,
      title: "What We Collect",
      items: [
        "Your name, email, and phone number to create your account",
        "Athletic profile info (position, graduation year, GPA, test scores) to match you with schools",
        "Schools you're interested in and your recruiting activity (emails sent, interactions logged)",
        "If you connect Gmail: email metadata (sender, subject line) to detect coach replies \u2014 we never read email content",
      ],
    },
    {
      icon: Shield,
      title: "How We Protect It",
      items: [
        "Gmail credentials are encrypted at rest using industry-standard encryption",
        "Passwords are hashed with bcrypt \u2014 we can never see your password",
        "All data is transmitted over HTTPS (TLS encrypted)",
        "We never sell, share, or trade your personal information with third parties",
      ],
    },
    {
      icon: Mail,
      title: "Gmail Integration",
      items: [
        "Gmail access is optional \u2014 you can use the app without it",
        "We only read email headers (who sent it) to detect coach replies, not email content",
        "Emails are only sent when you explicitly compose and click Send",
        "You can enable/disable automatic inbound coach detection in Settings",
        "You can disconnect Gmail at any time in Settings",
      ],
    },
    {
      icon: Lock,
      title: "Your Rights",
      items: [
        "Download all your data anytime (Settings \u2192 Your Data & Privacy \u2192 Export Data)",
        "Delete your entire account and all associated data permanently",
        "Turn off any automated features (email scanning, notifications)",
        "Disconnect third-party integrations at any time",
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="privacy-policy-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: "var(--t-text-muted)" }} data-testid="privacy-back-btn">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--t-text)" }}>Privacy & Data Policy</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>How we handle your information — written in plain English</p>
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-xl px-5 py-4" style={{ background: "rgba(46,196,182,0.08)", border: "1px solid rgba(46,196,182,0.15)" }}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
          We built this app for student-athletes and their families. We know trust matters, especially when it involves your child's personal information.
          Here's exactly what we do \u2014 and don't do \u2014 with your data.
        </p>
      </div>

      {/* Sections */}
      {sections.map((section, i) => (
        <div key={i} className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(46,196,182,0.15)" }}>
              <section.icon className="w-4 h-4" style={{ color: "#2ec4b6" }} />
            </div>
            <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>{section.title}</h2>
          </div>
          <ul className="space-y-2.5">
            {section.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#2ec4b6" }} />
                <p className="text-sm leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>{item}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* For minors */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
            <Shield className="w-4 h-4" style={{ color: "#f59e0b" }} />
          </div>
          <h2 className="text-base font-bold" style={{ color: "var(--t-text)" }}>For Parents & Guardians</h2>
        </div>
        <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--t-text-secondary)" }}>
          We understand many athletes using this platform are under 18. We take extra care to:
        </p>
        <ul className="space-y-2.5">
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#f59e0b" }} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
              Only collect information necessary for the recruiting process
            </p>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#f59e0b" }} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
              Never share student data with advertisers or data brokers
            </p>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "#f59e0b" }} />
            <p className="text-sm leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
              Provide full account deletion — every piece of data is permanently removed
            </p>
          </li>
        </ul>
      </div>

      {/* Contact */}
      <div className="rounded-xl px-5 py-4 text-center" style={{ background: "var(--t-surface-alt)" }}>
        <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
          Questions about your data? Reach out to us anytime at{" "}
          <span className="font-semibold" style={{ color: "#2ec4b6" }}>support@recruitinghq.com</span>
        </p>
      </div>
    </div>
  );
}
