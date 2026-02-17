from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import get_user_subscription, enforce_feature
from models import ComposeEmail, ReplyEmail
import os
import uuid
import base64
import warnings
import logging
import email.mime.text
import email.mime.multipart
import email.mime.base

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gmail")


def _gmail_config():
    client_id = os.environ.get("GMAIL_CLIENT_ID")
    client_secret = os.environ.get("GMAIL_CLIENT_SECRET")
    redirect_uri = os.environ.get("GMAIL_REDIRECT_URI")
    config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    return client_id, client_secret, redirect_uri, config


GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.labels",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


async def get_gmail_credentials(user_id: str):
    token_doc = await db.gmail_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not token_doc:
        return None

    client_id, client_secret, _, _ = _gmail_config()
    creds = Credentials(
        token=token_doc["access_token"],
        refresh_token=token_doc.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
    )

    expires_at = token_doc.get("expires_at")
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= expires_at:
            try:
                creds.refresh(GoogleRequest())
                await db.gmail_tokens.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "access_token": creds.token,
                        "expires_at": creds.expiry.isoformat() if creds.expiry else None,
                    }},
                )
            except Exception as e:
                logger.error(f"Token refresh failed for {user_id}: {e}")
                await db.gmail_tokens.delete_one({"user_id": user_id})
                return None

    return creds


def get_gmail_service(creds):
    return build("gmail", "v1", credentials=creds)


# ─── OAuth Routes ───

@router.get("/connect")
async def gmail_connect(request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    # Gate Gmail behind Pro+
    subscription = await get_user_subscription(tenant_id)
    enforce_feature(subscription, "gmail_integration", "Gmail Integration", "pro")
    _, _, redirect_uri, client_config = _gmail_config()
    flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=redirect_uri)
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    await db.gmail_oauth_states.insert_one({
        "state": state,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"auth_url": auth_url}


@router.get("/callback")
async def gmail_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    frontend_url = os.environ.get("GMAIL_REDIRECT_URI", "").replace("/api/gmail/callback", "")

    if error:
        logger.error(f"Gmail OAuth error: {error}")
        return RedirectResponse(f"{frontend_url}/settings?gmail=error&reason={error}")

    if not code or not state:
        return RedirectResponse(f"{frontend_url}/settings?gmail=error&reason=missing_params")

    state_doc = await db.gmail_oauth_states.find_one({"state": state})
    if not state_doc:
        return RedirectResponse(f"{frontend_url}/settings?gmail=error&reason=invalid_state")

    user_id = state_doc["user_id"]
    await db.gmail_oauth_states.delete_one({"state": state})

    try:
        _, _, redirect_uri, client_config = _gmail_config()
        flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=redirect_uri)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            flow.fetch_token(code=code)

        creds = flow.credentials

        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        gmail_email = profile.get("emailAddress", "")

        token_doc = {
            "user_id": user_id,
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expires_at": creds.expiry.isoformat() if creds.expiry else None,
            "gmail_email": gmail_email,
            "connected_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.gmail_tokens.update_one(
            {"user_id": user_id},
            {"$set": token_doc},
            upsert=True,
        )

        logger.info(f"Gmail connected for user {user_id} ({gmail_email})")
        return RedirectResponse(f"{frontend_url}/settings?gmail=connected")

    except Exception as e:
        logger.error(f"Gmail callback error: {e}")
        return RedirectResponse(f"{frontend_url}/settings?gmail=error&reason=token_exchange_failed")


@router.get("/status")
async def gmail_status(request: Request):
    user = await get_current_user(request)
    token_doc = await db.gmail_tokens.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not token_doc:
        return {"connected": False}
    return {
        "connected": True,
        "gmail_email": token_doc.get("gmail_email", ""),
        "connected_at": token_doc.get("connected_at", ""),
    }


@router.post("/disconnect")
async def gmail_disconnect(request: Request):
    user = await get_current_user(request)
    await db.gmail_tokens.delete_one({"user_id": user["user_id"]})
    await db.gmail_emails.delete_many({"user_id": user["user_id"]})
    logger.info(f"Gmail disconnected for user {user['user_id']}")
    return {"ok": True}


# ─── Email Routes ───

@router.get("/emails")
async def list_emails(request: Request, page_token: Optional[str] = None, q: Optional[str] = None, max_results: int = 20):
    user = await get_current_user(request)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    tenant_id = await get_tenant_id(user)
    coaches = await db.coaches.find({"tenant_id": tenant_id, "email": {"$ne": ""}}, {"_id": 0, "email": 1}).to_list(500)
    coach_emails = [c["email"].strip().lower() for c in coaches if c.get("email", "").strip()]

    try:
        service = get_gmail_service(creds)
        params = {"userId": "me", "maxResults": max_results}
        if page_token:
            params["pageToken"] = page_token

        filter_parts = ["from:*.edu OR to:*.edu"]
        for em in coach_emails:
            filter_parts.append(em)
        recruit_query = "(" + " OR ".join(filter_parts) + ")"

        if q:
            params["q"] = f"{recruit_query} {q}"
        else:
            params["q"] = recruit_query

        results = service.users().messages().list(**params).execute()
        messages = results.get("messages", [])
        next_page_token = results.get("nextPageToken")

        coach_set = set(coach_emails)
        email_list = []
        for msg_ref in messages:
            msg = service.users().messages().get(
                userId="me", id=msg_ref["id"], format="metadata",
                metadataHeaders=["From", "To", "Subject", "Date", "Cc"],
            ).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            from_addr = headers.get("From", "").lower()
            to_addr = headers.get("To", "").lower()
            is_known = any(ce in from_addr or ce in to_addr for ce in coach_set) if coach_set else False
            email_list.append({
                "id": msg["id"],
                "thread_id": msg["threadId"],
                "snippet": msg.get("snippet", ""),
                "subject": headers.get("Subject", "(no subject)"),
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "cc": headers.get("Cc", ""),
                "date": headers.get("Date", ""),
                "internal_date": msg.get("internalDate", ""),
                "label_ids": msg.get("labelIds", []),
                "is_unread": "UNREAD" in msg.get("labelIds", []),
                "is_known_coach": is_known,
            })

        return {
            "emails": email_list,
            "next_page_token": next_page_token,
            "result_size_estimate": results.get("resultSizeEstimate", 0),
        }

    except Exception as e:
        logger.error(f"Error listing emails: {e}")
        if "invalid_grant" in str(e).lower() or "token" in str(e).lower():
            await db.gmail_tokens.delete_one({"user_id": user["user_id"]})
            raise HTTPException(status_code=403, detail="Gmail token expired. Please reconnect.")
        raise HTTPException(status_code=500, detail="Failed to fetch emails")


@router.get("/emails/{message_id}")
async def get_email(message_id: str, request: Request):
    user = await get_current_user(request)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    try:
        service = get_gmail_service(creds)
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
        body_html, body_text = _extract_body(msg.get("payload", {}))
        attachments = _extract_attachments(msg.get("payload", {}))

        if "UNREAD" in msg.get("labelIds", []):
            service.users().messages().modify(
                userId="me", id=message_id,
                body={"removeLabelIds": ["UNREAD"]},
            ).execute()

        return {
            "id": msg["id"],
            "thread_id": msg["threadId"],
            "subject": headers.get("Subject", "(no subject)"),
            "from": headers.get("From", ""),
            "to": headers.get("To", ""),
            "cc": headers.get("Cc", ""),
            "date": headers.get("Date", ""),
            "internal_date": msg.get("internalDate", ""),
            "label_ids": msg.get("labelIds", []),
            "body_html": body_html,
            "body_text": body_text,
            "attachments": attachments,
            "is_unread": False,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting email {message_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch email")


@router.get("/threads/{thread_id}")
async def get_thread(thread_id: str, request: Request):
    user = await get_current_user(request)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    try:
        service = get_gmail_service(creds)
        thread = service.users().threads().get(userId="me", id=thread_id, format="full").execute()

        messages = []
        for msg in thread.get("messages", []):
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            body_html, body_text = _extract_body(msg.get("payload", {}))
            attachments = _extract_attachments(msg.get("payload", {}))
            messages.append({
                "id": msg["id"],
                "thread_id": msg["threadId"],
                "subject": headers.get("Subject", "(no subject)"),
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "cc": headers.get("Cc", ""),
                "date": headers.get("Date", ""),
                "internal_date": msg.get("internalDate", ""),
                "label_ids": msg.get("labelIds", []),
                "body_html": body_html,
                "body_text": body_text,
                "attachments": attachments,
                "is_unread": "UNREAD" in msg.get("labelIds", []),
            })

        return {
            "thread_id": thread_id,
            "messages": messages,
            "subject": messages[0]["subject"] if messages else "",
        }

    except Exception as e:
        logger.error(f"Error getting thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch thread")


@router.post("/upload-attachment")
async def upload_attachment(request: Request):
    """Upload a file to be attached to an email. Returns a temp file ID."""
    from fastapi import UploadFile, File, Form
    import mimetypes

    user = await get_current_user(request)
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    max_size = 10 * 1024 * 1024  # 10MB
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    file_id = f"att_{uuid.uuid4().hex[:12]}"
    mime_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"

    await db.temp_attachments.insert_one({
        "file_id": file_id,
        "filename": file.filename,
        "content_type": mime_type,
        "data": base64.b64encode(content).decode(),
        "size": len(content),
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"file_id": file_id, "filename": file.filename, "size": len(content), "content_type": mime_type}


@router.post("/send")
async def send_email(data: ComposeEmail, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    try:
        service = get_gmail_service(creds)
        profile = service.users().getProfile(userId="me").execute()
        sender_email = profile.get("emailAddress", "")

        message = email.mime.multipart.MIMEMultipart()
        message["to"] = data.to
        message["from"] = sender_email
        message["subject"] = data.subject
        if data.cc:
            message["cc"] = data.cc
        if data.bcc:
            message["bcc"] = data.bcc

        msg_body = email.mime.text.MIMEText(data.body, "html")
        message.attach(msg_body)

        # Attach uploaded files
        if data.attachment_ids:
            for att_id in data.attachment_ids:
                att = await db.temp_attachments.find_one({"file_id": att_id, "user_id": user["user_id"]}, {"_id": 0})
                if att:
                    file_data = base64.b64decode(att["data"])
                    maintype, subtype = att["content_type"].split("/", 1) if "/" in att["content_type"] else ("application", "octet-stream")
                    mime_att = email.mime.base.MIMEBase(maintype, subtype)
                    mime_att.set_payload(file_data)
                    import email.encoders
                    email.encoders.encode_base64(mime_att)
                    mime_att.add_header("Content-Disposition", "attachment", filename=att["filename"])
                    message.attach(mime_att)
            # Clean up temp attachments
            await db.temp_attachments.delete_many({"file_id": {"$in": data.attachment_ids}, "user_id": user["user_id"]})

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()

        logger.info(f"Email sent by {user['user_id']} to {data.to}")
        
        # Auto-update program status when emailing a coach
        recipient_email = data.to.strip().lower()
        # Extract email from "Name <email>" format if present
        if "<" in recipient_email and ">" in recipient_email:
            recipient_email = recipient_email.split("<")[1].split(">")[0].strip()
        
        program_updated = None
        coach = await db.coaches.find_one(
            {"tenant_id": tenant_id, "email": {"$regex": f"^{recipient_email}$", "$options": "i"}},
            {"_id": 0, "program_id": 1}
        )
        
        if coach:
            program = await db.programs.find_one(
                {"program_id": coach["program_id"], "tenant_id": tenant_id},
                {"_id": 0, "recruiting_status": 1, "reply_status": 1, "university_name": 1}
            )
            if program:
                updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
                # Update to Contacted if not already past that stage
                if program.get("recruiting_status") in ["Researching", "", None]:
                    updates["recruiting_status"] = "Contacted"
                    updates["initial_contact_sent"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                # Update reply status to Awaiting Reply if currently No Reply or empty
                if program.get("reply_status") in ["No Reply", "", None]:
                    updates["reply_status"] = "Awaiting Reply"
                
                if len(updates) > 1:  # More than just updated_at
                    await db.programs.update_one(
                        {"program_id": coach["program_id"], "tenant_id": tenant_id},
                        {"$set": updates}
                    )
                    logger.info(f"Auto-updated program {coach['program_id']}: status=Contacted, reply=Awaiting Reply")
                    program_updated = {
                        "university_name": program.get("university_name", ""),
                        "new_status": "Contacted",
                        "new_reply_status": "Awaiting Reply"
                    }
                
                # Auto-set 14-day follow-up reminder after sending email to a coach
                follow_up_date = (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")
                await db.programs.update_one(
                    {"program_id": coach["program_id"], "tenant_id": tenant_id},
                    {"$set": {"next_action_due": follow_up_date, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                logger.info(f"Auto-set 14-day follow-up for {coach['program_id']} → {follow_up_date}")
        
        return {
            "id": sent["id"], 
            "thread_id": sent.get("threadId", ""), 
            "status": "sent",
            "program_updated": program_updated
        }

    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")


@router.post("/reply")
async def reply_email(data: ReplyEmail, request: Request):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    try:
        service = get_gmail_service(creds)

        original = service.users().messages().get(userId="me", id=data.message_id, format="metadata",
            metadataHeaders=["From", "To", "Subject", "Message-ID", "Cc"]).execute()
        orig_headers = {h["name"]: h["value"] for h in original.get("payload", {}).get("headers", [])}

        profile = service.users().getProfile(userId="me").execute()
        sender_email = profile.get("emailAddress", "")

        message = email.mime.multipart.MIMEMultipart()
        reply_to = orig_headers.get("From", "")
        message["to"] = reply_to
        if data.reply_all:
            all_to = set()
            for addr in (orig_headers.get("To", "") + "," + orig_headers.get("Cc", "")).split(","):
                addr = addr.strip()
                if addr and sender_email.lower() not in addr.lower():
                    all_to.add(addr)
            if reply_to in all_to:
                all_to.discard(reply_to)
            if all_to:
                message["cc"] = ", ".join(all_to)

        message["from"] = sender_email
        subject = orig_headers.get("Subject", "")
        if not subject.lower().startswith("re:"):
            subject = f"Re: {subject}"
        message["subject"] = subject

        message_id = orig_headers.get("Message-ID", "")
        if message_id:
            message["In-Reply-To"] = message_id
            message["References"] = message_id

        msg_body = email.mime.text.MIMEText(data.body, "html")
        message.attach(msg_body)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        sent = service.users().messages().send(
            userId="me", body={"raw": raw, "threadId": data.thread_id}
        ).execute()

        logger.info(f"Reply sent by {user['user_id']} in thread {data.thread_id}")
        
        # Auto-update program status when replying to a coach
        recipient_email = reply_to.strip().lower()
        if "<" in recipient_email and ">" in recipient_email:
            recipient_email = recipient_email.split("<")[1].split(">")[0].strip()
        
        program_updated = None
        coach = await db.coaches.find_one(
            {"tenant_id": tenant_id, "email": {"$regex": f"^{recipient_email}$", "$options": "i"}},
            {"_id": 0, "program_id": 1}
        )
        
        if coach:
            program = await db.programs.find_one(
                {"program_id": coach["program_id"], "tenant_id": tenant_id},
                {"_id": 0, "recruiting_status": 1, "reply_status": 1, "university_name": 1}
            )
            if program:
                updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
                if program.get("recruiting_status") in ["Researching", "", None]:
                    updates["recruiting_status"] = "Contacted"
                    updates["initial_contact_sent"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                if program.get("reply_status") in ["No Reply", "", None]:
                    updates["reply_status"] = "Awaiting Reply"
                
                if len(updates) > 1:
                    await db.programs.update_one(
                        {"program_id": coach["program_id"], "tenant_id": tenant_id},
                        {"$set": updates}
                    )
                    logger.info(f"Auto-updated program {coach['program_id']}: status=Contacted, reply=Awaiting Reply")
                    program_updated = {
                        "university_name": program.get("university_name", ""),
                        "new_status": "Contacted",
                        "new_reply_status": "Awaiting Reply"
                    }

                # Auto-set 14-day follow-up after replying to a coach
                follow_up_date = (datetime.now(timezone.utc) + timedelta(days=14)).strftime("%Y-%m-%d")
                await db.programs.update_one(
                    {"program_id": coach["program_id"], "tenant_id": tenant_id},
                    {"$set": {"next_action_due": follow_up_date, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                logger.info(f"Auto-set 14-day follow-up for {coach['program_id']} → {follow_up_date}")
        
        return {
            "id": sent["id"], 
            "thread_id": sent.get("threadId", ""), 
            "status": "sent",
            "program_updated": program_updated
        }

    except Exception as e:
        logger.error(f"Error replying to email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reply")


@router.post("/emails/{message_id}/toggle-read")
async def toggle_read(message_id: str, request: Request):
    user = await get_current_user(request)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    try:
        service = get_gmail_service(creds)
        body = await request.json()
        mark_read = body.get("mark_read", True)

        if mark_read:
            service.users().messages().modify(
                userId="me", id=message_id, body={"removeLabelIds": ["UNREAD"]}
            ).execute()
        else:
            service.users().messages().modify(
                userId="me", id=message_id, body={"addLabelIds": ["UNREAD"]}
            ).execute()

        return {"ok": True, "is_unread": not mark_read}

    except Exception as e:
        logger.error(f"Error toggling read: {e}")
        raise HTTPException(status_code=500, detail="Failed to update email")


@router.post("/check-replies")
async def check_replies_now(request: Request):
    """Manually trigger a check for coach replies and update program statuses"""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    creds = await get_gmail_credentials(user["user_id"])
    
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")
    
    try:
        # Get all coach emails for this tenant
        coaches = await db.coaches.find(
            {"tenant_id": tenant_id, "email": {"$ne": ""}},
            {"_id": 0, "email": 1, "program_id": 1}
        ).to_list(500)
        
        if not coaches:
            return {"updated_count": 0, "message": "No coaches found"}
        
        # Build a map of coach email -> program_id
        coach_email_to_program = {}
        for c in coaches:
            email_addr = c.get("email", "").strip().lower()
            if email_addr:
                coach_email_to_program[email_addr] = c["program_id"]
        
        if not coach_email_to_program:
            return {"updated_count": 0, "message": "No coach emails found"}
        
        # Get programs with "No Reply" status
        no_reply_programs = await db.programs.find(
            {"tenant_id": tenant_id, "reply_status": "No Reply"},
            {"_id": 0, "program_id": 1, "university_name": 1}
        ).to_list(500)
        
        no_reply_program_ids = {p["program_id"]: p.get("university_name", "") for p in no_reply_programs}
        
        if not no_reply_program_ids:
            return {"updated_count": 0, "message": "No programs with 'No Reply' status"}
        
        service = get_gmail_service(creds)
        
        # Search for emails from coach addresses
        coach_emails_list = list(coach_email_to_program.keys())
        from_queries = [f"from:{email}" for email in coach_emails_list[:20]]
        query = f"({' OR '.join(from_queries)})"
        
        results = service.users().messages().list(
            userId="me",
            q=query,
            maxResults=100
        ).execute()
        
        messages = results.get("messages", [])
        updated_programs = []
        
        for msg_ref in messages:
            msg = service.users().messages().get(
                userId="me",
                id=msg_ref["id"],
                format="metadata",
                metadataHeaders=["From"]
            ).execute()
            
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            from_addr = headers.get("From", "").lower()
            
            for coach_email, program_id in coach_email_to_program.items():
                if coach_email in from_addr and program_id in no_reply_program_ids:
                    result = await db.programs.update_one(
                        {"program_id": program_id, "tenant_id": tenant_id, "reply_status": "No Reply"},
                        {"$set": {
                            "reply_status": "Reply Received",
                            "priority": "Very High",
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    if result.modified_count > 0:
                        updated_programs.append({
                            "program_id": program_id,
                            "university_name": no_reply_program_ids[program_id],
                            "coach_email": coach_email
                        })
                        logger.info(f"Updated reply status for {no_reply_program_ids[program_id]} (coach: {coach_email})")
                    del no_reply_program_ids[program_id]
                    break
        
        return {
            "updated_count": len(updated_programs),
            "updated_programs": updated_programs,
            "message": f"Updated {len(updated_programs)} program(s) to 'Reply Received'"
        }
        
    except Exception as e:
        logger.error(f"Error checking replies: {e}")
        raise HTTPException(status_code=500, detail="Failed to check for replies")


# ─── Helpers ───

def _extract_body(payload):
    body_html = ""
    body_text = ""

    if payload.get("mimeType") == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            body_html = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif payload.get("mimeType") == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            body_text = base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    elif payload.get("mimeType", "").startswith("multipart"):
        for part in payload.get("parts", []):
            h, t = _extract_body(part)
            if h and not body_html:
                body_html = h
            if t and not body_text:
                body_text = t

    return body_html, body_text


def _extract_attachments(payload):
    attachments = []
    if payload.get("filename"):
        attachments.append({
            "filename": payload["filename"],
            "mime_type": payload.get("mimeType", ""),
            "size": payload.get("body", {}).get("size", 0),
            "attachment_id": payload.get("body", {}).get("attachmentId", ""),
        })
    for part in payload.get("parts", []):
        attachments.extend(_extract_attachments(part))
    return attachments
