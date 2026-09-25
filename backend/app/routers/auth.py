from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from ..deps import ACCOUNT_SUSPENDED, CurrentUser, Db
from ..models import AuthResponse, LoginRequest, PrivateUser, RegisterRequest
from ..ratelimit import rate_limit
from ..security import create_access_token, hash_password, verify_password
from ..utils import utcnow

router = APIRouter(prefix="/auth", tags=["auth"])


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
