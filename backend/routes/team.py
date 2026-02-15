from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from database import db
from auth import get_current_user, get_tenant_id, get_user_role
from subscriptions import get_user_subscription
import uuid

router = APIRouter(prefix="/api/team")


@router.get("")
async def get_team(request: Request):
    """Get team members and pending invitations for the current tenant."""
    user = await get_current_user(request)
    tenant_id = await get_tenant_id(user)
    role = await get_user_role(user)

    # Get tenant info
    tenant = await db.tenants.find_one({"tenant_id": tenant_id}, {"_id": 0})
    owner_user_id = tenant["owner_user_id"] if tenant else user["user_id"]

    # Get owner info
    owner = await db.users.find_one({"user_id": owner_user_id}, {"_id": 0, "password_hash": 0})

    # Get all members
    members_cursor = db.team_members.find({"tenant_id": tenant_id, "role": "member"}, {"_id": 0})
    member_records = await members_cursor.to_list(100)

    members = []
    for m in member_records:
        u = await db.users.find_one({"user_id": m["user_id"]}, {"_id": 0, "password_hash": 0})
        if u:
            members.append({
                "user_id": u["user_id"],
                "name": u.get("name", ""),
                "email": u.get("email", ""),
                "picture": u.get("picture", ""),
                "role": "member",
                "joined_at": m.get("joined_at", ""),
            })

    # Get pending invitations
    invites = await db.team_invitations.find(
        {"tenant_id": tenant_id, "status": "pending"}, {"_id": 0}
    ).to_list(100)

    # Subscription limits
    subscription = await get_user_subscription(tenant_id)
    max_members = subscription.get("max_members", 1)

    return {
        "tenant_id": tenant_id,
        "owner": {
            "user_id": owner.get("user_id", ""),
            "name": owner.get("name", ""),
            "email": owner.get("email", ""),
            "picture": owner.get("picture", ""),
            "role": "owner",
        } if owner else None,
        "members": members,
        "pending_invitations": [{
            "invite_id": inv["invite_id"],
            "email": inv["invitee_email"],
            "created_at": inv.get("created_at", ""),
        } for inv in invites],
        "current_user_role": role,
        "limits": {
            "max_members": max_members,
            "current_count": 1 + len(members),  # owner + members
        },
    }


@router.post("/invite")
async def invite_member(request: Request):
    """Invite a new member by email. Owner only."""
    user = await get_current_user(request)
    role = await get_user_role(user)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the account owner can invite members")

    tenant_id = await get_tenant_id(user)
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Can't invite yourself
    if email == user.get("email", "").lower():
        raise HTTPException(status_code=400, detail="You can't invite yourself")

    # Check subscription limits
    subscription = await get_user_subscription(tenant_id)
    max_members = subscription.get("max_members", 1)
    current_members = await db.team_members.count_documents({"tenant_id": tenant_id, "role": "member"})
    current_total = 1 + current_members  # owner + members

    if max_members != -1 and current_total >= max_members:
        raise HTTPException(status_code=403, detail={
            "error": "subscription_limit",
            "feature": "max_members",
            "message": f"Your {subscription['label']} plan allows {max_members} team member(s). Upgrade to add more.",
            "upgrade_to": "pro" if subscription["tier"] == "basic" else "premium",
        })

    # Check if already a member
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        existing_member = await db.team_members.find_one({
            "tenant_id": tenant_id, "user_id": existing_user["user_id"]
        })
        if existing_member:
            raise HTTPException(status_code=409, detail="This person is already a team member")

    # Check pending count toward limit
    pending = await db.team_invitations.count_documents({"tenant_id": tenant_id, "status": "pending"})
    if max_members != -1 and (current_total + pending) >= max_members:
        raise HTTPException(status_code=403, detail="You already have a pending invitation. Wait for it to be accepted or cancel it first.")

    # Check for existing pending invite
    existing_invite = await db.team_invitations.find_one({
        "tenant_id": tenant_id, "invitee_email": email, "status": "pending"
    })
    if existing_invite:
        raise HTTPException(status_code=409, detail="An invitation is already pending for this email")

    invite_id = f"inv_{uuid.uuid4().hex[:12]}"
    invite = {
        "invite_id": invite_id,
        "tenant_id": tenant_id,
        "inviter_user_id": user["user_id"],
        "inviter_name": user.get("name", ""),
        "invitee_email": email,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.team_invitations.insert_one(invite)

    return {"invite_id": invite_id, "email": email, "status": "pending"}


@router.delete("/invitations/{invite_id}")
async def cancel_invitation(invite_id: str, request: Request):
    """Cancel a pending invitation. Owner only."""
    user = await get_current_user(request)
    role = await get_user_role(user)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the account owner can manage invitations")

    tenant_id = await get_tenant_id(user)
    result = await db.team_invitations.delete_one({
        "invite_id": invite_id, "tenant_id": tenant_id, "status": "pending"
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invitation not found")

    return {"ok": True}


@router.delete("/members/{member_user_id}")
async def remove_member(member_user_id: str, request: Request):
    """Remove a team member. Owner only."""
    user = await get_current_user(request)
    role = await get_user_role(user)
    if role != "owner":
        raise HTTPException(status_code=403, detail="Only the account owner can remove members")

    tenant_id = await get_tenant_id(user)
    result = await db.team_members.delete_one({
        "tenant_id": tenant_id, "user_id": member_user_id, "role": "member"
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")

    return {"ok": True}


@router.get("/my-invitations")
async def get_my_invitations(request: Request):
    """Get pending invitations for the current user's email."""
    user = await get_current_user(request)
    email = user.get("email", "").lower()

    invites = await db.team_invitations.find(
        {"invitee_email": email, "status": "pending"}, {"_id": 0}
    ).to_list(50)

    return {"invitations": [{
        "invite_id": inv["invite_id"],
        "inviter_name": inv.get("inviter_name", "Someone"),
        "created_at": inv.get("created_at", ""),
    } for inv in invites]}


@router.post("/invitations/{invite_id}/accept")
async def accept_invitation(invite_id: str, request: Request):
    """Accept a team invitation."""
    user = await get_current_user(request)
    email = user.get("email", "").lower()

    invite = await db.team_invitations.find_one(
        {"invite_id": invite_id, "invitee_email": email, "status": "pending"}, {"_id": 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found or already handled")

    tenant_id = invite["tenant_id"]

    # Remove any existing membership this user has in another tenant
    await db.team_members.delete_many({"user_id": user["user_id"], "role": "member"})

    # Add as member
    await db.team_members.insert_one({
        "tenant_id": tenant_id,
        "user_id": user["user_id"],
        "role": "member",
        "joined_at": datetime.now(timezone.utc).isoformat(),
    })

    # Mark invite as accepted
    await db.team_invitations.update_one(
        {"invite_id": invite_id},
        {"$set": {"status": "accepted"}}
    )

    return {"ok": True, "tenant_id": tenant_id}


@router.post("/invitations/{invite_id}/decline")
async def decline_invitation(invite_id: str, request: Request):
    """Decline a team invitation."""
    user = await get_current_user(request)
    email = user.get("email", "").lower()

    result = await db.team_invitations.update_one(
        {"invite_id": invite_id, "invitee_email": email, "status": "pending"},
        {"$set": {"status": "declined"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Invitation not found")

    return {"ok": True}


@router.post("/leave")
async def leave_team(request: Request):
    """Leave a team. Members only (owners can't leave their own team)."""
    user = await get_current_user(request)
    role = await get_user_role(user)
    if role != "member":
        raise HTTPException(status_code=400, detail="You are the account owner and cannot leave")

    await db.team_members.delete_many({"user_id": user["user_id"], "role": "member"})
    return {"ok": True}
