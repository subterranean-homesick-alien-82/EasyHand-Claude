import re
from typing import Annotated, Any

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import DESCENDING, ReturnDocument

from ..config import get_settings
from ..deps import CurrentUser, Db, OptionalUser
from ..models import Category, Post, PostCreate, PostKind, PostStatus, PostStatusUpdate
from ..utils import parse_object_id, utcnow

router = APIRouter(prefix="/posts", tags=["posts"])


# Listings hidden by a moderator, or whose author is banned, are left out for everyone but admins.
VISIBLE = {"hidden": {"$ne": True}, "author_banned": {"$ne": True}}


def _is_admin(user: dict[str, Any] | None) -> bool:
    return bool(user and get_settings().is_admin(user["email"]))


async def _authors_by_id(db: AsyncIOMotorDatabase, author_ids: set[ObjectId]) -> dict[ObjectId, dict[str, Any]]:
    if not author_ids:
        return {}
    cursor = db.users.find({"_id": {"$in": list(author_ids)}}, {"name": 1, "neighborhood": 1})
    return {doc["_id"]: doc async for doc in cursor}


async def _get_post_doc(db: AsyncIOMotorDatabase, post_id: str) -> dict[str, Any]:
    doc = await db.posts.find_one({"_id": parse_object_id(post_id, "post id")})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return doc


@router.get("", response_model=list[Post])
async def list_posts(
    db: Db,
    viewer: OptionalUser,
    category: Category | None = None,
    kind: PostKind | None = None,
    status_: Annotated[PostStatus | None, Query(alias="status")] = None,
    neighborhood: str | None = None,
    author_id: str | None = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    skip: Annotated[int, Query(ge=0)] = 0,
) -> list[Post]:
    query: dict[str, Any] = dict(VISIBLE)
    if viewer and viewer.get("blocked_ids"):
        query["author_id"] = {"$nin": viewer["blocked_ids"]}
    if category:
        query["category"] = category.value
    if kind:
        query["kind"] = kind.value
    if status_:
        query["status"] = status_.value
    if neighborhood:
        query["neighborhood"] = {"$regex": f"^{re.escape(neighborhood.strip())}$", "$options": "i"}
    if author_id:
        query["author_id"] = parse_object_id(author_id, "author id")
    if q:
        pattern = {"$regex": re.escape(q.strip()), "$options": "i"}
        query["$or"] = [{"title": pattern}, {"description": pattern}]

    cursor = db.posts.find(query).sort("created_at", DESCENDING).skip(skip).limit(limit)
    docs = [doc async for doc in cursor]
    authors = await _authors_by_id(db, {d["author_id"] for d in docs})
    return [Post.from_doc(d, authors.get(d["author_id"])) for d in docs]


@router.post("", response_model=Post, status_code=status.HTTP_201_CREATED)
async def create_post(body: PostCreate, user: CurrentUser, db: Db) -> Post:
    doc = {
        "author_id": user["_id"],
        "kind": body.kind.value,
        "title": body.title.strip(),
        "description": body.description.strip(),
        "category": body.category.value,
        "compensation": body.compensation.strip(),
        "neighborhood": (body.neighborhood or user.get("neighborhood", "")).strip(),
        "image_url": body.image_url,
        "status": PostStatus.active.value,
        "created_at": utcnow(),
    }
    result = await db.posts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return Post.from_doc(doc, user)


@router.get("/{post_id}", response_model=Post)
async def get_post(post_id: str, db: Db, viewer: OptionalUser) -> Post:
    doc = await _get_post_doc(db, post_id)
    is_author = viewer is not None and viewer["_id"] == doc["author_id"]
    if (doc.get("hidden") or doc.get("author_banned")) and not (is_author or _is_admin(viewer)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    author = await db.users.find_one({"_id": doc["author_id"]}, {"name": 1, "neighborhood": 1})
    return Post.from_doc(doc, author)


@router.patch("/{post_id}/status", response_model=Post)
async def update_post_status(post_id: str, body: PostStatusUpdate, user: CurrentUser, db: Db) -> Post:
    doc = await _get_post_doc(db, post_id)
    if doc["author_id"] != user["_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author can change this post")
    updated = await db.posts.find_one_and_update(
        {"_id": doc["_id"]}, {"$set": {"status": body.status.value}}, return_document=ReturnDocument.AFTER
    )
    return Post.from_doc(updated, user)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: str, user: CurrentUser, db: Db) -> Response:
    doc = await _get_post_doc(db, post_id)
    if doc["author_id"] != user["_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author can delete this post")
    await db.posts.delete_one({"_id": doc["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)

