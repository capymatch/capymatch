import { Shield, Lock, Eye, Mail, Brain, Share2, Database, Clock, UserCheck, MapPin, FileText, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SECTIONS = [
  {
    id: "who",
    number: "1",
    title: "Who This Policy Applies To",
    icon: UserCheck,
    content: (
      <>
        <p>This Privacy Policy applies to:</p>
        <ul>
          <li>Parents and guardians</li>
          <li>Student-athletes age 13 and older</li>
          <li>Other users who create or access a CapyMatch account</li>
        </ul>
        <p>CapyMatch is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have done so, we will promptly delete the information.</p>
      </>
    ),
  },
  {
    id: "collect",
    number: "2",
    title: "What Information We Collect",
    icon: Eye,
    content: (
      <>
        <h4>A. Information You Provide Directly</h4>
        <p>When you create an account or use the Services, you may provide:</p>
        <ul>
          <li>Name and email address</li>
          <li>Athlete profile information (academics, sport details, graduation year, videos, achievements)</li>
          <li>Recruiting preferences and priorities</li>
          <li>Communications you choose to send through the platform</li>
          <li>Support inquiries and feedback</li>
        </ul>
        <p>You control what information you provide.</p>
        <h4>B. Information Collected Automatically</h4>
        <p>When you use CapyMatch, we may automatically collect:</p>
        <ul>
          <li>Device and browser information</li>
          <li>IP address and approximate location</li>
          <li>Usage activity (pages viewed, features used)</li>
          <li>Dates and times of access</li>
        </ul>
        <p>This information helps us operate, secure, and improve the Services.</p>
        <h4>C. Cookies and Analytics</h4>
        <p>CapyMatch uses cookies and similar technologies to:</p>
        <ul>
          <li>Maintain login sessions</li>
          <li>Understand usage patterns</li>
          <li>Improve performance and usability</li>
        </ul>
        <p>You can manage cookie preferences through your browser settings.</p>
      </>
    ),
  },
  {
    id: "gmail",
    number: "3",
    title: "Gmail / Google Integration (Read + Send)",
    icon: Mail,
    content: (
      <>
        <p>CapyMatch offers an optional Gmail integration to help families manage recruiting communication in one place. Gmail access is enabled only if you explicitly connect your account.</p>
        <h4>A. Gmail Read Access (Inbound)</h4>
        <p>CapyMatch accesses Gmail in two distinct ways:</p>
        <h5>1. Background detection — headers only</h5>
        <p>To keep recruiting timelines accurate, CapyMatch runs limited background checks on connected Gmail accounts. During these background processes, CapyMatch:</p>
        <ul>
          <li>Uses Gmail's metadata-only format</li>
          <li>Reads email headers only (From, To, Cc, Subject, Date)</li>
          <li>Does NOT read email body content</li>
        </ul>
        <p>These background checks are used solely to:</p>
        <ul>
          <li>Detect replies from college coaches</li>
          <li>Identify new inbound coach contacts</li>
          <li>Log recruiting interactions automatically to your Journey timeline</li>
        </ul>
        <p className="font-semibold">Email body content is never accessed during background scans.</p>
        <h5>2. User-initiated email viewing — full content</h5>
        <p>Full email content (message body and attachments) is accessed only when you explicitly take action, such as:</p>
        <ul>
          <li>Clicking to open an email</li>
          <li>Viewing an email thread in the Inbox</li>
        </ul>
        <p>Full content is retrieved only to display it to you inside the app.</p>
        <h4>B. Gmail Send Access (Outbound)</h4>
        <p>If you choose to send emails through CapyMatch:</p>
        <ul>
          <li>Emails are sent directly from your connected Gmail account</li>
          <li>Messages are sent only when you compose and click "Send"</li>
          <li>CapyMatch does not send emails automatically</li>
        </ul>
        <h4>C. What CapyMatch Does NOT Do with Gmail Data</h4>
        <p>CapyMatch does not:</p>
        <ul>
          <li>Read email bodies during background scans</li>
          <li>Sell Gmail data</li>
          <li>Use Gmail data for advertising or marketing</li>
          <li>Allow human review of Gmail data unless you explicitly request support</li>
          <li>Use Google user data to train generalized or third-party AI models</li>
        </ul>
        <h4>D. Google API Limited Use Compliance</h4>
        <p>CapyMatch's use of information received from Google Workspace APIs complies with the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements.</p>
        <p>Google user data is used only to provide CapyMatch's recruiting features and for no other purpose.</p>
        <h4>E. Gmail Authorization & Security</h4>
        <ul>
          <li>OAuth access and refresh tokens are encrypted at rest and stored securely</li>
          <li>Gmail passwords are never collected or stored</li>
          <li>Users retain full control and may revoke access at any time</li>
        </ul>
        <p>Disconnecting Gmail removes all stored tokens and immediately stops all Gmail-related processing within CapyMatch. Users may also revoke access directly from their Google Account security settings.</p>
      </>
    ),
  },
  {
    id: "use",
    number: "4",
    title: "How We Use Your Information",
    icon: Database,
    content: (
      <>
        <p>We use information to:</p>
        <ul>
          <li>Provide and operate the Services</li>
          <li>Build recruiting dashboards and timelines</li>
          <li>Organize recruiting communications</li>
          <li>Improve product performance and reliability</li>
          <li>Respond to support requests</li>
          <li>Communicate important service updates</li>
        </ul>
        <p>CapyMatch does not promise scholarships, recruiting outcomes, or coach responses.</p>
      </>
    ),
  },
  {
    id: "ai",
    number: "5",
    title: "AI Features and Data Use",
    icon: Brain,
    content: (
      <>
        <p>CapyMatch includes optional AI-assisted features.</p>
        <p>AI in CapyMatch:</p>
        <ul>
          <li>Uses only your data and verified sources</li>
          <li>Clearly identifies missing or unknown information</li>
          <li>Does not invent facts or make guarantees</li>
        </ul>
        <p>We do not use personal data to train public or generalized AI models.</p>
      </>
    ),
  },
  {
    id: "sharing",
    number: "6",
    title: "Data Sharing",
    icon: Share2,
    content: (
      <>
        <p>CapyMatch does not sell or rent personal data.</p>
        <p>We may share information only with:</p>
        <ul>
          <li>Service providers operating under strict confidentiality</li>
          <li>Legal or regulatory authorities when required by law</li>
          <li>Successor entities in the event of a business transaction</li>
        </ul>
        <p>All sharing is limited to what is necessary to provide the Services.</p>
      </>
    ),
  },
  {
    id: "security",
    number: "7",
    title: "Data Security",
    icon: Lock,
    content: (
      <p>We use reasonable administrative, technical, and organizational safeguards to protect your information. No system can be guaranteed 100% secure, but we continuously work to protect your data.</p>
    ),
  },
  {
    id: "retention",
    number: "8",
    title: "Data Retention",
    icon: Clock,
    content: (
      <>
        <p>We retain personal information only as long as necessary to:</p>
        <ul>
          <li>Provide the Services</li>
          <li>Comply with legal obligations</li>
          <li>Resolve disputes</li>
          <li>Enforce agreements</li>
        </ul>
        <p>You may request account deletion at any time.</p>
      </>
    ),
  },
  {
    id: "rights",
    number: "9",
    title: "Your Rights and Choices",
    icon: Shield,
    content: (
      <>
        <p>You may:</p>
        <ul>
          <li>Access and update your account information</li>
          <li>Disconnect Gmail at any time</li>
          <li>Request account deletion</li>
          <li>Opt out of non-essential communications</li>
        </ul>
        <p>Email: <a href="mailto:support@capymatch.com" className="underline" style={{ color: "#1a8a80" }}>support@capymatch.com</a></p>
      </>
    ),
  },
  {
    id: "california",
    number: "10",
    title: "California Privacy Rights",
    icon: MapPin,
    content: (
      <p>California residents have rights under the California Consumer Privacy Act (CCPA), including the right to access and delete personal information. CapyMatch does not sell personal information.</p>
    ),
  },
  {
    id: "changes",
    number: "11",
    title: "Changes to This Policy",
    icon: FileText,
    content: (
      <p>We may update this Privacy Policy from time to time. If we do, we will notify you through the app or by email. Continued use means acceptance of the updated policy.</p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--t-bg, #0f1729)" }} data-testid="privacy-policy-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 text-sm transition-colors hover:opacity-80"
          style={{ color: "var(--t-text-muted, #94a3b8)" }}
          data-testid="privacy-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--t-text, #e2e8f0)" }}>
            CapyMatch Privacy Policy
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
          CapyMatch ("CapyMatch," "we," "us," or "our") values your trust and is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share information when you use our website, applications, and services (collectively, the "Services").
          <br /><br />
          By accessing or using CapyMatch, you agree to the practices described in this Privacy Policy.
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
                className="privacy-content text-sm leading-relaxed"
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
            <h2 className="text-base font-bold" style={{ color: "var(--t-text, #e2e8f0)" }}>12. Contact Us</h2>
          </div>
          <div className="text-sm leading-relaxed space-y-1" style={{ color: "var(--t-text-secondary, #cbd5e1)" }}>
            <p>Email: <a href="mailto:support@capymatch.com" className="underline" style={{ color: "#1a8a80" }}>support@capymatch.com</a></p>
            <p>Location: 13848 Ash Stone Ct, Fishers, IN, 46040</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pb-8 text-center text-xs" style={{ color: "var(--t-text-muted, #64748b)" }}>
          &copy; {new Date().getFullYear()} CapyMatch. All rights reserved.
        </div>
      </div>

      <style>{`
        .privacy-content h4 {
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: var(--t-text, #e2e8f0);
        }
        .privacy-content h5 {
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.35rem;
          color: var(--t-text, #e2e8f0);
          font-size: 0.8125rem;
        }
        .privacy-content p {
          margin-bottom: 0.5rem;
        }
        .privacy-content ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .privacy-content li {
          margin-bottom: 0.25rem;
        }
        .privacy-content strong {
          color: var(--t-text, #e2e8f0);
        }
      `}</style>
    </div>
  );
}
