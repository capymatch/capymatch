from fastapi import APIRouter, Request
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


async def scan_inbound_for_user(user_id: str, tenant_id: str):
    """Scan a single user's Gmail inbox for inbound coach contacts from schools
    not yet in their pipeline. Returns count of new schools added."""
    from routes.gmail import get_gmail_credentials, get_gmail_service
    from routes.notifications import create_notification

    creds = await get_gmail_credentials(user_id)
    if not creds:
        return 0

    # Check if user has opted out of inbound scanning
    prefs = await db.privacy_preferences.find_one(
        {"tenant_id": tenant_id}, {"_id": 0}
    )
    if prefs and not prefs.get("inbound_email_scanning", True):
        return 0

    try:
        service = get_gmail_service(creds)
    except Exception as e:
        logger.error(f"Inbound scan: Gmail service error for {user_id}: {e}")
        return 0

    # 1. Build a domain -> university map from the Knowledge Base
    universities = await db.university_knowledge_base.find(
        {"domain": {"$ne": ""}},
        {"_id": 0, "university_name": 1, "domain": 1, "division": 1,
         "conference": 1, "coach_email": 1, "coordinator_email": 1}
    ).to_list(5000)

    domain_to_uni = {}
    for uni in universities:
        dom = (uni.get("domain") or "").strip().lower()
        if dom:
            domain_to_uni[dom] = uni

    if not domain_to_uni:
        return 0

    # 2. Get schools already in the user's pipeline
    existing_programs = await db.programs.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "university_name": 1}
    ).to_list(1000)
    existing_names = {p["university_name"].lower() for p in existing_programs}

    # 3. Get already-processed inbound contact message IDs to avoid duplicates
    processed = await db.inbound_contacts.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "gmail_message_id": 1}
    ).to_list(5000)
    processed_ids = {p["gmail_message_id"] for p in processed if p.get("gmail_message_id")}

    # 4. Scan Gmail for recent .edu emails (last 3 hours to overlap with 2hr schedule)
    try:
        results = service.users().messages().list(
            userId="me",
            q="newer_than:3h",
            maxResults=100
        ).execute()
    except Exception as e:
        logger.error(f"Inbound scan: Gmail list error for {user_id}: {e}")
        return 0

    messages = results.get("messages", [])
    if not messages:
        return 0

    # Get the user's own email to skip sent messages
    try:
        profile = service.users().getProfile(userId="me").execute()
        user_email = profile.get("emailAddress", "").lower()
    except Exception:
        user_email = ""

    new_count = 0

    for msg_ref in messages:
        msg_id = msg_ref["id"]
        if msg_id in processed_ids:
            continue

        try:
            msg = service.users().messages().get(
                userId="me", id=msg_id, format="metadata",
                metadataHeaders=["From", "Subject", "Date"]
            ).execute()
        except Exception:
            continue

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        from_raw = headers.get("From", "")
        subject = headers.get("Subject", "")

        # Extract email address from "Name <email>" format
        from_lower = from_raw.lower()
        if "<" in from_lower and ">" in from_lower:
            sender_email = from_lower.split("<")[1].split(">")[0].strip()
        else:
            sender_email = from_lower.strip()

        # Skip if this is from the user themselves
        if sender_email == user_email:
            continue

        # Extract domain from sender email
        if "@" not in sender_email:
            continue
        sender_domain = sender_email.split("@")[1]

        # Match domain against Knowledge Base
        matched_uni = None
        for kb_domain, uni in domain_to_uni.items():
            if sender_domain == kb_domain or sender_domain.endswith("." + kb_domain):
                matched_uni = uni
                break

        if not matched_uni:
            continue

        uni_name = matched_uni["university_name"]

        # Skip if school is already in pipeline
        if uni_name.lower() in existing_names:
            continue

        # Extract coach name from "From" header
        coach_name = "Unknown Coach"
        if "<" in from_raw:
            name_part = from_raw.split("<")[0].strip().strip('"').strip("'")
            if name_part:
                coach_name = name_part

        now_iso = datetime.now(timezone.utc).isoformat()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 5. Auto-add school to pipeline
        program_id = f"prog_{uuid.uuid4().hex[:12]}"
        program_doc = {
            "program_id": program_id,
            "tenant_id": tenant_id,
            "university_name": uni_name,
            "division": matched_uni.get("division", ""),
            "conference": matched_uni.get("conference", ""),
            "recruiting_status": "Active Communication",
            "reply_status": "Reply Received",
            "priority": "High",
            "is_active": True,
            "journey_stage": "in_conversation",
            "athlete_interest": 5,
            "school_interest": 7,
            "notes": f"Auto-added: Coach {coach_name} emailed you on {today}",
            "next_action": "Respond to the coach's email",
            "next_action_due": today,
            "created_at": now_iso,
            "added_via": "inbound_contact",
        }
        await db.programs.insert_one(program_doc)
        # Remove _id added by mongo
        program_doc.pop("_id", None)

        # Add to existing names so we don't re-add in the same scan
        existing_names.add(uni_name.lower())

        # 6. Auto-add coach
        coach_id = f"coach_{uuid.uuid4().hex[:12]}"
        coach_doc = {
            "coach_id": coach_id,
            "tenant_id": tenant_id,
            "program_id": program_id,
            "coach_name": coach_name,
            "email": sender_email,
            "role": "Unknown",
            "phone": "",
            "created_at": now_iso,
        }
        await db.coaches.insert_one(coach_doc)

        # 7. Log the email as an interaction
        interaction_id = f"ix_{uuid.uuid4().hex[:12]}"
        ix_doc = {
            "interaction_id": interaction_id,
            "tenant_id": tenant_id,
            "program_id": program_id,
            "type": "email_received",
            "notes": f"Inbound email from {coach_name}: \"{subject}\"",
            "outcome": "Positive",
            "date_time": now_iso,
            "created_at": now_iso,
        }
        await db.interactions.insert_one(ix_doc)

        # 8. Store inbound contact record (for dashboard celebration)
        contact_id = f"ibc_{uuid.uuid4().hex[:12]}"
        contact_doc = {
            "contact_id": contact_id,
            "tenant_id": tenant_id,
            "program_id": program_id,
            "university_name": uni_name,
            "coach_name": coach_name,
            "coach_email": sender_email,
            "email_subject": subject,
            "gmail_message_id": msg_id,
            "dismissed": False,
            "created_at": now_iso,
        }
        await db.inbound_contacts.insert_one(contact_doc)

        # 9. Create notification
        await create_notification(
            tenant_id=tenant_id,
            notif_type="inbound_coach_contact",
            title="A Coach Found You!",
            message=f"{coach_name} from {uni_name} just emailed you. We've added them to your board.",
            data={
                "program_id": program_id,
                "university_name": uni_name,
                "coach_name": coach_name,
                "contact_id": contact_id,
            }
        )

        logger.info(f"Inbound contact: Auto-added {uni_name} for tenant {tenant_id} (coach: {coach_name})")
        new_count += 1
        processed_ids.add(msg_id)

    return new_count


# ─── API Endpoints ───

@router.get("/inbound-contacts")
async def get_inbound_contacts(request: Request):
    """Get recent inbound coach contacts (undismissed) for dashboard celebration."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    contacts = await db.inbound_contacts.find(
        {"tenant_id": tenant_id, "dismissed": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    return {"contacts": contacts, "count": len(contacts)}


@router.post("/inbound-contacts/{contact_id}/dismiss")
async def dismiss_inbound_contact(contact_id: str, request: Request):
    """Dismiss an inbound contact celebration card."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    await db.inbound_contacts.update_one(
        {"contact_id": contact_id, "tenant_id": tenant_id},
        {"$set": {"dismissed": True}}
    )
    return {"ok": True}


@router.post("/inbound-contacts/scan-now")
async def trigger_inbound_scan(request: Request):
    """Manually trigger an inbound contact scan for the current user."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    new_count = await scan_inbound_for_user(user["user_id"], tenant_id)
    return {"new_schools_added": new_count, "message": f"Found {new_count} new inbound contact(s)"}



# ─── Sent Email Scanner ───

async def scan_sent_emails_for_user(user_id: str, tenant_id: str):
    """Scan a user's Gmail Sent folder for emails to known coaches that
    haven't been logged yet. Returns count of new interactions logged."""
    from routes.gmail import get_gmail_credentials, get_gmail_service

    creds = await get_gmail_credentials(user_id)
    if not creds:
        return 0

    try:
        service = get_gmail_service(creds)
    except Exception as e:
        logger.error(f"Sent scan: Gmail service error for {user_id}: {e}")
        return 0

    # 1. Get all coach emails for this tenant, mapped to program_id
    coaches = await db.coaches.find(
        {"tenant_id": tenant_id, "email": {"$ne": ""}},
        {"_id": 0, "email": 1, "program_id": 1, "coach_name": 1}
    ).to_list(5000)

    if not coaches:
        return 0

    coach_email_map = {}
    for c in coaches:
        email = (c.get("email") or "").strip().lower()
        if email:
            coach_email_map[email] = {
                "program_id": c["program_id"],
                "coach_name": c.get("coach_name", "Coach"),
            }

    if not coach_email_map:
        return 0

    # 2. Get program names for display
    program_ids = list({v["program_id"] for v in coach_email_map.values()})
    programs = await db.programs.find(
        {"program_id": {"$in": program_ids}, "tenant_id": tenant_id},
        {"_id": 0, "program_id": 1, "university_name": 1}
    ).to_list(1000)
    program_names = {p["program_id"]: p.get("university_name", "") for p in programs}

    # 3. Get already-logged sent email message IDs to avoid duplicates
    logged = await db.sent_email_log.find(
        {"tenant_id": tenant_id},
        {"_id": 0, "gmail_message_id": 1}
    ).to_list(10000)
    logged_ids = {l["gmail_message_id"] for l in logged if l.get("gmail_message_id")}

    # 4. Scan Sent folder for recent emails
    try:
        results = service.users().messages().list(
            userId="me",
            q="in:sent newer_than:3h",
            maxResults=100
        ).execute()
    except Exception as e:
        logger.error(f"Sent scan: Gmail list error for {user_id}: {e}")
        return 0

    messages = results.get("messages", [])
    if not messages:
        return 0

    new_count = 0

    for msg_ref in messages:
        msg_id = msg_ref["id"]
        if msg_id in logged_ids:
            continue

        try:
            msg = service.users().messages().get(
                userId="me", id=msg_id, format="metadata",
                metadataHeaders=["To", "Cc", "Subject", "Date"]
            ).execute()
        except Exception:
            continue

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        to_raw = headers.get("To", "").lower()
        cc_raw = headers.get("Cc", "").lower()
        subject = headers.get("Subject", "")
        all_recipients = to_raw + "," + cc_raw

        # Check if any known coach email is in To or Cc
        matched_coach = None
        for coach_email, coach_info in coach_email_map.items():
            if coach_email in all_recipients:
                matched_coach = (coach_email, coach_info)
                break

        if not matched_coach:
            continue

        coach_email, coach_info = matched_coach
        program_id = coach_info["program_id"]
        coach_name = coach_info["coach_name"]
        uni_name = program_names.get(program_id, "Unknown School")

        now_iso = datetime.now(timezone.utc).isoformat()

        # 5. Log as interaction
        interaction_id = f"ix_{uuid.uuid4().hex[:12]}"
        ix_doc = {
            "interaction_id": interaction_id,
            "tenant_id": tenant_id,
            "program_id": program_id,
            "type": "email_sent",
            "notes": f"Email to {coach_name}: \"{subject}\" (sent from inbox)",
            "outcome": "Neutral",
            "date_time": now_iso,
            "created_at": now_iso,
            "auto_logged": True,
        }
        await db.interactions.insert_one(ix_doc)

        # 6. Track that we've processed this message
        await db.sent_email_log.insert_one({
            "tenant_id": tenant_id,
            "gmail_message_id": msg_id,
            "program_id": program_id,
            "coach_email": coach_email,
            "subject": subject,
            "created_at": now_iso,
        })

        # 7. Update program status if it was "Not Contacted"
        await db.programs.update_one(
            {"program_id": program_id, "tenant_id": tenant_id, "recruiting_status": "Not Contacted"},
            {"$set": {
                "recruiting_status": "Contacted",
                "reply_status": "No Reply",
                "updated_at": now_iso,
            }}
        )

        logger.info(f"Sent scan: Logged email to {coach_name} at {uni_name} for tenant {tenant_id}")
        new_count += 1
        logged_ids.add(msg_id)

    return new_count


@router.post("/sent-emails/scan-now")
async def trigger_sent_scan(request: Request):
    """Manually trigger a sent email scan for the current user."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)

    new_count = await scan_sent_emails_for_user(user["user_id"], tenant_id)
    return {"emails_logged": new_count, "message": f"Logged {new_count} new sent email(s)"}
