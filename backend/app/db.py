from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from .config import Settings


class Database:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


database = Database()


def connect(settings: Settings) -> AsyncIOMotorDatabase:
    if settings.mongo_url.startswith("mongomock://"):
        from mongomock_motor import AsyncMongoMockClient

        database.client = AsyncMongoMockClient()
    else:
        database.client = AsyncIOMotorClient(settings.mongo_url, tz_aware=True)
    database.db = database.client[settings.mongo_db_name]
    return database.db


def disconnect() -> None:
    if database.client is not None:
        database.client.close()
    database.client = None
    database.db = None


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.users.create_index("email", unique=True)
    await db.posts.create_index([("created_at", DESCENDING)])
    await db.posts.create_index([("category", ASCENDING), ("created_at", DESCENDING)])
    await db.posts.create_index("author_id")
    await db.messages.create_index([("sender_id", ASCENDING), ("recipient_id", ASCENDING), ("timestamp", ASCENDING)])
    await db.messages.create_index([("recipient_id", ASCENDING), ("timestamp", DESCENDING)])


def get_db() -> AsyncIOMotorDatabase:
    if database.db is None:
        raise RuntimeError("Database is not connected")
    return database.db
