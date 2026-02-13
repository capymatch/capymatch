import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { 
  ArrowLeft, Send, Mail, Phone, Calendar, MapPin, Star, 
  MessageSquare, Video, Users, Sparkles, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

const EVENT_ICONS = {
  email_sent: { icon: Send, color: "text-blue-500", bg: "bg-blue-100" },
  email_received: { icon: Mail, color: "text-green-500", bg: "bg-green-100" },
  phone_call: { icon: Phone, color: "text-purple-500", bg: "bg-purple-100" },
  video_call: { icon: Video, color: "text-cyan-500", bg: "bg-cyan-100" },
  camp: { icon: Calendar, color: "text-orange-500", bg: "bg-orange-100" },
  visit: { icon: MapPin, color: "text-pink-500", bg: "bg-pink-100" },
  showcase: { icon: Star, color: "text-yellow-500", bg: "bg-yellow-100" },
  meeting: { icon: Users, color: "text-indigo-500", bg: "bg-indigo-100" },
  interaction: { icon: MessageSquare, color: "text-gray-500", bg: "bg-gray-100" },
};

function TimelineEvent({ event }) {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_ICONS[event.event_type] || EVENT_ICONS.interaction;
  const Icon = config.icon;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      weekday: "short",
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  const hasContent = event.content && event.content.length > 100;

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-transparent" />
      
      {/* Icon */}
      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>
              {event.title}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--t-text-muted)" }}>
              {formatDate(event.date)}
              {event.coach_name && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium">
                  {event.coach_name}
                </span>
              )}
            </p>
          </div>
        </div>

        {event.content && (
          <div 
            className="mt-2 p-3 rounded-lg border text-sm leading-relaxed"
            style={{ 
              backgroundColor: "var(--t-surface-alt)", 
              borderColor: "var(--t-border)",
              color: "var(--t-text-secondary)"
            }}
          >
            {hasContent && !expanded ? (
              <>
                <p className="line-clamp-3">{event.content}</p>
                <button 
                  onClick={() => setExpanded(true)}
                  className="flex items-center gap-1 mt-2 text-xs text-purple-500 hover:text-purple-600 font-medium"
                >
                  <ChevronDown className="w-3 h-3" /> Show more
                </button>
              </>
            ) : hasContent && expanded ? (
              <>
                <p className="whitespace-pre-wrap">{event.content}</p>
                <button 
                  onClick={() => setExpanded(false)}
                  className="flex items-center gap-1 mt-2 text-xs text-purple-500 hover:text-purple-600 font-medium"
                >
                  <ChevronUp className="w-3 h-3" /> Show less
                </button>
              </>
            ) : (
              <p>{event.content}</p>
            )}
          </div>
        )}

        {event.location && (
          <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "var(--t-text-muted)" }}>
            <MapPin className="w-3 h-3" /> {event.location}
          </p>
        )}
      </div>
    </div>
  );
}

function AISummaryCard({ programId, universityName, coachName }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateSummary = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/ai/journey-summary`, { 
        program_id: programId 
      });
      setSummary(res.data);
    } catch (err) {
      toast.error("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="rounded-xl border p-6"
      style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold" style={{ color: "var(--t-text)" }}>AI Journey Summary</h3>
          <p className="text-xs" style={{ color: "var(--t-text-muted)" }}>Powered by Claude</p>
        </div>
      </div>

      {!summary && !loading && (
        <div className="text-center py-6">
          <p className="text-sm mb-4" style={{ color: "var(--t-text-secondary)" }}>
            Generate an AI-powered summary of your recruiting journey with {universityName}
          </p>
          <Button 
            onClick={generateSummary}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="generate-summary-btn"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Summary
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <span className="ml-3 text-sm" style={{ color: "var(--t-text-secondary)" }}>
            Analyzing your journey...
          </span>
        </div>
      )}

      {summary && (
        <div className="space-y-4">
          {/* Relationship Summary */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--t-text-muted)" }}>
              Relationship Summary
            </h4>
            <p className="text-sm leading-relaxed" style={{ color: "var(--t-text-secondary)" }}>
              {summary.relationship_summary}
            </p>
          </div>

          {/* Key Highlights */}
          {summary.key_highlights && summary.key_highlights.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--t-text-muted)" }}>
                Key Highlights
              </h4>
              <ul className="space-y-1">
                {summary.key_highlights.map((highlight, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--t-text-secondary)" }}>
                    <span className="text-purple-500 mt-1">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Next Action */}
          <div className="pt-4 border-t" style={{ borderColor: "var(--t-border)" }}>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--t-text-muted)" }}>
              Suggested Next Action
            </h4>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                {summary.suggested_action}
              </p>
            </div>
            
            {summary.action_type === "email" && coachName && (
              <Button 
                onClick={() => navigate("/inbox", { state: { composeTo: coachName } })}
                className="mt-3 bg-purple-600 hover:bg-purple-700 text-white w-full"
                data-testid="compose-email-btn"
              >
                <Mail className="w-4 h-4 mr-2" />
                Compose Email to {coachName}
              </Button>
            )}
          </div>

          {/* Regenerate */}
          <button 
            onClick={generateSummary}
            className="text-xs text-purple-500 hover:text-purple-600 font-medium"
          >
            Regenerate summary
          </button>
        </div>
      )}
    </div>
  );
}

export default function RecruitingJourney() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progRes, journeyRes] = await Promise.all([
          api.get(`/programs/${programId}`),
          api.get(`/programs/${programId}/journey`)
        ]);
        setProgram(progRes.data);
        setTimeline(journeyRes.data.timeline || []);
      } catch (err) {
        toast.error("Failed to load journey data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="text-center py-24">
        <p style={{ color: "var(--t-text-muted)" }}>Program not found</p>
        <Button onClick={() => navigate("/pipeline")} className="mt-4">
          Back to Board
        </Button>
      </div>
    );
  }

  const primaryCoach = program.coaches?.find(c => c.role === "Head Coach") || program.coaches?.[0];

  return (
    <div data-testid="recruiting-journey" className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate("/pipeline")}
          className="p-2 rounded-lg hover:bg-[var(--t-surface-alt)] transition-colors"
          style={{ color: "var(--t-text-muted)" }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>
            {program.university_name}
          </h1>
          <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
            Recruiting Journey • {timeline.length} events
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <div 
            className="rounded-xl border p-6"
            style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--t-text)" }}>
              Timeline
            </h2>

            {timeline.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: "var(--t-text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--t-text-muted)" }}>
                  No interactions yet with {program.university_name}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--t-text-muted)" }}>
                  Start by sending an introduction email or adding the coach
                </p>
              </div>
            ) : (
              <div className="relative">
                {timeline.map((event, i) => (
                  <TimelineEvent key={event.id || i} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Summary Sidebar */}
        <div className="lg:col-span-1">
          <AISummaryCard 
            programId={programId}
            universityName={program.university_name}
            coachName={primaryCoach?.coach_name}
          />

          {/* Quick Stats */}
          <div 
            className="rounded-xl border p-4 mt-4"
            style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--t-text)" }}>Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--t-text-muted)" }}>Status</span>
                <span className="font-medium" style={{ color: "var(--t-text)" }}>{program.recruiting_status}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--t-text-muted)" }}>Reply Status</span>
                <span className="font-medium" style={{ color: "var(--t-text)" }}>{program.reply_status}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--t-text-muted)" }}>First Contact</span>
                <span className="font-medium" style={{ color: "var(--t-text)" }}>
                  {program.initial_contact_sent || "Not yet"}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--t-text-muted)" }}>Priority</span>
                <span className="font-medium" style={{ color: "var(--t-text)" }}>{program.priority}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
