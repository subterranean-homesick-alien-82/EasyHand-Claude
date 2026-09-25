import pytest
from httpx import ASGITransport, AsyncClient

from app.config import Settings, get_settings
from app.db import connect, disconnect, ensure_indexes
from app.main import create_app
from app.ratelimit import limiter

ADMIN_EMAIL = "admin@example.com"


@pytest.fixture(autouse=True)
def _settings(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", ADMIN_EMAIL)
    get_settings.cache_clear()
    limiter.reset()
    yield
    get_settings.cache_clear()


@pytest.fixture
async def client():
    db = connect(Settings(mongo_url="mongomock://", mongo_db_name="easyhand_test"))
    await ensure_indexes(db)
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    disconnect()


@pytest.fixture
def register(client):
    async def _register(email: str, name: str = "Test User", neighborhood: str = "Midtown", password: str = "password123"):
        res = await client.post(
            "/auth/register",
            json={"email": email, "password": password, "name": name, "neighborhood": neighborhood, "accepted_terms": True},
        )
        assert res.status_code == 201, res.text
        data = res.json()
        return data["user"], {"Authorization": f"Bearer {data['access_token']}"}

    return _register
