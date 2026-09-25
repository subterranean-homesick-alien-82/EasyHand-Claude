from fastapi import APIRouter, HTTPException, status
from pymongo import ReturnDocument

from ..deps import CurrentUser, Db
from ..models import PrivateUser, ProfileUpdate, PublicUser
from ..utils import parse_object_id

router = APIRouter(prefix="/users", tags=["users"])


@router.put("/profile", response_model=PrivateUser)
async def update_profile(body: ProfileUpdate, user: CurrentUser, db: Db) -> PrivateUser:
    changes = {k: v.strip() if isinstance(v, str) else v for k, v in body.model_dump(exclude_none=True).items()}
    if not changes:
        return PrivateUser.from_doc(user)
    updated = await db.users.find_one_and_update(
        {"_id": user["_id"]}, {"$set": changes}, return_document=ReturnDocument.AFTER
    )
    return PrivateUser.from_doc(updated)


@router.post("/{user_id}/block", response_model=PrivateUser)
async def block_user(user_id: str, user: CurrentUser, db: Db) -> PrivateUser:
    """Blocked people can't message you, and you won't see their listings or messages."""
    target = parse_object_id(user_id, "user id")
    if target == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't block yourself")
    if await db.users.count_documents({"_id": target}, limit=1) == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    updated = await db.users.find_one_and_update(
        {"_id": user["_id"]}, {"$addToSet": {"blocked_ids": target}}, return_document=ReturnDocument.AFTER
    )
    return PrivateUser.from_doc(updated)


@router.delete("/{user_id}/block", response_model=PrivateUser)
async def unblock_user(user_id: str, user: CurrentUser, db: Db) -> PrivateUser:
    target = parse_object_id(user_id, "user id")
    updated = await db.users.find_one_and_update(
        {"_id": user["_id"]}, {"$pull": {"blocked_ids": target}}, return_document=ReturnDocument.AFTER
    )
    return PrivateUser.from_doc(updated)


@router.get("/{user_id}", response_model=PublicUser)
async def get_user(user_id: str, db: Db) -> PublicUser:
    doc = await db.users.find_one({"_id": parse_object_id(user_id, "user id")})
    if doc is None or doc.get("banned"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return PublicUser.from_doc(doc)
