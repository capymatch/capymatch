export const RECRUITING_STATUSES = [
  "Not Contacted",
  "Contacted",
  "No Response Yet",
  "Video Viewed",
  "Some Interest",
  "Active Conversation",
  "Offer / Commit Talk",
  "Not a Fit / Closed",
];

export const REPLY_STATUSES = ["No Reply", "Reply Received", "Awaiting Reply"];

export const PRIORITIES = ["Low", "Medium", "High", "Very High"];

export const DIVISIONS = ["D1", "D2", "D3", "NAIA", "JUCO"];

export const REGIONS = [
  "Atlantic", "East", "Great Lakes", "Midwest", "Mountain West",
  "Northeast", "Pacific", "South Central", "Southeast", "West",
];

export const SCHOLARSHIP_TYPES = [
  "Full Scholarship", "Partial Scholarship", "Academic Merit", "Walk-On", "No Scholarship",
];

export const NEXT_ACTIONS = [
  "Send Email", "Follow Up", "Send Video", "Schedule Visit",
  "Application", "Phone Call", "Other",
];

export const INTERACTION_TYPES = [
  "Email", "Phone Call", "Text", "Visit", "Camp",
  "Follow Up", "Video Sent", "Application", "Other",
];

export const INTERACTION_OUTCOMES = [
  "No Response", "Positive Response", "Negative Response",
  "Scheduled Follow-Up", "Information Received", "Offer Extended", "Other",
];

export const COACH_ROLES = [
  "Head Coach", "Assistant Coach", "Recruiting Coordinator", "Volunteer Assistant",
];

export const STATUS_GROUPS = [
  {
    key: "not_contacted",
    label: "Active - Not Contacted",
    statuses: ["Not Contacted"],
    color: "bg-red-900/60 border-red-800 text-red-200",
    badge: "bg-red-900 text-red-200",
    count_bg: "bg-red-900/40",
  },
  {
    key: "contacted",
    label: "Contacted - Awaiting Reply",
    statuses: ["Contacted", "No Response Yet", "Video Viewed"],
    color: "bg-green-900/60 border-green-800 text-green-200",
    badge: "bg-green-900 text-green-200",
    count_bg: "bg-green-900/40",
  },
  {
    key: "active",
    label: "Active Conversations",
    statuses: ["Some Interest", "Active Conversation"],
    color: "bg-blue-900/60 border-blue-800 text-blue-200",
    badge: "bg-blue-900 text-blue-200",
    count_bg: "bg-blue-900/40",
  },
  {
    key: "offers",
    label: "Offers / Serious Interest",
    statuses: ["Offer / Commit Talk"],
    color: "bg-amber-900/60 border-amber-800 text-amber-200",
    badge: "bg-amber-900 text-amber-200",
    count_bg: "bg-amber-900/40",
  },
  {
    key: "closed",
    label: "Closed / Archived",
    statuses: ["Not a Fit / Closed"],
    color: "bg-zinc-700/60 border-zinc-600 text-zinc-300",
    badge: "bg-zinc-700 text-zinc-300",
    count_bg: "bg-zinc-700/40",
  },
];

export const DIVISION_COLORS = {
  D1: "bg-emerald-500 text-white",
  D2: "bg-blue-500 text-white",
  D3: "bg-purple-500 text-white",
  NAIA: "bg-orange-500 text-white",
  JUCO: "bg-yellow-500 text-black",
};

export const PRIORITY_COLORS = {
  Low: "text-slate-400",
  Medium: "text-blue-400",
  High: "text-orange-400",
  "Very High": "text-red-400",
};
