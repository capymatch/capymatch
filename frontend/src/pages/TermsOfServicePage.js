import { FileText, UserCheck, Info, KeyRound, Upload, Mail, Brain, CreditCard, Database, ShieldAlert, XCircle, AlertTriangle, Scale, Pencil, Landmark, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SECTIONS = [
  {
    id: "who",
    number: "1",
    title: "Who May Use CapyMatch",
    icon: UserCheck,
    content: (
      <>
        <p>CapyMatch is available to:</p>
        <ul>
          <li>Parents and guardians</li>
          <li>Student-athletes age 13 and older</li>
          <li>Other users authorized by a parent or guardian</li>
        </ul>
        <p>CapyMatch is not intended for children under 13. If we discover that a user under 13 has created an account, we will terminate it and delete associated data.</p>
        <p>By using CapyMatch, you represent that you meet these eligibility requirements.</p>
      </>
    ),
  },
  {
    id: "what",
    number: "2",
    title: "What CapyMatch Is — and Is Not",
    icon: Info,
    content: (
      <>
        <h4>What CapyMatch Is</h4>
        <p>CapyMatch is a recruiting support and decision-assistance platform designed to help families:</p>
        <ul>
          <li>Organize college recruiting information</li>
          <li>Track schools, communications, and timelines</li>
          <li>Understand NCAA recruiting rules and changes</li>
          <li>Manage outreach and follow-ups</li>
          <li>View data-driven insights and AI-assisted guidance</li>
        </ul>
        <h4>What CapyMatch Is NOT</h4>
        <p>CapyMatch does not:</p>
        <ul>
          <li>Act as a recruiting service or agent</li>
          <li>Independently contact college coaches</li>
          <li>Send communications without your explicit action</li>
          <li>Guarantee exposure, offers, scholarships, roster spots, or NIL opportunities</li>
          <li>Represent athletes to colleges</li>
          <li>Control or influence coach decisions</li>
        </ul>
        <p>All recruiting actions and decisions remain entirely yours.</p>
      </>
    ),
  },
  {
    id: "accounts",
    number: "3",
    title: "Accounts and Responsibilities",
    icon: KeyRound,
    content: (
      <>
        <p>When you create an account, you agree to:</p>
        <ul>
          <li>Provide accurate, current information</li>
          <li>Keep your login credentials secure</li>
          <li>Use the Services only for lawful purposes</li>
          <li>Be responsible for all activity under your account</li>
        </ul>
        <p>You may not share accounts or use the Services on behalf of others without authorization.</p>
      </>
    ),
  },
  {
    id: "content",
    number: "4",
    title: "Athlete Profiles and User Content",
    icon: Upload,
    content: (
      <>
        <p>You may upload or enter content including:</p>
        <ul>
          <li>Athlete information and academic data</li>
          <li>Videos, images, and profile details</li>
          <li>Communications sent through the platform</li>
        </ul>
        <p>You retain ownership of your content.</p>
        <p>By submitting content, you grant CapyMatch a limited, non-exclusive, royalty-free license to use it solely to provide and improve the Services.</p>
        <p>You are responsible for ensuring your content does not violate laws or third-party rights.</p>
      </>
    ),
  },
  {
    id: "gmail",
    number: "5",
    title: "Gmail and Third-Party Integrations",
    icon: Mail,
    content: (
      <>
        <p>CapyMatch offers optional integrations, including Gmail.</p>
        <p>By connecting Gmail, you authorize CapyMatch to:</p>
        <ul>
          <li>Read email metadata (headers only) for background recruiting detection</li>
          <li>Display full email content only when you explicitly open messages</li>
          <li>Send emails only when you initiate sending</li>
        </ul>
        <p>You may disconnect integrations at any time. CapyMatch is not responsible for outages or changes imposed by third-party services.</p>
      </>
    ),
  },
  {
    id: "ai",
    number: "6",
    title: "AI-Assisted Features",
    icon: Brain,
    content: (
      <>
        <p>CapyMatch includes AI-powered tools that may:</p>
        <ul>
          <li>Draft emails</li>
          <li>Suggest next steps</li>
          <li>Highlight patterns or gaps in recruiting activity</li>
        </ul>
        <p>AI outputs are informational only and are not advice, guarantees, or predictions.</p>
        <p>You remain responsible for reviewing and approving all actions and communications.</p>
      </>
    ),
  },
  {
    id: "billing",
    number: "7",
    title: "Subscription Plans and Billing",
    icon: CreditCard,
    content: (
      <>
        <p>CapyMatch may offer free and paid subscription plans.</p>
        <p>If you choose a paid plan:</p>
        <ul>
          <li>Fees are billed on a recurring basis</li>
          <li>You may cancel at any time; access continues through the billing period</li>
          <li>Fees are non-refundable unless required by law</li>
        </ul>
        <p>Pricing details are available on the CapyMatch website.</p>
      </>
    ),
  },
  {
    id: "data",
    number: "8",
    title: "Data Accuracy and Limitations",
    icon: Database,
    content: (
      <>
        <p>CapyMatch relies on:</p>
        <ul>
          <li>User-provided information</li>
          <li>Publicly available data</li>
          <li>Verified third-party sources</li>
          <li>Community contributions (when applicable)</li>
        </ul>
        <p>Data may be incomplete, outdated, or unavailable. CapyMatch labels unknown or missing data and does not fabricate insights.</p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    number: "9",
    title: "Acceptable Use",
    icon: ShieldAlert,
    content: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use CapyMatch for unlawful purposes</li>
          <li>Upload false, misleading, or defamatory content</li>
          <li>Attempt to reverse engineer or misuse the platform</li>
          <li>Interfere with security or system performance</li>
          <li>Harass, impersonate, or harm others</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these Terms.</p>
      </>
    ),
  },
  {
    id: "termination",
    number: "10",
    title: "Termination",
    icon: XCircle,
    content: (
      <>
        <p>You may stop using CapyMatch at any time.</p>
        <p>We may suspend or terminate access if:</p>
        <ul>
          <li>You violate these Terms</li>
          <li>Your use creates legal or security risk</li>
          <li>Required by law</li>
        </ul>
        <p>Data will be handled per our Privacy Policy.</p>
      </>
    ),
  },
  {
    id: "disclaimer",
    number: "11",
    title: "Disclaimer of Warranties",
    icon: AlertTriangle,
    content: (
      <>
        <p>CapyMatch is provided "as is" and "as available."</p>
        <p>We do not guarantee:</p>
        <ul>
          <li>Uninterrupted or error-free service</li>
          <li>Recruiting outcomes or offers</li>
          <li>That insights will result in commitments</li>
        </ul>
        <p>Use of CapyMatch is at your own risk.</p>
      </>
    ),
  },
  {
    id: "liability",
    number: "12",
    title: "Limitation of Liability",
    icon: Scale,
    content: (
      <>
        <p>To the fullest extent permitted by law, CapyMatch shall not be liable for:</p>
        <ul>
          <li>Recruiting decisions made by colleges or coaches</li>
          <li>Missed opportunities or outcomes</li>
          <li>Indirect, incidental, or consequential damages</li>
        </ul>
        <p>Our total liability shall not exceed the amount paid by you to CapyMatch in the 12 months prior to the claim.</p>
      </>
    ),
  },
  {
    id: "changes",
    number: "13",
    title: "Changes to Services or Terms",
    icon: Pencil,
    content: (
      <p>We may update the Services or these Terms from time to time. Material changes will be communicated via the app or email. Continued use constitutes acceptance.</p>
    ),
  },
  {
    id: "governing-law",
    number: "14",
    title: "Governing Law",
    icon: Landmark,
    content: (
      <p>These Terms are governed by the laws of the United States and the state in which CapyMatch is incorporated, without regard to conflict-of-law principles.</p>
    ),
  },
];

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--t-bg, #0f1729)" }} data-testid="terms-of-service-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--t-text-muted, #94a3b8)" }}
          data-testid="terms-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--t-text, #e2e8f0)" }}>
            CapyMatch Terms of Service
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--t-text-muted, #94a3b8)" }}>
            <span>Effective Date: February 2026</span>
            <span>Last Updated: February 2026</span>
          </div>
        </div>

        {/* Intro */}
        <div
          className="rounded-xl px-5 py-4 mb-8 text-sm leading-relaxed"
          style={{
            background: "rgba(26,138,128,0.08)",
            border: "1px solid rgba(26,138,128,0.15)",
            color: "var(--t-text-secondary, #cbd5e1)",
          }}
        >
          Welcome to CapyMatch. These Terms of Service ("Terms") govern your access to and use of the CapyMatch website, applications, and services (collectively, the "Services"), operated by CapyMatch ("CapyMatch," "we," "us," or "our").
          <br /><br />
          By creating an account or using the Services, you agree to these Terms. If you do not agree, do not use the Services.
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div
              key={section.id}
              className="rounded-xl border p-5 sm:p-6"
              style={{ backgroundColor: "var(--t-surface, #1e293b)", borderColor: "var(--t-border, #334155)" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(26,138,128,0.15)" }}
                >
                  <section.icon className="w-4 h-4" style={{ color: "#1a8a80" }} />
                </div>
                <h2 className="text-base font-bold" style={{ color: "var(--t-text, #e2e8f0)" }}>
                  {section.number}. {section.title}
                </h2>
              </div>
              <div
                className="terms-content text-sm leading-relaxed"
                style={{ color: "var(--t-text-secondary, #cbd5e1)" }}
              >
                {section.content}
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div
          className="rounded-xl border p-5 sm:p-6 mt-6"
          style={{ backgroundColor: "var(--t-surface, #1e293b)", borderColor: "var(--t-border, #334155)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(26,138,128,0.15)" }}>
              <Mail className="w-4 h-4" style={{ color: "#1a8a80" }} />
            </div>
            <h2 className="text-base font-bold" style={{ color: "var(--t-text, #e2e8f0)" }}>15. Contact Us</h2>
          </div>
          <div className="text-sm leading-relaxed space-y-1" style={{ color: "var(--t-text-secondary, #cbd5e1)" }}>
            <p>Email: <a href="mailto:support@capymatch.com" className="underline" style={{ color: "#1a8a80" }}>support@capymatch.com</a></p>
            <p>Location: 13848 Ash Stone Ct, Fishers, IN, 46040, United States</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pb-8 text-center text-xs" style={{ color: "var(--t-text-muted, #64748b)" }}>
          &copy; {new Date().getFullYear()} CapyMatch. All rights reserved.
        </div>
      </div>

      <style>{`
        .terms-content h4 {
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: var(--t-text, #e2e8f0);
        }
        .terms-content p {
          margin-bottom: 0.5rem;
        }
        .terms-content ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .terms-content li {
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}
