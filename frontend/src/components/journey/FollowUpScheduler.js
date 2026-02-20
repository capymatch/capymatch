import { useState } from "react";
import { Clock, X, Loader2 } from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../ui/button";

export function FollowUpScheduler({ program, onSaved, onCancel }) {
  const [date, setDate] = useState(program.next_action_due || "");
  const [action, setAction] = useState(program.next_action || "");
  const [saving, setSaving] = useState(false);
  const inputCls = "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-1 focus:ring-teal-600 transition-colors";
  const inputStyle = { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" };
  const save = async () => {
    setSaving(true);
    try { await api.put(`/programs/${program.program_id}`, { next_action_due: date, next_action: action }); toast.success("Follow-up scheduled"); onSaved(); }
    catch { toast.error("Failed to save"); } finally { setSaving(false); }
  };

  // When rendered inline (no onCancel), show compact form
  if (!onCancel) {
    return (
      <div className="space-y-2" data-testid="followup-inline">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="followup-date-input" />
        <input placeholder="e.g. Send follow-up email" value={action} onChange={e => setAction(e.target.value)} className={inputCls} style={inputStyle} data-testid="followup-action-input" />
        <Button onClick={save} disabled={saving} size="sm"
          className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 w-full" data-testid="save-followup-btn">
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Clock className="w-3 h-3 mr-1" />}Set Reminder
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }} data-testid="followup-overlay">
      <div className="w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        style={{ background: "#161b25", border: "1px solid rgba(46, 196, 182, 0.15)", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(46,196,182,0.08)" }}
        data-testid="followup-scheduler">
        <div className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2"><Clock className="w-4 h-4 text-teal-600" />Schedule Follow-up</h2>
            <button onClick={onCancel} className="p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="followup-close-btn"><X className="w-4 h-4 text-white/40" /></button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} style={{...inputStyle, colorScheme: "dark"}} data-testid="followup-date-input" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Next Action</label>
            <input placeholder="e.g. Send follow-up email" value={action} onChange={e => setAction(e.target.value)} className={inputCls} style={inputStyle} data-testid="followup-action-input" />
          </div>
        </div>
        <div className="p-4 flex items-center justify-between gap-3 flex-shrink-0" style={{ background: "rgba(15,18,25,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>Cancel</button>
          <Button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[13px] font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(46,196,182,0.4)]"
            style={{ background: "linear-gradient(135deg, #2ec4b6, #25a99e)" }} data-testid="save-followup-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}Set Reminder
          </Button>
        </div>
      </div>
    </div>
  );
}
