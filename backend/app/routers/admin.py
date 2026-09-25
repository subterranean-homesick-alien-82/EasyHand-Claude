from typing import Any

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from pymongo import DESCENDING

from ..deps import AdminUser, Db
from ..models import AdminReport, AuthorSummary, BannedUpdate, HiddenUpdate, ReportStatus, ReportTarget
from ..utils import as_utc, parse_object_id, utcnow

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/reports", response_model=list[AdminReport])
async def list_reports(
    admin: AdminUser,
    db: Db,
    status_filter: Annotated[ReportStatus, Query(alias="status")] = ReportStatus.open,
) -> list[AdminReport]:
    reports = [r async for r in db.reports.find({"status": status_filter.value}).sort("created_at", DESCENDING).limit(200)]

    post_ids = [r["target_id"] for r in reports if r["target_type"] == ReportTarget.post.value]
    user_ids = {r["target_id"] for r in reports if r["target_type"] == ReportTarget.user.value}
    user_ids |= {r["reporter_id"] for r in reports}
    posts = {p["_id"]: p async for p in db.posts.find({"_id": {"$in": post_ids}}, {"title": 1, "hidden": 1})}
    users = {
        u["_id"]: u
        async for u in db.users.find({"_id": {"$in": list(user_ids)}}, {"name": 1, "neighborhood": 1, "banned": 1})
    }

    out = []
    for r in reports:
        if r["target_type"] == ReportTarget.post.value:
            target: dict[str, Any] | None = posts.get(r["target_id"])
            label = target["title"] if target else "(deleted listing)"
            hidden = bool(target and target.get("hidden"))
        else:
            target = users.get(r["target_id"])
            label = target["name"] if target else "(deleted account)"
            hidden = bool(target and target.get("banned"))
        reporter = users.get(r["reporter_id"])
        out.append(
            AdminReport(
                id=str(r["_id"]),
                target_type=r["target_type"],
                target_id=str(r["target_id"]),
                target_label=label,
                target_hidden=hidden,
                reason=r["reason"],
                details=r.get("details", ""),
                reporter=(
                    AuthorSummary(id=str(reporter["_id"]), name=reporter["name"], neighborhood=reporter.get("neighborhood", ""))
                    if reporter
                    else None
                ),
                status=r["status"],
                created_at=as_utc(r["created_at"]),
            )
        )
    return out


@router.post("/reports/{report_id}/resolve", status_code=status.HTTP_204_NO_CONTENT)
async def resolve_report(report_id: str, admin: AdminUser, db: Db) -> None:
    result = await db.reports.update_one(
        {"_id": parse_object_id(report_id, "report id")},
        {"$set": {"status": ReportStatus.resolved.value, "resolved_by": admin["_id"], "resolved_at": utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")


@router.post("/posts/{post_id}/hidden", status_code=status.HTTP_204_NO_CONTENT)
async def set_post_hidden(post_id: str, body: HiddenUpdate, admin: AdminUser, db: Db) -> None:
    result = await db.posts.update_one({"_id": parse_object_id(post_id, "post id")}, {"$set": {"hidden": body.hidden}})
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")


@router.post("/users/{user_id}/banned", status_code=status.HTTP_204_NO_CONTENT)
async def set_user_banned(user_id: str, body: BannedUpdate, admin: AdminUser, db: Db) -> None:
    """Banned people can't log in, and their profile and listings disappear from the site."""
    target = parse_object_id(user_id, "user id")
    if target == admin["_id"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't ban yourself")
    result = await db.users.update_one({"_id": target}, {"$set": {"banned": body.banned}})
    if result.matched_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    await db.posts.update_many({"author_id": target}, {"$set": {"author_banned": body.banned}})
