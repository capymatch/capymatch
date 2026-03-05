"""
Database Index Creation for CapyMatch
Run once on startup to ensure all required indexes exist.
MongoDB create_index is idempotent — safe to run multiple times.
"""
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


async def create_indexes(db: AsyncIOMotorDatabase):
    """Create all required indexes for optimal query performance."""
    logger.info("Creating database indexes...")

    # ─── AUTH (hit on EVERY request) ───
    # user_sessions: queried by session_token on every authenticated API call
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at")

    # users: queried by email (login) and user_id (auth lookup)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)

    # ─── CORE DATA (queried on every board load) ───
    # programs: most queried collection (44 query sites)
    await db.programs.create_index("tenant_id")
    await db.programs.create_index([("tenant_id", 1), ("program_id", 1)], unique=True)
    await db.programs.create_index([("tenant_id", 1), ("university_name", 1)])

    # coaches: queried by tenant_id and program_id
    await db.coaches.create_index("tenant_id")
    await db.coaches.create_index([("tenant_id", 1), ("program_id", 1)])
    await db.coaches.create_index("coach_id")

    # interactions: queried by tenant_id and program_id
    await db.interactions.create_index("tenant_id")
    await db.interactions.create_index([("tenant_id", 1), ("program_id", 1)])
    await db.interactions.create_index("interaction_id")

    # ─── TENANT & PROFILE ───
    await db.tenants.create_index("tenant_id", unique=True)
    await db.tenants.create_index("owner_user_id")

    await db.athlete_profiles.create_index("tenant_id", unique=True)

    # ─── EVENTS & NOTIFICATIONS ───
    await db.events.create_index("tenant_id")
    await db.events.create_index("event_id")

    await db.engagement_events.create_index([("tenant_id", 1), ("created_at", -1)])

    await db.notifications.create_index("tenant_id")
    await db.notifications.create_index([("tenant_id", 1), ("read", 1)])

    # ─── NOTES ───
    await db.notes.create_index([("tenant_id", 1), ("program_id", 1)])

    # ─── GMAIL ───
    await db.gmail_tokens.create_index("user_id", unique=True)
    await db.gmail_oauth_states.create_index("state", unique=True)
    await db.gmail_oauth_states.create_index("created_at")

    # ─── IMPORT ───
    await db.import_runs.create_index("user_id")
    await db.import_runs.create_index("run_id")

    # ─── KNOWLEDGE BASE (1053 docs, queried 30 times in code) ───
    await db.university_knowledge_base.create_index("university_name")
    await db.university_knowledge_base.create_index("division")
    await db.university_knowledge_base.create_index("region")
    await db.university_knowledge_base.create_index("conference")

    # ─── INTELLIGENCE ───
    await db.intelligence_cache.create_index("university_name")
    await db.intelligence_cache.create_index("updated_at")
    await db.intelligence_contributions.create_index("university_name")
    await db.intelligence_contributions.create_index("status")

    # ─── PAYMENTS ───
    await db.payment_transactions.create_index("tenant_id")
    await db.payment_transactions.create_index("stripe_session_id")
    await db.subscription_logs.create_index("tenant_id")

    # ─── TEAM ───
    await db.team_members.create_index("user_id")
    await db.team_members.create_index("tenant_id")
    await db.team_invitations.create_index("email")
    await db.team_invitations.create_index("tenant_id")

    # ─── PRIVACY & MISC ───
    await db.privacy_preferences.create_index("tenant_id")
    await db.coach_watch_alerts.create_index("tenant_id")
    await db.inbound_contacts.create_index("tenant_id")
    await db.sent_email_log.create_index("tenant_id")
    await db.profile_views.create_index("tenant_id")
    await db.profile_views.create_index([("slug", 1), ("viewed_at", -1)])
    await db.ai_conversations.create_index("user_id")
    await db.ai_usage.create_index("user_id")
    await db.temp_attachments.create_index("user_id")
    await db.password_resets.create_index("user_id")
    await db.password_resets.create_index("token")

    logger.info("Database indexes created successfully")
