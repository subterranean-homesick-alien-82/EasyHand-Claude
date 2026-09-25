from fastapi import APIRouter, Depends, HTTPException, status

from ..deps import CurrentUser, Db
from ..models import ReportCreate, ReportCreated, ReportStatus, ReportTarget
from ..ratelimit import rate_limit
from ..utils import parse_object_id, utcnow

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post(
    "",
    response_model=ReportCreated,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("report", limit=20, window_seconds=3600))],
)
async def create_report(body: ReportCreate, user: CurrentUser, db: Db) -> ReportCreated:
    """Flag a listing or a person for the moderators to review."""
    target_id = parse_object_id(body.target_id, "target id")
    if body.target_type == ReportTarget.post:
        target = await db.posts.find_one({"_id": target_id}, {"author_id": 1})
        owner_id = target["author_id"] if target else None
    else:
        target = await db.users.find_one({"_id": target_id}, {"_id": 1})
        owner_id = target_id if target else None
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nothing to report")
    if owner_id == user["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't report yourself")

    result = await db.reports.insert_one(
        {
            "reporter_id": user["_id"],
            "target_type": body.target_type.value,
            "target_id": target_id,
            "reason": body.reason.value,
            "details": body.details.strip(),
            "status": ReportStatus.open.value,
            "created_at": utcnow(),
        }
    )
    return ReportCreated(id=str(result.inserted_id))
