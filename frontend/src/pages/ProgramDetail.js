import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import {
  RECRUITING_STATUSES, REPLY_STATUSES, PRIORITIES, DIVISIONS, REGIONS,
  SCHOLARSHIP_TYPES, NEXT_ACTIONS, INTERACTION_TYPES, INTERACTION_OUTCOMES,
  COACH_ROLES, DIVISION_COLORS, PRIORITY_COLORS,
} from "../lib/constants";
import {
  ArrowLeft, Save, Trash2, Plus, User, Mail, Phone, MessageSquare, Calendar, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { toast } from "sonner";

function FieldSelect({ label, value, options, onChange, testId }) {
  return (
    <div>
      <Label className="text-slate-400 text-xs">{label}</Label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className="w-full bg-[#0f172a] border border-[#334155] text-white rounded-md px-3 py-2 mt-1 text-sm focus:border-blue-500 focus:outline-none"
      >
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function FieldInput({ label, value, onChange, type = "text", testId }) {
  return (
    <div>
      <Label className="text-slate-400 text-xs">{label}</Label>
      <Input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className="bg-[#0f172a] border-[#334155] text-white mt-1"
      />
    </div>
  );
}

export default function ProgramDetail() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  // Coach dialog
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachForm, setCoachForm] = useState({ coach_name: "", role: "Head Coach", email: "", phone: "", notes: "" });
  const [editingCoach, setEditingCoach] = useState(null);

  // Interaction dialog
  const [intOpen, setIntOpen] = useState(false);
  const [intForm, setIntForm] = useState({ type: "Email", outcome: "No Response", notes: "", message_copy: "", links: "", coach_email: "", date_time: "" });

  const fetchProgram = async () => {
    try {
      const res = await api.get(`/programs/${programId}`);
      setProgram(res.data);
      setCoaches(res.data.coaches || []);
      setInteractions(res.data.interactions || []);
      setForm(res.data);
    } catch {
      toast.error("Failed to load program");
      navigate("/board");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProgram(); }, [programId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      const fields = [
        "university_name", "division", "conference", "region", "website", "program_interest",
        "mascot", "recruiting_status", "reply_status", "priority", "initial_contact_sent",
        "last_follow_up", "follow_up_days", "next_action", "next_action_due", "scholarship_type",
        "roster_needs", "events_seen", "video_link", "coach_contract_expiration", "notes",
      ];
      fields.forEach((f) => {
        if (form[f] !== program[f]) updates[f] = form[f];
      });
      if (Object.keys(updates).length === 0) { toast.info("No changes"); setSaving(false); return; }
      await api.put(`/programs/${programId}`, updates);
      toast.success("Program updated");
      fetchProgram();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this program and all its data?")) return;
    try {
      await api.delete(`/programs/${programId}`);
      toast.success("Program deleted");
      navigate("/board");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleAddCoach = async () => {
    if (!coachForm.coach_name.trim()) { toast.error("Coach name required"); return; }
    try {
      if (editingCoach) {
        await api.put(`/coaches/${editingCoach.coach_id}`, coachForm);
        toast.success("Coach updated");
      } else {
        await api.post("/coaches", { ...coachForm, program_id: programId, university_name: program.university_name });
        toast.success("Coach added");
      }
      setCoachOpen(false);
      setCoachForm({ coach_name: "", role: "Head Coach", email: "", phone: "", notes: "" });
      setEditingCoach(null);
      fetchProgram();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const handleDeleteCoach = async (coachId) => {
    if (!window.confirm("Delete this coach?")) return;
    try {
      await api.delete(`/coaches/${coachId}`);
      toast.success("Coach deleted");
      fetchProgram();
    } catch {
      toast.error("Failed to delete coach");
    }
  };

  const handleAddInteraction = async () => {
    try {
      await api.post("/interactions", { ...intForm, program_id: programId, university_name: program.university_name });
      toast.success("Interaction recorded");
      setIntOpen(false);
      setIntForm({ type: "Email", outcome: "No Response", notes: "", message_copy: "", links: "", coach_email: "", date_time: "" });
      fetchProgram();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed");
    }
  };

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  if (loading) return <div className="text-slate-400 text-center py-12" data-testid="detail-loading">Loading...</div>;
  if (!program) return null;

  return (
    <div data-testid="program-detail" className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/board")} data-testid="back-to-board" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Board
          </Button>
          <h2 className="font-heading text-2xl font-bold text-white" data-testid="detail-title">{program.university_name}</h2>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${DIVISION_COLORS[program.division] || "bg-slate-600 text-white"}`}>
            {program.division}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving} data-testid="save-program" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete} data-testid="delete-program">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Program Fields */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg text-white">Program Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FieldInput label="University Name" value={form.university_name} onChange={(v) => setField("university_name", v)} testId="field-university-name" />
              <FieldSelect label="Division" value={form.division} options={DIVISIONS} onChange={(v) => setField("division", v)} testId="field-division" />
              <FieldInput label="Conference" value={form.conference} onChange={(v) => setField("conference", v)} testId="field-conference" />
              <FieldSelect label="Region" value={form.region} options={REGIONS} onChange={(v) => setField("region", v)} testId="field-region" />
              <FieldInput label="Website" value={form.website} onChange={(v) => setField("website", v)} testId="field-website" />
              <FieldInput label="Mascot" value={form.mascot} onChange={(v) => setField("mascot", v)} testId="field-mascot" />
              <FieldInput label="Program Interest" value={form.program_interest} onChange={(v) => setField("program_interest", v)} testId="field-program-interest" />
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg text-white">Recruiting Status</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FieldSelect label="Recruiting Status" value={form.recruiting_status} options={RECRUITING_STATUSES} onChange={(v) => setField("recruiting_status", v)} testId="field-recruiting-status" />
              <FieldSelect label="Reply Status" value={form.reply_status} options={REPLY_STATUSES} onChange={(v) => setField("reply_status", v)} testId="field-reply-status" />
              <FieldSelect label="Priority" value={form.priority} options={PRIORITIES} onChange={(v) => setField("priority", v)} testId="field-priority" />
              <FieldInput label="Initial Contact Sent" value={form.initial_contact_sent} onChange={(v) => setField("initial_contact_sent", v)} type="date" testId="field-initial-contact" />
              <FieldInput label="Last Follow-Up" value={form.last_follow_up} onChange={(v) => setField("last_follow_up", v)} type="date" testId="field-last-followup" />
              <FieldInput label="Follow-Up Days" value={form.follow_up_days} onChange={(v) => setField("follow_up_days", parseInt(v) || 14)} type="number" testId="field-followup-days" />
              <FieldSelect label="Next Action" value={form.next_action} options={NEXT_ACTIONS} onChange={(v) => setField("next_action", v)} testId="field-next-action" />
              <FieldInput label="Next Action Due" value={form.next_action_due} onChange={(v) => setField("next_action_due", v)} type="date" testId="field-next-action-due" />
              <FieldSelect label="Scholarship Type" value={form.scholarship_type} options={SCHOLARSHIP_TYPES} onChange={(v) => setField("scholarship_type", v)} testId="field-scholarship" />
            </CardContent>
          </Card>

          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-lg text-white">Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FieldInput label="Roster Needs" value={form.roster_needs} onChange={(v) => setField("roster_needs", v)} testId="field-roster-needs" />
              <FieldInput label="Events Seen" value={form.events_seen} onChange={(v) => setField("events_seen", v)} testId="field-events-seen" />
              <FieldInput label="Video Link" value={form.video_link} onChange={(v) => setField("video_link", v)} testId="field-video-link" />
              <FieldInput label="Coach Contract Expiration" value={form.coach_contract_expiration} onChange={(v) => setField("coach_contract_expiration", v)} type="date" testId="field-contract-exp" />
              <div className="col-span-2">
                <Label className="text-slate-400 text-xs">Notes</Label>
                <Textarea
                  value={form.notes || ""}
                  onChange={(e) => setField("notes", e.target.value)}
                  data-testid="field-notes"
                  className="bg-[#0f172a] border-[#334155] text-white mt-1 min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Coaches + Interactions */}
        <div className="space-y-4">
          {/* Coaches */}
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg text-white">Coaches</CardTitle>
              <Dialog open={coachOpen} onOpenChange={(open) => { setCoachOpen(open); if (!open) { setEditingCoach(null); setCoachForm({ coach_name: "", role: "Head Coach", email: "", phone: "", notes: "" }); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="add-coach-btn" className="text-xs border-[#334155] text-slate-300 hover:bg-[#334155] h-7">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1e293b] border-[#334155] text-white">
                  <DialogHeader>
                    <DialogTitle className="font-heading">{editingCoach ? "Edit Coach" : "Add Coach"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <FieldInput label="Name *" value={coachForm.coach_name} onChange={(v) => setCoachForm({ ...coachForm, coach_name: v })} testId="coach-name-input" />
                    <FieldSelect label="Role" value={coachForm.role} options={COACH_ROLES} onChange={(v) => setCoachForm({ ...coachForm, role: v })} testId="coach-role-input" />
                    <FieldInput label="Email" value={coachForm.email} onChange={(v) => setCoachForm({ ...coachForm, email: v })} testId="coach-email-input" />
                    <FieldInput label="Phone" value={coachForm.phone} onChange={(v) => setCoachForm({ ...coachForm, phone: v })} testId="coach-phone-input" />
                    <Button onClick={handleAddCoach} data-testid="submit-coach" className="w-full bg-blue-600 hover:bg-blue-700">
                      {editingCoach ? "Update" : "Add"} Coach
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {coaches.length === 0 ? (
                <p className="text-slate-500 text-sm py-2">No coaches yet</p>
              ) : (
                <div className="space-y-2">
                  {coaches.map((c) => (
                    <div key={c.coach_id} className="p-2 rounded-lg bg-[#0f172a] border border-[#334155]" data-testid={`coach-${c.coach_id}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" /> {c.coach_name}
                          </p>
                          <p className="text-slate-400 text-xs">{c.role}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditingCoach(c); setCoachForm({ coach_name: c.coach_name, role: c.role, email: c.email, phone: c.phone, notes: c.notes }); setCoachOpen(true); }}
                            data-testid={`edit-coach-${c.coach_id}`}
                            className="text-slate-500 hover:text-blue-400 text-xs px-1"
                          >Edit</button>
                          <button
                            onClick={() => handleDeleteCoach(c.coach_id)}
                            data-testid={`delete-coach-${c.coach_id}`}
                            className="text-slate-500 hover:text-red-400 text-xs px-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {c.email && <p className="text-blue-400 text-xs flex items-center gap-1 mt-1"><Mail className="w-3 h-3" />{c.email}</p>}
                      {c.phone && <p className="text-slate-400 text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Interactions */}
          <Card className="bg-[#1e293b] border-[#334155]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="font-heading text-lg text-white">Interactions</CardTitle>
              <Dialog open={intOpen} onOpenChange={setIntOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="add-interaction-btn" className="text-xs border-[#334155] text-slate-300 hover:bg-[#334155] h-7">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1e293b] border-[#334155] text-white">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Add Interaction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <FieldSelect label="Type" value={intForm.type} options={INTERACTION_TYPES} onChange={(v) => setIntForm({ ...intForm, type: v })} testId="int-type-input" />
                    <FieldSelect label="Outcome" value={intForm.outcome} options={INTERACTION_OUTCOMES} onChange={(v) => setIntForm({ ...intForm, outcome: v })} testId="int-outcome-input" />
                    <FieldInput label="Date/Time" value={intForm.date_time} onChange={(v) => setIntForm({ ...intForm, date_time: v })} type="datetime-local" testId="int-datetime-input" />
                    <FieldInput label="Coach Email" value={intForm.coach_email} onChange={(v) => setIntForm({ ...intForm, coach_email: v })} testId="int-coach-email-input" />
                    <div>
                      <Label className="text-slate-400 text-xs">Notes</Label>
                      <Textarea
                        value={intForm.notes}
                        onChange={(e) => setIntForm({ ...intForm, notes: e.target.value })}
                        data-testid="int-notes-input"
                        className="bg-[#0f172a] border-[#334155] text-white mt-1"
                      />
                    </div>
                    <Button onClick={handleAddInteraction} data-testid="submit-interaction" className="w-full bg-blue-600 hover:bg-blue-700">
                      Add Interaction
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {interactions.length === 0 ? (
                <p className="text-slate-500 text-sm py-2">No interactions yet</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {interactions.map((int) => (
                    <div key={int.interaction_id} className="p-2 rounded-lg bg-[#0f172a] border border-[#334155]" data-testid={`interaction-${int.interaction_id}`}>
                      <div className="flex items-center justify-between">
                        <Badge className="bg-blue-900 text-blue-200 text-[10px]">{int.type}</Badge>
                        <span className="text-slate-500 text-[10px]">
                          {int.date_time ? new Date(int.date_time).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs mt-1">{int.outcome}</p>
                      {int.notes && <p className="text-slate-500 text-xs mt-0.5">{int.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
