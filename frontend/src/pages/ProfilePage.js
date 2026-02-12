import { useState, useEffect, useRef } from "react";
import { User, Loader2, Copy, ExternalLink, Camera, Check } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const photoRef = useRef(null);

  useEffect(() => {
    Promise.all([api.get("/athlete-profile"), api.get("/share-link")])
      .then(([profRes, linkRes]) => {
        setProfile(profRes.data);
        setShareLink(`${window.location.origin}/schedule/${linkRes.data.tenant_id}`);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateProfile = (key, val) => setProfile((p) => ({ ...p, [key]: val }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.put("/athlete-profile", profile);
      setProfile(res.data);
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) return toast.error("Photo must be under 5MB");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.post("/athlete-profile/photo", { photo_data: reader.result });
        updateProfile("photo_url", reader.result);
        toast.success("Photo uploaded");
      } catch {
        toast.error("Failed to upload photo");
      }
    };
    reader.readAsDataURL(file);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div data-testid="profile-page" className="max-w-3xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--t-text)" }}>Athlete Profile</h1>
        <p className="text-sm mt-1" style={{ color: "var(--t-text-muted)" }}>This info appears on your public schedule page and in outreach emails</p>
      </div>

      {/* Share Link */}
      {shareLink && (
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium" style={{ color: "var(--t-text)" }}>Public Schedule Link</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareLink}
              data-testid="share-link-input"
              className="flex-1 px-3 py-2 rounded-lg text-sm border"
              style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text-muted)" }}
            />
            <button
              data-testid="copy-share-link-btn"
              onClick={copyShareLink}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a href={shareLink} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg transition-colors" style={{ color: "var(--t-text-muted)" }}>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--t-text-muted)" }}>
            Share this link with coaches so they can see your event schedule and contact info
          </p>
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          {/* Athlete Info Card */}
          <div data-testid="profile-athlete-info-card" className="rounded-xl p-6 border space-y-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Athlete Info</h3>
            <div className="flex items-start gap-5">
              <div className="relative group">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt="Profile" className="w-24 h-24 rounded-xl object-cover border-2 border-purple-500/30" />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-purple-500/20 flex items-center justify-center border-2 border-dashed border-purple-500/30">
                    <User className="w-10 h-10 text-purple-500/50" />
                  </div>
                )}
                <button
                  onClick={() => photoRef.current?.click()}
                  data-testid="upload-photo-btn"
                  className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="flex-1 space-y-3">
                <FieldRow label="Full Name" testId="profile-name" value={profile.athlete_name} onChange={(v) => updateProfile("athlete_name", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Graduation Year" testId="profile-grad-year" value={profile.grad_year} onChange={(v) => updateProfile("grad_year", v)} placeholder="2027" />
                  <FieldRow label="Position" testId="profile-position" value={profile.position} onChange={(v) => updateProfile("position", v)} placeholder="Outside Hitter" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FieldRow label="Height" testId="profile-height" value={profile.height} onChange={(v) => updateProfile("height", v)} placeholder="6'00&quot;" />
              <FieldRow label="Weight (lbs)" testId="profile-weight" value={profile.weight} onChange={(v) => updateProfile("weight", v)} placeholder="138" />
              <FieldRow label="Jersey #" testId="profile-jersey" value={profile.jersey_number} onChange={(v) => updateProfile("jersey_number", v)} placeholder="14" />
            </div>
          </div>

          {/* Physical Info Card */}
          <div data-testid="profile-physical-info-card" className="rounded-xl p-6 border space-y-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Physical Info</h3>
            <div className="grid grid-cols-3 gap-3">
              <SelectRow label="Handed" testId="profile-handed" value={profile.handed} onChange={(v) => updateProfile("handed", v)} options={["", "Right", "Left", "Ambidextrous"]} />
              <FieldRow label="Standing Reach" testId="profile-standing-reach" value={profile.standing_reach} onChange={(v) => updateProfile("standing_reach", v)} placeholder="7'8&quot;" />
              <FieldRow label="Approach Touch" testId="profile-approach-touch" value={profile.approach_touch} onChange={(v) => updateProfile("approach_touch", v)} placeholder="9'10&quot;" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FieldRow label="Block Touch" testId="profile-block-touch" value={profile.block_touch} onChange={(v) => updateProfile("block_touch", v)} placeholder="9'4&quot;" />
              <FieldRow label="Wingspan" testId="profile-wingspan" value={profile.wingspan} onChange={(v) => updateProfile("wingspan", v)} placeholder="6'2&quot;" />
              <FieldRow label="GPA" testId="profile-gpa" value={profile.gpa} onChange={(v) => updateProfile("gpa", v)} placeholder="3.8" />
            </div>
          </div>

          {/* Team & Location Card */}
          <div data-testid="profile-team-location-card" className="rounded-xl p-6 border space-y-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Team & Location</h3>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Club Team" testId="profile-club" value={profile.club_team} onChange={(v) => updateProfile("club_team", v)} placeholder="A5 Volleyball" />
              <FieldRow label="High School" testId="profile-hs" value={profile.high_school} onChange={(v) => updateProfile("high_school", v)} placeholder="Lincoln High" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="City" testId="profile-city" value={profile.city} onChange={(v) => updateProfile("city", v)} placeholder="Austin" />
              <FieldRow label="State" testId="profile-state" value={profile.state} onChange={(v) => updateProfile("state", v)} placeholder="TX" />
            </div>
          </div>

          {/* Media & Bio Card */}
          <div data-testid="profile-media-bio-card" className="rounded-xl p-6 border space-y-4" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Media & Bio</h3>
            <FieldRow label="Highlights Video Link" testId="profile-video" value={profile.video_link} onChange={(v) => updateProfile("video_link", v)} placeholder="https://youtube.com/..." />
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>Bio</label>
              <textarea
                data-testid="profile-bio"
                value={profile.bio || ""}
                onChange={(e) => updateProfile("bio", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50 resize-none"
                style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
                placeholder="Tell coaches about yourself..."
              />
            </div>
          </div>

          {/* Contact Info Card */}
          <div data-testid="profile-contact-card" className="rounded-xl p-6 border space-y-5" style={{ backgroundColor: "var(--t-surface)", borderColor: "var(--t-border)" }}>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Athlete Contact</h3>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Email" testId="profile-email" value={profile.contact_email} onChange={(v) => updateProfile("contact_email", v)} placeholder="clara@email.com" />
                <FieldRow label="Phone" testId="profile-phone" value={profile.contact_phone} onChange={(v) => updateProfile("contact_phone", v)} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="pt-4 border-t space-y-4" style={{ borderColor: "var(--t-border)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--t-text)" }}>Club Coach</h3>
              <FieldRow label="Name" testId="profile-parent-name" value={profile.parent_name} onChange={(v) => updateProfile("parent_name", v)} placeholder="Coach Name" />
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Email" testId="profile-parent-email" value={profile.parent_email} onChange={(v) => updateProfile("parent_email", v)} placeholder="coach@club.com" />
                <FieldRow label="Phone" testId="profile-parent-phone" value={profile.parent_phone} onChange={(v) => updateProfile("parent_phone", v)} placeholder="(555) 987-6543" />
              </div>
            </div>
          </div>

          {/* Save */}
          <div>
            <button
              data-testid="save-profile-btn"
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value, onChange, placeholder, testId }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>{label}</label>
      <input
        data-testid={testId}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-purple-500/50"
        style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
      />
    </div>
  );
}

function SelectRow({ label, value, onChange, options, testId }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--t-text-muted)" }}>{label}</label>
      <select
        data-testid={testId}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
        style={{ backgroundColor: "var(--t-input-bg)", borderColor: "var(--t-border)", color: "var(--t-text)" }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt || "Select..."}</option>
        ))}
      </select>
    </div>
  );
}
