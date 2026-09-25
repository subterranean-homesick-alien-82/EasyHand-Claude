from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_object_id(value: str, name: str = "id") -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Invalid {name}")


def as_utc(value: datetime) -> datetime:
    """Mongo returns naive datetimes unless tz_aware is set; normalise to UTC-aware."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
