import hashlib
import time

from fastapi import APIRouter, HTTPException, status

from ..config import get_settings
from ..deps import CurrentUser
from ..models import UploadSignature

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/signature", response_model=UploadSignature)
async def create_upload_signature(user: CurrentUser) -> UploadSignature:
    """Sign a direct-from-client Cloudinary upload so the API secret never leaves the server."""
    settings = get_settings()
    if not settings.cloudinary_enabled:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Image uploads are not configured")
    timestamp = int(time.time())
    folder = settings.cloudinary_upload_folder
    # Cloudinary signature: sha1 of alphabetically-sorted params joined with '&', followed by the secret.
    to_sign = f"folder={folder}&timestamp={timestamp}{settings.cloudinary_api_secret}"
    return UploadSignature(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        timestamp=timestamp,
        folder=folder,
        signature=hashlib.sha1(to_sign.encode()).hexdigest(),
        upload_url=f"https://api.cloudinary.com/v1_1/{settings.cloudinary_cloud_name}/image/upload",
    )
