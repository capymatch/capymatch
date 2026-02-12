from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
import uuid
import base64
import warnings
import logging
import email.mime.text
import email.mime.multipart
import email.mime.base

logger = logging.getLogger(__name__)

gmail_router = APIRouter(prefix="/api/gmail")

def _gmail_config():
    """Read Gmail config at request time to avoid stale env values."""
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

# Will be set by server.py
db = None

def set_db(database):
    global db
    db = database


# ─── Pydantic Models ───

class ComposeEmail(BaseModel):
    to: str
    subject: str
    body: str
    cc: Optional[str] = ""
    bcc: Optional[str] = ""

class ReplyEmail(BaseModel):
    thread_id: str
    message_id: str
    body: str
    reply_all: bool = False


# ─── Auth Helpers ───

async def get_current_user(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_tenant_id(user):
    tenant = await db.tenants.find_one({"owner_user_id": user["user_id"]}, {"_id": 0})
    if tenant:
        return tenant["tenant_id"]
    tenant_id = f"tenant_{uuid.uuid4().hex[:12]}"
    tenant = {
        "tenant_id": tenant_id,
        "athlete_name": user.get("name", "My Athlete"),
        "owner_user_id": user["user_id"],
        "plan": "free",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tenants.insert_one(tenant)
    return tenant_id


async def get_gmail_credentials(user_id: str):
    """Get valid Gmail credentials for a user, refreshing if needed."""
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

    # Check expiry
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

@gmail_router.get("/connect")
async def gmail_connect(request: Request):
    """Initiate Gmail OAuth flow."""
    user = await get_current_user(request)
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=GMAIL_SCOPES, redirect_uri=GMAIL_REDIRECT_URI)
    auth_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )
    # Store state for verification
    await db.gmail_oauth_states.insert_one({
        "state": state,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"auth_url": auth_url}


@gmail_router.get("/callback")
async def gmail_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    """Handle Gmail OAuth callback."""
    frontend_url = os.environ.get("GMAIL_REDIRECT_URI", "").replace("/api/gmail/callback", "")
    
    if error:
        logger.error(f"Gmail OAuth error: {error}")
        return RedirectResponse(f"{frontend_url}/settings?gmail=error&reason={error}")

    if not code or not state:
        return RedirectResponse(f"{frontend_url}/settings?gmail=error&reason=missing_params")

    # Verify state
    state_doc = await db.gmail_oauth_states.find_one({"state": state})
    if not state_doc:
        return RedirectResponse(f"{frontend_url}/settings?gmail=error&reason=invalid_state")

    user_id = state_doc["user_id"]
    await db.gmail_oauth_states.delete_one({"state": state})

    try:
        flow = Flow.from_client_config(CLIENT_CONFIG, scopes=GMAIL_SCOPES, redirect_uri=GMAIL_REDIRECT_URI)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            flow.fetch_token(code=code)

        creds = flow.credentials

        # Get user's Gmail email
        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        gmail_email = profile.get("emailAddress", "")

        # Store tokens
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


@gmail_router.get("/status")
async def gmail_status(request: Request):
    """Check Gmail connection status."""
    user = await get_current_user(request)
    token_doc = await db.gmail_tokens.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not token_doc:
        return {"connected": False}
    return {
        "connected": True,
        "gmail_email": token_doc.get("gmail_email", ""),
        "connected_at": token_doc.get("connected_at", ""),
    }


@gmail_router.post("/disconnect")
async def gmail_disconnect(request: Request):
    """Disconnect Gmail account."""
    user = await get_current_user(request)
    await db.gmail_tokens.delete_one({"user_id": user["user_id"]})
    await db.gmail_emails.delete_many({"user_id": user["user_id"]})
    logger.info(f"Gmail disconnected for user {user['user_id']}")
    return {"ok": True}


# ─── Email Routes ───

@gmail_router.get("/emails")
async def list_emails(request: Request, page_token: Optional[str] = None, q: Optional[str] = None, max_results: int = 20):
    """List emails from Gmail, syncing fresh data."""
    user = await get_current_user(request)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    try:
        service = get_gmail_service(creds)
        params = {"userId": "me", "maxResults": max_results}
        if page_token:
            params["pageToken"] = page_token
        if q:
            params["q"] = q

        results = service.users().messages().list(**params).execute()
        messages = results.get("messages", [])
        next_page_token = results.get("nextPageToken")

        # Fetch full message details
        email_list = []
        for msg_ref in messages:
            msg = service.users().messages().get(
                userId="me", id=msg_ref["id"], format="metadata",
                metadataHeaders=["From", "To", "Subject", "Date", "Cc"],
            ).execute()
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
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


@gmail_router.get("/emails/{message_id}")
async def get_email(message_id: str, request: Request):
    """Get full email content."""
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

        # Mark as read
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


@gmail_router.get("/threads/{thread_id}")
async def get_thread(thread_id: str, request: Request):
    """Get full email thread."""
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


@gmail_router.post("/send")
async def send_email(data: ComposeEmail, request: Request):
    """Send a new email."""
    user = await get_current_user(request)
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

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        sent = service.users().messages().send(userId="me", body={"raw": raw}).execute()

        logger.info(f"Email sent by {user['user_id']} to {data.to}")
        return {"id": sent["id"], "thread_id": sent.get("threadId", ""), "status": "sent"}

    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")


@gmail_router.post("/reply")
async def reply_email(data: ReplyEmail, request: Request):
    """Reply to an email in a thread."""
    user = await get_current_user(request)
    creds = await get_gmail_credentials(user["user_id"])
    if not creds:
        raise HTTPException(status_code=403, detail="Gmail not connected")

    try:
        service = get_gmail_service(creds)

        # Get original message for headers
        original = service.users().messages().get(userId="me", id=data.message_id, format="metadata",
            metadataHeaders=["From", "To", "Subject", "Message-ID", "Cc"]).execute()
        orig_headers = {h["name"]: h["value"] for h in original.get("payload", {}).get("headers", [])}

        profile = service.users().getProfile(userId="me").execute()
        sender_email = profile.get("emailAddress", "")

        # Build reply
        message = email.mime.multipart.MIMEMultipart()
        reply_to = orig_headers.get("From", "")
        message["to"] = reply_to
        if data.reply_all:
            # Include all original recipients minus self
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

        # Thread headers
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
        return {"id": sent["id"], "thread_id": sent.get("threadId", ""), "status": "sent"}

    except Exception as e:
        logger.error(f"Error replying to email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reply")


@gmail_router.post("/emails/{message_id}/toggle-read")
async def toggle_read(message_id: str, request: Request):
    """Toggle read/unread status."""
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


# ─── Helpers ───

def _extract_body(payload):
    """Extract HTML and plain text body from email payload."""
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
    """Extract attachment metadata from email payload."""
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
