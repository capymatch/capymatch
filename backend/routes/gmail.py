from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from typing import Optional
from datetime import datetime, timezone, timedelta
from collections import defaultdict
from database import db
from auth import get_current_user, get_tenant_id
from subscriptions import get_user_subscription, enforce_feature
from models import ComposeEmail, ReplyEmail
from encryption import encrypt_value, decrypt_value
import os
import uuid
import base64
import logging
import email.mime.text
import email.mime.multipart
import email.mime.base
import email.encoders

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gmail")


def _gmail_config(redirect_uri_override=None):
    client_id = os.environ.get("GMAIL_CLIENT_ID")
    client_secret = os.environ.get("GMAIL_CLIENT_SECRET")
    redirect_uri = redirect_uri_override or os.environ.get("GMAIL_REDIRECT_URI")
    config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    return client_id, client_secret, redirect_uri, config


def _get_redirect_uri(request: Request) -> str:
    """Derive the Gmail OAuth redirect URI from the incoming request host."""
    # Check origin/referer for the frontend domain
    origin = request.headers.get("origin") or request.headers.get("referer") or ""
    if "preview.emergentagent.com" in origin:
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        return f"{parsed.scheme}://{parsed.netloc}/api/gmail/callback"
    # For production, always use the configured redirect URI
    return os.environ.get("GMAIL_REDIRECT_URI")


GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


async def get_gmail_credentials(user_id: str):
    token_doc = await db.gmail_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not token_doc:
        return None

    client_id, client_secret, _, _ = _gmail_config()

    # Decrypt tokens if encrypted
    access_token = token_doc["access_token"]
    refresh_token = token_doc.get("refresh_token")
    if token_doc.get("encrypted"):
        access_token = decrypt_value(access_token)
        refresh_token = decrypt_value(refresh_token) if refresh_token else None

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
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
                        "access_token": encrypt_value(creds.token),
                        "expires_at": creds.expiry.isoformat() if creds.expiry else None,
                        "encrypted": True,
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
async def gmail_connect(request: Request, return_to: str = "/settings"):
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    # Gate Gmail behind Pro+
    subscription = await get_user_subscription(tenant_id)
    enforce_feature(subscription, "gmail_integration", "Gmail Integration", "pro")
    _, _, redirect_uri, client_config = _gmail_config(_get_redirect_uri(request))
    flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=redirect_uri)
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    # Allow only safe relative paths
    safe_return = return_to if return_to.startswith("/") else "/settings"
    await db.gmail_oauth_states.insert_one({
        "state": state,
        "user_id": user["user_id"],
        "return_to": safe_return,
        "redirect_uri": redirect_uri,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"auth_url": auth_url}


@router.get("/callback")
async def gmail_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    # Look up state doc first to get return_to and the redirect_uri used during connect
    state_doc = await db.gmail_oauth_states.find_one({"state": state}) if state else None
    return_to = (state_doc or {}).get("return_to", "/settings")

    # Determine the correct redirect_uri for token exchange:
    # 1. Use stored value from state doc (set during connect)
    # 2. Fall back to the actual callback URL being hit right now
    # 3. Fall back to env variable
    actual_callback_url = str(request.url).split("?")[0]  # The URL Google redirected to
    stored_redirect_uri = (state_doc or {}).get("redirect_uri") or actual_callback_url or os.environ.get("GMAIL_REDIRECT_URI")
    frontend_url = stored_redirect_uri.replace("/api/gmail/callback", "") if stored_redirect_uri else ""

    if error:
        logger.error(f"Gmail OAuth error: {error}")
        return RedirectResponse(f"{frontend_url}{return_to}?gmail=error&reason={error}")

    if not code or not state:
        return RedirectResponse(f"{frontend_url}{return_to}?gmail=error&reason=missing_params")

    if not state_doc:
        fallback_url = os.environ.get("GMAIL_REDIRECT_URI", "").replace("/api/gmail/callback", "")
        return RedirectResponse(f"{fallback_url}{return_to}?gmail=error&reason=invalid_state")

    user_id = state_doc["user_id"]
    await db.gmail_oauth_states.delete_one({"state": state})

    try:
        # Tell google-auth-oauthlib to accept scope changes
        # (Google may return fewer scopes than requested)
        os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"

        exchange_uri = stored_redirect_uri
        _, _, _, client_config = _gmail_config(exchange_uri)
        flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=exchange_uri)
        try:
            flow.fetch_token(code=code)
        except Exception as first_err:
            # Fallback: try with env variable redirect URI if different
            env_uri = os.environ.get("GMAIL_REDIRECT_URI")
            if env_uri and env_uri != exchange_uri:
                logger.warning(f"Token exchange failed with {exchange_uri}, trying fallback {env_uri}: {first_err}")
                _, _, _, client_config = _gmail_config(env_uri)
                flow = Flow.from_client_config(client_config, scopes=GMAIL_SCOPES, redirect_uri=env_uri)
                flow.fetch_token(code=code)
            else:
                raise

        creds = flow.credentials

        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        gmail_email = profile.get("emailAddress", "")

        token_doc = {
            "user_id": user_id,
            "access_token": encrypt_value(creds.token),
            "refresh_token": encrypt_value(creds.refresh_token) if creds.refresh_token else None,
            "expires_at": creds.expiry.isoformat() if creds.expiry else None,
            "gmail_email": gmail_email,
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "encrypted": True,
        }
        await db.gmail_tokens.update_one(
            {"user_id": user_id},
            {"$set": token_doc},
            upsert=True,
        )

        logger.info(f"Gmail connected for user {user_id} ({gmail_email})")
        return RedirectResponse(f"{frontend_url}{return_to}?gmail=connected")

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Gmail callback error: {error_msg} | redirect_uri used: {stored_redirect_uri}")
        # Pass the actual error reason to frontend for debugging
        import urllib.parse
        reason = urllib.parse.quote(f"token_exchange_failed: {error_msg[:200]}")
        return RedirectResponse(f"{frontend_url}{return_to}?gmail=error&reason={reason}")



@router.get("/debug-config")
async def gmail_debug_config(request: Request):
    """Admin-only: check Gmail OAuth config without exposing secrets."""
    from admin_guard import require_admin
    await require_admin(request)
    client_id = os.environ.get("GMAIL_CLIENT_ID", "")
    redirect_uri = os.environ.get("GMAIL_REDIRECT_URI", "")
    has_secret = bool(os.environ.get("GMAIL_CLIENT_SECRET", ""))
    return {
        "client_id_prefix": client_id[:20] + "..." if client_id else "MISSING",
        "client_secret_set": has_secret,
        "redirect_uri": redirect_uri,
        "dynamic_redirect_uri": _get_redirect_uri(request),
        "scopes": GMAIL_SCOPES,
        "origin_header": request.headers.get("origin", "none"),
        "referer_header": request.headers.get("referer", "none"),
    }


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
            pass  # Read-only mode: do not modify email state in Gmail

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


@router.get("/attachments/{message_id}/{attachment_id}")
async def download_attachment(message_id: str, attachment_id: str, request: Request):
    """Download an attachment from a Gmail message."""
    from fastapi.responses import Response
    import base64

    user = await get_current_user(request)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    try:
        service = get_gmail_service(creds)
        att = service.users().messages().attachments().get(
            userId="me", messageId=message_id, id=attachment_id
        ).execute()

        file_data = base64.urlsafe_b64decode(att["data"])

        # Get filename from the message
        msg = service.users().messages().get(userId="me", id=message_id, format="full").execute()
        attachments = _extract_attachments(msg.get("payload", {}))
        match = next((a for a in attachments if a["attachment_id"] == attachment_id), None)
        filename = match["filename"] if match else "download"
        mime_type = match["mime_type"] if match else "application/octet-stream"

        return Response(
            content=file_data,
            media_type=mime_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading attachment: {e}")
        raise HTTPException(status_code=500, detail="Failed to download attachment")


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
    """Disabled — read-only Gmail scopes do not allow modifying email state."""
    return {"ok": False, "detail": "Read/unread toggling is disabled for privacy. Manage read status in Gmail directly."}


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



# ─── Gmail History Import (Phase 4) ───

@router.post("/import-history")
async def start_import(request: Request):
    """Trigger a Gmail history import scan."""
    user = await get_current_user(request)
    user_id = user["user_id"]
    tenant_id = await get_tenant_id(user)

    # Check for a resumable run FIRST — doesn't need Gmail since scan is done
    # Only resume runs less than 30 days old
    expiry_cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    resumable = await db.import_runs.find_one(
        {"user_id": user_id, "status": "ready", "completed_at": {"$gte": expiry_cutoff}},
        {"_id": 0, "run_id": 1, "suggestions": 1, "confirmed_school_ids": 1}
    )
    if resumable:
        suggestions = resumable.get("suggestions", [])
        confirmed = set(resumable.get("confirmed_school_ids", []))
        existing = await db.programs.find(
            {"tenant_id": tenant_id}, {"_id": 0, "university_name": 1}
        ).to_list(1000)
        existing_names = {p["university_name"] for p in existing}
        remaining = [s for s in suggestions
                     if s.get("school_id")
                     and s["school_id"] not in confirmed
                     and s["school_id"] not in existing_names
                     and not s.get("ignored")]
        if remaining:
            return {"run_id": resumable["run_id"], "resumed": True}

    # Check Gmail connected (only needed for new scans)
    creds = await get_gmail_credentials(user_id)
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    # Prevent concurrent runs
    active = await db.import_runs.find_one(
        {"user_id": user_id, "status": {"$in": ["scanning", "mapping", "aggregating"]}},
        {"_id": 0, "run_id": 1}
    )
    if active:
        raise HTTPException(status_code=409, detail="Import already in progress",
                            headers={"X-Run-Id": active["run_id"]})

    run_id = f"import_{uuid.uuid4().hex[:12]}"

    await db.import_runs.insert_one({
        "run_id": run_id,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "status": "scanning",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "messages_scanned": 0,
        "schools_found": 0,
        "schools_high_confidence": 0,
        "suggestions": [],
        "confirmed_at": None,
        "confirmed_school_ids": [],
        "error": None,
    })

    # Launch background task
    from services.gmail_import import run_gmail_import
    import asyncio
    asyncio.create_task(
        run_gmail_import(run_id, user_id, db, get_gmail_credentials, get_gmail_service)
    )

    return {"run_id": run_id}


@router.get("/import-history/{run_id}/status")
async def import_status(run_id: str, request: Request):
    """Poll import progress. When ready, enriches suggestions with duplicate + plan limit info."""
    user = await get_current_user(request)
    run = await db.import_runs.find_one(
        {"run_id": run_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not run:
        raise HTTPException(status_code=404, detail="Import run not found")

    result = {
        "phase": run["status"],
        "messages_scanned": run.get("messages_scanned", 0),
        "schools_found": run.get("schools_found", 0),
        "schools_high_confidence": run.get("schools_high_confidence", 0),
    }

    if run["status"] == "ready":
        tenant_id = await get_tenant_id(user)
        suggestions = run.get("suggestions", [])

        # 1. Mark duplicates — schools already on the user's board
        existing_programs = await db.programs.find(
            {"tenant_id": tenant_id},
            {"_id": 0, "university_name": 1}
        ).to_list(1000)
        existing_names = {p["university_name"] for p in existing_programs}

        for s in suggestions:
            s["already_on_board"] = (s.get("school_id") or "") in existing_names

        # 2. Plan limit info
        from subscriptions import get_user_subscription
        subscription = await get_user_subscription(tenant_id)
        max_schools = subscription.get("max_schools", 5)
        current_count = len(existing_programs)

        if max_schools == -1:
            remaining_slots = -1  # unlimited
        else:
            remaining_slots = max(0, max_schools - current_count)

        result["suggestions"] = suggestions
        result["plan_info"] = {
            "tier": subscription.get("tier", "basic"),
            "label": subscription.get("label", "Starter"),
            "max_schools": max_schools,
            "current_count": current_count,
            "remaining_slots": remaining_slots,
        }

    if run["status"] == "failed":
        result["error"] = run.get("error")

    return result


@router.post("/import-history/{run_id}/confirm")
async def confirm_import(run_id: str, request: Request):
    """Confirm selected school suggestions and create pipeline entries + coaches."""
    import time
    confirm_start = time.monotonic()

    user = await get_current_user(request)
    user_id = user["user_id"]
    tenant_id = await get_tenant_id(user)

    run = await db.import_runs.find_one(
        {"run_id": run_id, "user_id": user_id},
        {"_id": 0}
    )
    if not run:
        raise HTTPException(status_code=404, detail="Import run not found")
    if run["status"] != "ready":
        raise HTTPException(status_code=400, detail=f"Run is not ready (status: {run['status']})")

    body = await request.json()
    selected = body.get("selected", [])
    if not selected:
        raise HTTPException(status_code=400, detail="No schools selected")

    # Server-side plan limit enforcement
    from subscriptions import get_user_subscription
    subscription = await get_user_subscription(tenant_id)
    max_schools = subscription.get("max_schools", 5)
    current_count = await db.programs.count_documents({"tenant_id": tenant_id})
    if max_schools != -1:
        remaining_slots = max(0, max_schools - current_count)
    else:
        remaining_slots = len(selected)  # unlimited

    # Build lookup from suggestions
    suggestion_map = {}
    for s in run.get("suggestions", []):
        key = s.get("school_id") or s.get("normalized_domain")
        if key:
            suggestion_map[key] = s

    created_count = 0
    skipped_count = 0
    created_ids = []
    skip_reasons = {"no_school_id": 0, "no_suggestion": 0, "already_exists": 0, "not_in_kb": 0, "plan_limit": 0}
    coaches_from_kb = 0
    coaches_from_gmail = 0
    stages_confirmed = defaultdict(int)

    for item in selected:
        # Plan limit check
        if created_count >= remaining_slots:
            skipped_count += 1
            skip_reasons["plan_limit"] += 1
            continue

        school_id = item.get("school_id")
        if not school_id:
            skipped_count += 1
            skip_reasons["no_school_id"] += 1
            continue

        # Find matching suggestion
        suggestion = suggestion_map.get(school_id)
        if not suggestion:
            skipped_count += 1
            skip_reasons["no_suggestion"] += 1
            continue

        # Idempotency: check if program already exists for this school
        existing = await db.programs.find_one(
            {"tenant_id": tenant_id, "university_name": school_id},
            {"_id": 0, "program_id": 1}
        )
        if existing:
            skipped_count += 1
            skip_reasons["already_exists"] += 1
            continue

        # Get KB data for enrichment (include domain + coordinator info)
        kb = await db.university_knowledge_base.find_one(
            {"university_name": school_id},
            {"_id": 0, "division": 1, "conference": 1, "website": 1, "coach_email": 1,
             "primary_coach": 1, "state": 1, "region": 1, "domain": 1,
             "recruiting_coordinator": 1, "coordinator_email": 1}
        )

        # Defensive check: only import schools that exist in our KB
        if not kb:
            logger.warning(f"Import confirm: school_id '{school_id}' not found in KB, skipping")
            skipped_count += 1
            skip_reasons["not_in_kb"] += 1
            continue

        # Build program document
        program_id = f"prog_{uuid.uuid4().hex[:12]}"
        stage = suggestion.get("proposed_stage", "added")
        next_action_map = {
            "added": "Send introduction email",
            "outreach": "Follow up on your outreach",
            "in_conversation": "Continue the conversation",
        }

        # Derive domain from KB or from the matched email domain
        domain = kb.get("domain", "") or suggestion.get("normalized_domain", "")

        doc = {
            "program_id": program_id,
            "tenant_id": tenant_id,
            "university_name": school_id,
            "domain": domain,
            "division": kb.get("division", ""),
            "conference": kb.get("conference", ""),
            "region": kb.get("region", ""),
            "website": kb.get("website", ""),
            "primary_coach": kb.get("primary_coach", ""),
            "coach_email": kb.get("coach_email", ""),
            "recruiting_status": "Not Contacted" if stage == "added" else "Contacted",
            "reply_status": "Replied" if suggestion.get("inbound_count", 0) > 0 else "No Reply",
            "priority": "Medium",
            "is_active": True,
            "journey_stage": stage,
            "next_action": next_action_map.get(stage, ""),
            "next_action_due": suggestion.get("followup_due_at", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "imported_at": datetime.now(timezone.utc).isoformat(),
            "import_run_id": run_id,
            "import_match_reason": suggestion.get("match_reason", ""),
            "import_sample_subjects": suggestion.get("sample_subjects", []),
            "athlete_interest": 5,
            "school_interest": 0,
            "notes": "",
            "scholarship_type": "",
            "follow_up_days": 14,
        }

        await db.programs.insert_one(doc)
        doc.pop("_id", None)
        created_count += 1
        created_ids.append(school_id)
        stages_confirmed[stage] += 1

        # ── Auto-create coach entries from KB + discovered emails ──
        coach_counts = await _create_coaches_for_import(
            db, tenant_id, program_id, school_id, kb, suggestion
        )
        coaches_from_kb += coach_counts["from_kb"]
        coaches_from_gmail += coach_counts["from_gmail"]

    # Compute confirm analytics
    confirm_duration_s = round(time.monotonic() - confirm_start, 2)
    total_suggestions = len(run.get("suggestions", []))
    auto_selectable = sum(1 for s in run.get("suggestions", []) if s.get("school_id") and (s.get("confidence", 0) >= 80) and not s.get("ignored"))

    confirm_analytics = {
        "confirm_duration_s": confirm_duration_s,
        "total_suggestions": total_suggestions,
        "auto_selectable_count": auto_selectable,
        "user_selected_count": len(selected),
        "created_count": created_count,
        "skipped_count": skipped_count,
        "skip_reasons": dict(skip_reasons),
        "conversion_rate": round(created_count / max(total_suggestions, 1) * 100, 1),
        "stages_confirmed": dict(stages_confirmed),
        "coaches_created_from_kb": coaches_from_kb,
        "coaches_created_from_gmail": coaches_from_gmail,
        "total_coaches_created": coaches_from_kb + coaches_from_gmail,
    }

    # Update import_run with confirm data + analytics
    await db.import_runs.update_one(
        {"run_id": run_id},
        {"$set": {
            "confirmed_at": datetime.now(timezone.utc).isoformat(),
            "confirmed_school_ids": created_ids,
            "confirm_analytics": confirm_analytics,
        }}
    )

    # Write to import_analytics collection (one doc per completed import)
    scan_analytics = run.get("scan_analytics", {})
    await db.import_analytics.insert_one({
        "run_id": run_id,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "scan": scan_analytics,
        "confirm": confirm_analytics,
        "funnel": {
            "messages_scanned": run.get("messages_scanned", 0),
            "schools_found": run.get("schools_found", 0),
            "high_confidence": run.get("schools_high_confidence", 0),
            "user_selected": len(selected),
            "actually_created": created_count,
        },
    })

    logger.info(f"Import confirm {run_id}: {created_count} created, {skipped_count} skipped, "
                f"{coaches_from_kb} KB coaches, {coaches_from_gmail} Gmail coaches, {confirm_duration_s}s")

    return {"created_count": created_count, "skipped_count": skipped_count}


async def _create_coaches_for_import(db, tenant_id, program_id, school_id, kb, suggestion):
    """Create coach entries from KB data and discovered email addresses. Returns creation counts."""
    created_emails = set()
    now = datetime.now(timezone.utc).isoformat()
    from_kb = 0
    from_gmail = 0

    # 1. Create from KB primary coach
    kb_email = (kb.get("coach_email") or "").strip().lower()
    kb_name = (kb.get("primary_coach") or "").strip()
    if kb_email and "@" in kb_email:
        coach_id = f"coach_{uuid.uuid4().hex[:12]}"
        await db.coaches.insert_one({
            "coach_id": coach_id,
            "program_id": program_id,
            "tenant_id": tenant_id,
            "university_name": school_id,
            "coach_name": kb_name or "Head Coach",
            "role": "Head Coach",
            "email": kb_email,
            "phone": "",
            "notes": "Auto-added from school database",
            "created_at": now,
        })
        created_emails.add(kb_email)
        from_kb += 1

    # 2. Create from KB recruiting coordinator
    coord_email = (kb.get("coordinator_email") or "").strip().lower()
    coord_name = (kb.get("recruiting_coordinator") or "").strip()
    if coord_email and "@" in coord_email and coord_email not in created_emails:
        coach_id = f"coach_{uuid.uuid4().hex[:12]}"
        await db.coaches.insert_one({
            "coach_id": coach_id,
            "program_id": program_id,
            "tenant_id": tenant_id,
            "university_name": school_id,
            "coach_name": coord_name or "Recruiting Coordinator",
            "role": "Recruiting Coordinator",
            "email": coord_email,
            "phone": "",
            "notes": "Auto-added from school database",
            "created_at": now,
        })
        created_emails.add(coord_email)
        from_kb += 1

    # 3. Create from discovered .edu emails (found during Gmail scan)
    discovered = suggestion.get("discovered_emails", [])
    for email_addr in discovered:
        email_addr = email_addr.strip().lower()
        if email_addr in created_emails or not email_addr or "@" not in email_addr:
            continue
        # Extract a display name from the email (e.g., "jsmith" from "jsmith@ohio.edu")
        local_part = email_addr.split("@")[0]
        display_name = local_part.replace(".", " ").replace("_", " ").title()
        coach_id = f"coach_{uuid.uuid4().hex[:12]}"
        await db.coaches.insert_one({
            "coach_id": coach_id,
            "program_id": program_id,
            "tenant_id": tenant_id,
            "university_name": school_id,
            "coach_name": display_name,
            "role": "Coach",
            "email": email_addr,
            "phone": "",
            "notes": "Discovered from Gmail history",
            "created_at": now,
        })
        created_emails.add(email_addr)
        from_gmail += 1

    return {"from_kb": from_kb, "from_gmail": from_gmail}


VALID_EVENTS = {"import_consent_shown", "import_started", "import_preview_shown",
                "import_abandoned", "import_suggestion_deselected", "import_suggestion_reselected",
                "import_add_manually_clicked", "import_confirmed", "import_done_shown"}


@router.post("/import-analytics/event")
async def track_import_event(request: Request):
    """Track user behavior events during the import flow."""
    user = await get_current_user(request)
    body = await request.json()

    event = body.get("event")
    if event not in VALID_EVENTS:
        raise HTTPException(status_code=400, detail="Invalid event type")

    await db.import_events.insert_one({
        "user_id": user["user_id"],
        "run_id": body.get("run_id"),
        "event": event,
        "metadata": body.get("metadata", {}),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {"ok": True}
