async def test_register_login_and_me(client, register):
    user, headers = await register("Ada@Example.com", name="Ada")
    assert user["email"] == "ada@example.com"
    assert "hashed_password" not in user

    res = await client.post("/auth/login", json={"email": "ada@example.com", "password": "password123"})
    assert res.status_code == 200
    assert res.json()["user"]["id"] == user["id"]

    res = await client.get("/auth/me", headers=headers)
    assert res.status_code == 200 and res.json()["name"] == "Ada"


async def test_duplicate_email_rejected(client, register):
    await register("dup@example.com")
    res = await client.post(
        "/auth/register", json={"email": "DUP@example.com", "password": "password123", "name": "Other", "accepted_terms": True}
    )
    assert res.status_code == 409


async def test_bad_login_and_missing_token(client, register):
    await register("bob@example.com")
    res = await client.post("/auth/login", json={"email": "bob@example.com", "password": "wrong-password"})
    assert res.status_code == 401
    assert (await client.get("/auth/me")).status_code == 401
    assert (await client.get("/auth/me", headers={"Authorization": "Bearer junk"})).status_code == 401


async def test_update_and_view_profile(client, register):
    user, headers = await register("cara@example.com")
    res = await client.put(
        "/users/profile",
        headers=headers,
        json={"bio": "Retired IT tech", "neighborhood": "Cooper-Young", "skills": ["Tech Coach", " tech coach ", "Printers", ""]},
    )
    assert res.status_code == 200, res.text
    assert res.json()["skills"] == ["Tech Coach", "Printers"]

    public = (await client.get(f"/users/{user['id']}")).json()
    assert public["neighborhood"] == "Cooper-Young"
    assert public["bio"] == "Retired IT tech"
    assert "email" not in public

    assert (await client.get("/users/000000000000000000000000")).status_code == 404
    assert (await client.get("/users/not-an-id")).status_code == 404


def test_error_tracking_starts_only_with_a_dsn(monkeypatch):
    import sentry_sdk

    from app.main import init_error_tracking

    calls = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kwargs: calls.append(kwargs))
    init_error_tracking(None, "test")
    assert calls == []
    init_error_tracking("https://key@o0.ingest.sentry.io/0", "production")
    assert calls[0]["environment"] == "production"
    assert calls[0]["send_default_pii"] is False
