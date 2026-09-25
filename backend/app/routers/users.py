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


@router.get("/{user_id}", response_model=PublicUser)
async def get_user(user_id: str, db: Db) -> PublicUser:
    doc = await db.users.find_one({"_id": parse_object_id(user_id, "user id")})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return PublicUser.from_doc(doc)
