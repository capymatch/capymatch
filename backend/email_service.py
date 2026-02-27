import os
import asyncio
import logging
import resend
from dotenv import load_dotenv
from database import db

load_dotenv()
logger = logging.getLogger(__name__)

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
APP_NAME = "CapyMatch"


async def send_email(to: str, subject: str, html: str):
    """Send an email via Resend. Non-blocking."""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return None
    try:
        result = await asyncio.to_thread(resend.Emails.send, {
            "from": f"{APP_NAME} <{SENDER_EMAIL}>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Email sent to {to}: {result.get('id', 'ok')}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return None


async def send_welcome_email(name: str, email: str):
    # Check if welcome emails are enabled
    settings = await db.email_settings.find_one({"setting_id": "global"}, {"_id": 0})
    if settings and not settings.get("welcome_email", True):
        return None

    # Check user notification preference
    user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
    if user:
        tenant = await db.tenants.find_one({"owner_user_id": user["user_id"]}, {"_id": 0, "tenant_id": 1})
        if tenant:
            prefs = await db.privacy_preferences.find_one({"tenant_id": tenant["tenant_id"]}, {"_id": 0})
            if prefs and not prefs.get("email_notifications", True):
                return None

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #ec4899, #e11d48); display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px; font-weight: bold;">R</span>
        </div>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; text-align: center;">Welcome to {APP_NAME}!</h1>
      <p style="font-size: 15px; color: #64748b; text-align: center; margin-bottom: 32px;">
        Hey {name}, your recruiting journey starts now.
      </p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0; font-weight: 600;">Here's how to get started:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">
              <span style="color: #ec4899; font-weight: 600;">1.</span> Complete your athlete profile
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">
              <span style="color: #ec4899; font-weight: 600;">2.</span> Add your target schools to the pipeline
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #64748b;">
              <span style="color: #ec4899; font-weight: 600;">3.</span> Start reaching out to coaches
            </td>
          </tr>
        </table>
      </div>
      <p style="font-size: 13px; color: #94a3b8; text-align: center;">
        You're on the <strong>Basic</strong> plan. Upgrade anytime to unlock AI tools, Gmail integration, and team collaboration.
      </p>
    </div>
    """
    return await send_email(email, f"Welcome to {APP_NAME}!", html)


async def send_invitation_email(inviter_name: str, invitee_email: str, app_url: str):
    # Check if invitation emails are enabled
    settings = await db.email_settings.find_one({"setting_id": "global"}, {"_id": 0})
    if settings and not settings.get("invitation_email", True):
        return None

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); display: inline-flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px;">+</span>
        </div>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; text-align: center;">You're Invited!</h1>
      <p style="font-size: 15px; color: #64748b; text-align: center; margin-bottom: 32px;">
        <strong style="color: #1a1a2e;">{inviter_name}</strong> invited you to collaborate on their recruiting dashboard in {APP_NAME}.
      </p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <p style="font-size: 14px; color: #475569; margin: 0 0 12px 0; font-weight: 600;">What you'll get:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Full access to the shared recruiting pipeline</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Add and manage target schools together</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #64748b;">Collaborate on outreach and follow-ups</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="{app_url}/login" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600;">
          Sign in to Accept
        </a>
      </div>
      <p style="font-size: 13px; color: #94a3b8; text-align: center;">
        Sign up or log in with <strong>{invitee_email}</strong> to see the invitation on your dashboard.
      </p>
    </div>
    """
    return await send_email(invitee_email, f"{inviter_name} invited you to {APP_NAME}", html)
