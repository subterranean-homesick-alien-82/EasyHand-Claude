from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from ..deps import ACCOUNT_SUSPENDED, CurrentUser, Db
from ..email import password_reset_email, send_email
from ..models import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    PrivateUser,
    RegisterRequest,
    ResetPasswordRequest,
)
from ..ratelimit import rate_limit
from ..security import create_access_token, hash_password, hash_reset_token, new_reset_token, verify_password
from ..utils import as_utc, utcnow

router = APIRouter(prefix="/auth", tags=["auth"])

RESET_TOKEN_LIFETIME = timedelta(hours=1)


# Limits are generous because many people may sign up from one shared IP (a library or senior center).
@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", limit=30, window_seconds=3600))],
)
async def register(body: RegisterRequest, db: Db) -> AuthResponse:
    email = body.email.lower()
    doc = {
        "email": email,
        "hashed_password": hash_password(body.password),
        "name": body.name.strip(),
        "neighborhood": body.neighborhood.strip(),
        "bio": "",
        "skills": [],
        "accepted_terms_at": utcnow(),
        "created_at": utcnow(),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    doc["_id"] = result.inserted_id
    return AuthResponse(access_token=create_access_token(str(doc["_id"])), user=PrivateUser.from_doc(doc))


@router.post(
    "/login",
    response_model=AuthResponse,
    dependencies=[Depends(rate_limit("login", limit=20, window_seconds=300))],
)
async def login(body: LoginRequest, db: Db) -> AuthResponse:
    user = await db.users.find_one({"email": body.email.lower()})
    if user is None or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That email and password don't match. Please try again.")
    if user.get("banned"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, ACCOUNT_SUSPENDED)
    return AuthResponse(access_token=create_access_token(str(user["_id"])), user=PrivateUser.from_doc(user))


@router.get("/me", response_model=PrivateUser)
async def me(user: CurrentUser) -> PrivateUser:
    return PrivateUser.from_doc(user)


@router.post(
    "/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("forgot", limit=5, window_seconds=900))],
)
async def forgot_password(body: ForgotPasswordRequest, db: Db, background: BackgroundTasks) -> dict[str, str]:
    """Email a reset link. Always answers the same way so nobody can find out who has an account."""
    user = await db.users.find_one({"email": body.email.lower()})
    if user is not None and not user.get("banned"):
        token, token_hash = new_reset_token()
        await db.password_resets.insert_one(
            {
                "user_id": user["_id"],
                "token_hash": token_hash,
                "expires_at": utcnow() + RESET_TOKEN_LIFETIME,
                "used": False,
            }
        )
        background.add_task(send_email, password_reset_email(user["email"], user["name"], token))
    return {"detail": "If an account uses that email, we've sent a link to reset the password."}


@router.post(
    "/reset-password",
    response_model=AuthResponse,
    dependencies=[Depends(rate_limit("reset", limit=10, window_seconds=900))],
)
async def reset_password(body: ResetPasswordRequest, db: Db) -> AuthResponse:
    invalid = HTTPException(
        status.HTTP_400_BAD_REQUEST, "This reset link has expired or was already used. Please ask for a new one."
    )
    reset = await db.password_resets.find_one({"token_hash": hash_reset_token(body.token), "used": False})
    if reset is None or as_utc(reset["expires_at"]) < utcnow():
        raise invalid
    user = await db.users.find_one({"_id": reset["user_id"]})
    if user is None or user.get("banned"):
        raise invalid

    now = utcnow()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": hash_password(body.password), "password_changed_at": now}},
    )
    # Every outstanding link for this person stops working once one is used.
    await db.password_resets.update_many({"user_id": user["_id"]}, {"$set": {"used": True}})
    return AuthResponse(access_token=create_access_token(str(user["_id"])), user=PrivateUser.from_doc(user))
