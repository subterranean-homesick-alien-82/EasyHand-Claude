from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status

from ..deps import CurrentUser, Db
from ..models import AuthorSummary, Conversation, Message, MessageCreate
from ..utils import parse_object_id, utcnow

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=Message, status_code=status.HTTP_201_CREATED)
async def send_message(body: MessageCreate, user: CurrentUser, db: Db) -> Message:
    recipient_id = parse_object_id(body.recipient_id, "recipient id")
    if recipient_id == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot message yourself")
    if await db.users.count_documents({"_id": recipient_id}, limit=1) == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipient not found")

    post_id: ObjectId | None = None
    if body.post_id:
        post_id = parse_object_id(body.post_id, "post id")
        if await db.posts.count_documents({"_id": post_id}, limit=1) == 0:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")

    doc = {
        "post_id": post_id,
        "sender_id": user["_id"],
        "recipient_id": recipient_id,
        "content": body.content,
        "timestamp": utcnow(),
    }
    result = await db.messages.insert_one(doc)
    doc["_id"] = result.inserted_id
    return Message.from_doc(doc)


@router.get("", response_model=list[Conversation])
async def list_conversations(user: CurrentUser, db: Db) -> list[Conversation]:
    """Inbox: one entry per person the current user has exchanged messages with, newest first."""
    me = user["_id"]
    pipeline = [
        {"$match": {"$or": [{"sender_id": me}, {"recipient_id": me}]}},
        {"$sort": {"timestamp": -1}},
        {
            "$group": {
                "_id": {"$cond": [{"$eq": ["$sender_id", me]}, "$recipient_id", "$sender_id"]},
                "last": {"$first": "$$ROOT"},
            }
        },
        {"$sort": {"last.timestamp": -1}},
        {"$limit": 100},
    ]
    groups = [g async for g in db.messages.aggregate(pipeline)]
    others = {
        u["_id"]: u
        async for u in db.users.find({"_id": {"$in": [g["_id"] for g in groups]}}, {"name": 1, "neighborhood": 1})
    }
    conversations = []
    for g in groups:
        other = others.get(g["_id"])
        if other is None:
            continue
        conversations.append(
            Conversation(
                other_user=AuthorSummary(id=str(other["_id"]), name=other["name"], neighborhood=other.get("neighborhood", "")),
                last_message=Message.from_doc(g["last"]),
            )
        )
    return conversations


@router.get("/{user_id}", response_model=list[Message])
async def get_thread(
    user_id: str,
    user: CurrentUser,
    db: Db,
    post_id: str | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> list[Message]:
    """Messages between the current user and `user_id`, oldest first. Optionally scoped to one post."""
    other = parse_object_id(user_id, "user id")
    me = user["_id"]
    query: dict = {
        "$or": [
            {"sender_id": me, "recipient_id": other},
            {"sender_id": other, "recipient_id": me},
        ]
    }
    if post_id:
        query["post_id"] = parse_object_id(post_id, "post id")
    # Take the most recent `limit` messages, then return them in chronological order.
    cursor = db.messages.find(query).sort("timestamp", -1).limit(limit)
    docs = [d async for d in cursor]
    docs.sort(key=lambda d: (d["timestamp"], d["_id"]))
    return [Message.from_doc(d) for d in docs]
