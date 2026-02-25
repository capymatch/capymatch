from fastapi import HTTPException, Request
from auth import get_current_user

ADMIN_EMAILS = ["douglas@yeslms.com", "demo@capymatch.com"]


async def require_admin(request: Request):
    """Verify the current user is an admin. Raises 403 if not."""
    user = await get_current_user(request)
    if user.get("email") not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
