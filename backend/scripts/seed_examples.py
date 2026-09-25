"""Add a few clearly-labelled example listings so the board isn't empty on launch day.

They are posted by an "EasyHand Team" account and every title starts with "Example:", so nobody
mistakes them for real neighbors. Running it again does nothing if the examples already exist.

Usage (from the backend/ folder, with MONGO_URL etc. set as for the server):

    python -m scripts.seed_examples team@your-domain.com

Afterwards, hide or delete the examples from the app once real listings arrive.
"""

import asyncio
import secrets
import sys

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import get_settings
from app.db import connect, disconnect, ensure_indexes
from app.security import hash_password
from app.utils import utcnow

EXAMPLES = [
    {
        "kind": "request",
        "category": "tech",
        "title": "Example: Help setting up my new smartphone",
        "description": "I just got a new phone and need help moving my contacts and photos over, and "
        "learning how to make video calls with my grandkids. About an hour, at my kitchen table.",
        "compensation": "$20 and a cup of coffee",
    },
    {
        "kind": "offer",
        "category": "lawncare",
        "title": "Example: Weekend lawn mowing",
        "description": "I have my own mower and trimmer and can cut small and medium yards on Saturday "
        "mornings. Message me with your street and yard size.",
        "compensation": "From $25 per yard",
    },
    {
        "kind": "request",
        "category": "cleaning",
        "title": "Example: Tidy-up before family visits",
        "description": "Looking for a hand with dusting, vacuuming and the kitchen before relatives come "
        "for the holidays. Supplies are here.",
        "compensation": "$60 for the afternoon",
    },
    {
        "kind": "request",
        "category": "other",
        "title": "Example: Carry boxes down from the attic",
        "description": "About ten boxes of decorations need to come down a pull-down ladder. Should take "
        "less than an hour.",
        "compensation": "$20",
    },
]


async def seed(db: AsyncIOMotorDatabase, team_email: str) -> int:
    """Create the team account if needed and add any missing examples. Returns how many were added."""
    team = await db.users.find_one({"email": team_email.lower()})
    if team is None:
        password = secrets.token_urlsafe(12)
        result = await db.users.insert_one(
            {
                "email": team_email.lower(),
                "hashed_password": hash_password(password),
                "name": "EasyHand Team",
                "neighborhood": "Memphis",
                "bio": "The people behind EasyHand. These listings are examples to show how the board works.",
                "skills": [],
                "accepted_terms_at": utcnow(),
                "created_at": utcnow(),
            }
        )
        team = {"_id": result.inserted_id}
        print(f"Created the EasyHand Team account ({team_email}). Temporary password: {password}")
        print("Use 'Forgot your password?' in the app to choose your own.")

    added = 0
    for example in EXAMPLES:
        if await db.posts.count_documents({"author_id": team["_id"], "title": example["title"]}, limit=1):
            continue
        await db.posts.insert_one(
            {
                **example,
                "author_id": team["_id"],
                "neighborhood": "Memphis",
                "image_url": None,
                "status": "active",
                "created_at": utcnow(),
            }
        )
        added += 1
    return added


async def main(team_email: str) -> None:
    db = connect(get_settings())
    await ensure_indexes(db)
    try:
        added = await seed(db, team_email)
        print(f"Added {added} example listing(s).")
    finally:
        disconnect()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    asyncio.run(main(sys.argv[1]))
