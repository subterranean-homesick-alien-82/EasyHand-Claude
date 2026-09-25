from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from .db import get_db
from .security import decode_access_token
from .utils import parse_object_id

_bearer = HTTPBearer(auto_error=False)

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
    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise unauthorized
    try:
        oid = parse_object_id(user_id)
    except HTTPException:
        raise unauthorized
    user = await db.users.find_one({"_id": oid})
    if user is None:
        raise unauthorized
    return user


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
