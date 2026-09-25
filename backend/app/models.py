from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from .config import get_settings
from .utils import as_utc

MAX_SKILLS = 20


class Category(str, Enum):
    tech = "tech"
    cleaning = "cleaning"
    lawncare = "lawncare"
    other = "other"


class PostKind(str, Enum):
    request = "request"  # "I need help with X"
    offer = "offer"  # "I can offer help with Y"


class PostStatus(str, Enum):
    active = "active"
    claimed = "claimed"
    completed = "completed"


def _clean_skills(skills: list[str]) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []
    for raw in skills:
        skill = raw.strip()
        if skill and skill.lower() not in seen:
            seen.add(skill.lower())
            cleaned.append(skill[:40])
    return cleaned[:MAX_SKILLS]


# ---------- Auth ----------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    neighborhood: str = Field(default="", max_length=80)
    accepted_terms: bool

    @field_validator("accepted_terms")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must be 18 or older and agree to the Terms to join")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    password: str = Field(min_length=8, max_length=128)


# ---------- Users ----------


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    neighborhood: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=1000)
    skills: list[str] | None = None
    email_notifications: bool | None = None

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else _clean_skills(v)


class PublicUser(BaseModel):
    id: str
    name: str
    neighborhood: str
    bio: str
    skills: list[str]
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict[str, Any]) -> "PublicUser":
        return cls(
            id=str(doc["_id"]),
            name=doc["name"],
            neighborhood=doc.get("neighborhood", ""),
            bio=doc.get("bio", ""),
            skills=doc.get("skills", []),
            created_at=as_utc(doc["created_at"]),
        )


class PrivateUser(PublicUser):
    email: EmailStr
    is_admin: bool = False
    blocked_ids: list[str] = []
    email_notifications: bool = True

    @classmethod
    def from_doc(cls, doc: dict[str, Any]) -> "PrivateUser":
        return cls(
            **PublicUser.from_doc(doc).model_dump(),
            email=doc["email"],
            is_admin=get_settings().is_admin(doc["email"]),
            blocked_ids=[str(b) for b in doc.get("blocked_ids", [])],
            email_notifications=doc.get("email_notifications", True),
        )


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: PrivateUser


class AuthorSummary(BaseModel):
    id: str
    name: str
    neighborhood: str


# ---------- Posts ----------


class PostCreate(BaseModel):
    kind: PostKind = PostKind.request
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=1, max_length=4000)
    category: Category
    compensation: str = Field(default="", max_length=120)
    neighborhood: str | None = Field(default=None, max_length=80)
    image_url: str | None = Field(default=None, max_length=1000)

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str | None) -> str | None:
        if v is None or not v.strip():
            return None
        if not v.startswith("https://"):
            raise ValueError("image_url must be an https URL")
        return v


class PostStatusUpdate(BaseModel):
    status: PostStatus


class Post(BaseModel):
    id: str
    author_id: str
    author: AuthorSummary | None
    kind: PostKind
    title: str
    description: str
    category: Category
    compensation: str
    neighborhood: str
    image_url: str | None
    status: PostStatus
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict[str, Any], author: dict[str, Any] | None) -> "Post":
        return cls(
            id=str(doc["_id"]),
            author_id=str(doc["author_id"]),
            author=(
                AuthorSummary(id=str(author["_id"]), name=author["name"], neighborhood=author.get("neighborhood", ""))
                if author
                else None
            ),
            kind=doc.get("kind", PostKind.request),
            title=doc["title"],
            description=doc["description"],
            category=doc["category"],
            compensation=doc.get("compensation", ""),
            neighborhood=doc.get("neighborhood", ""),
            image_url=doc.get("image_url"),
            status=doc.get("status", PostStatus.active),
            created_at=as_utc(doc["created_at"]),
        )


# ---------- Messages ----------


class MessageCreate(BaseModel):
    recipient_id: str
    content: str = Field(min_length=1, max_length=2000)
    post_id: str | None = None

    @field_validator("content")
    @classmethod
    def strip_content(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class Message(BaseModel):
    id: str
    post_id: str | None
    sender_id: str
    recipient_id: str
    content: str
    timestamp: datetime

    @classmethod
    def from_doc(cls, doc: dict[str, Any]) -> "Message":
        return cls(
            id=str(doc["_id"]),
            post_id=str(doc["post_id"]) if doc.get("post_id") else None,
            sender_id=str(doc["sender_id"]),
            recipient_id=str(doc["recipient_id"]),
            content=doc["content"],
            timestamp=as_utc(doc["timestamp"]),
        )


class Conversation(BaseModel):
    other_user: AuthorSummary
    last_message: Message


# ---------- Uploads ----------


class UploadSignature(BaseModel):
    cloud_name: str
    api_key: str
    timestamp: int
    folder: str
    signature: str
    upload_url: str


# ---------- Reports & moderation ----------


class ReportTarget(str, Enum):
    post = "post"
    user = "user"


class ReportReason(str, Enum):
    scam = "scam"
    unsafe = "unsafe"
    offensive = "offensive"
    spam = "spam"
    other = "other"


class ReportStatus(str, Enum):
    open = "open"
    resolved = "resolved"


class ReportCreate(BaseModel):
    target_type: ReportTarget
    target_id: str
    reason: ReportReason
    details: str = Field(default="", max_length=1000)


class ReportCreated(BaseModel):
    id: str


class AdminReport(BaseModel):
    id: str
    target_type: ReportTarget
    target_id: str
    target_label: str  # listing title or person's name, for display
    target_hidden: bool  # listing hidden, or person banned
    reason: ReportReason
    details: str
    reporter: AuthorSummary | None
    status: ReportStatus
    created_at: datetime


class HiddenUpdate(BaseModel):
    hidden: bool


class BannedUpdate(BaseModel):
    banned: bool
