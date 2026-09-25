from app.db import get_db
from scripts.seed_examples import EXAMPLES, seed


async def test_seed_examples_is_idempotent(client):
    assert await seed(get_db(), "Team@example.com") == len(EXAMPLES)
    assert await seed(get_db(), "team@example.com") == 0

    feed = (await client.get("/posts")).json()
    assert len(feed) == len(EXAMPLES)
    assert all(p["title"].startswith("Example:") for p in feed)
    assert {p["author"]["name"] for p in feed} == {"EasyHand Team"}
