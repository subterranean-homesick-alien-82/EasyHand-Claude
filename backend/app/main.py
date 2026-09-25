import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import DEV_SECRET_KEY, get_settings
from .db import connect, disconnect, ensure_indexes
from .routers import admin, auth, messages, posts, reports, uploads, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.secret_key == DEV_SECRET_KEY:
        logging.getLogger("uvicorn.error").warning("SECRET_KEY is not set; using an insecure development key.")
    db = connect(settings)
    await ensure_indexes(db)
    yield
    disconnect()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="EasyHand API", version="0.1.0", lifespan=lifespan)

    origins = settings.cors_origin_list
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        # Auth uses bearer tokens, not cookies, so credentials are unnecessary (and invalid with "*").
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in (auth.router, users.router, posts.router, messages.router, reports.router, admin.router, uploads.router):
        app.include_router(router)

    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
