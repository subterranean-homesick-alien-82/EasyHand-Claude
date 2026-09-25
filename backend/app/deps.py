from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from .config import get_settings
from .db import get_db
from .security import decode_access_token
from .utils import as_utc, parse_object_id

_bearer = HTTPBearer(auto_error=False)

ACCOUNT_SUSPENDED = "This account has been suspended. If you think this is a mistake, please contact EasyHand."

Db = Annotated[AsyncIOMotorDatabase, Depends(get_db)]


async def get_current_user(
    db: Db,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict[str, Any]:
    unauthorized = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    claims = decode_access_token(credentials.credentials)
    if claims is None:
        raise unauthorized
    user_id, issued_at = claims
    try:
        oid = parse_object_id(user_id)
    except HTTPException:
        raise unauthorized
    user = await db.users.find_one({"_id": oid})
    if user is None:
        raise unauthorized
    # Resetting a password signs out every session that logged in before the reset.
    changed = user.get("password_changed_at")
    if changed is not None and issued_at < int(as_utc(changed).timestamp()):
        raise unauthorized
    if user.get("banned"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, ACCOUNT_SUSPENDED)
    return user


async def get_optional_user(
    db: Db,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> dict[str, Any] | None:
    """The signed-in user if a valid token was sent, otherwise None (for public routes that personalise results)."""
    if credentials is None:
        return None
    try:
        return await get_current_user(db, credentials)
    except HTTPException:
        return None


async def require_admin(user: Annotated[dict[str, Any], Depends(get_current_user)]) -> dict[str, Any]:
    if not get_settings().is_admin(user["email"]):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admins only")
    return user


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
OptionalUser = Annotated[dict[str, Any] | None, Depends(get_optional_user)]
AdminUser = Annotated[dict[str, Any], Depends(require_admin)]
