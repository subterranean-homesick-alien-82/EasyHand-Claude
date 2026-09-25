from fastapi import APIRouter, HTTPException, status
from pymongo.errors import DuplicateKeyError

from ..deps import CurrentUser, Db
from ..models import AuthResponse, LoginRequest, PrivateUser, RegisterRequest
from ..security import create_access_token, hash_password, verify_password
from ..utils import utcnow

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: Db) -> AuthResponse:
    email = body.email.lower()
    doc = {
        "email": email,
        "hashed_password": hash_password(body.password),
        "name": body.name.strip(),
        "neighborhood": body.neighborhood.strip(),
        "bio": "",
        "skills": [],
        "created_at": utcnow(),
    }
    try:
        result = await db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    doc["_id"] = result.inserted_id
    return AuthResponse(access_token=create_access_token(str(doc["_id"])), user=PrivateUser.from_doc(doc))


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: Db) -> AuthResponse:
    user = await db.users.find_one({"email": body.email.lower()})
    if user is None or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return AuthResponse(access_token=create_access_token(str(user["_id"])), user=PrivateUser.from_doc(user))


@router.get("/me", response_model=PrivateUser)
async def me(user: CurrentUser) -> PrivateUser:
    return PrivateUser.from_doc(user)
