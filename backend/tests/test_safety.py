from conftest import ADMIN_EMAIL

POST = {"title": "Need my gutters cleaned", "description": "Two-story house.", "category": "other"}


async def test_register_requires_terms(client):
    body = {"email": "t@example.com", "password": "password123", "name": "T"}
    assert (await client.post("/auth/register", json=body)).status_code == 422
    assert (await client.post("/auth/register", json={**body, "accepted_terms": False})).status_code == 422
    assert (await client.post("/auth/register", json={**body, "accepted_terms": True})).status_code == 201


async def test_admin_flag(client, register):
    admin, _ = await register(ADMIN_EMAIL)
    user, _ = await register("regular@example.com")
    assert admin["is_admin"] is True
    assert user["is_admin"] is False


async def test_block_hides_listings_and_stops_messages(client, register):
    alice, a = await register("alice@example.com", name="Alice")
    bob, b = await register("bob@example.com", name="Bob")
    await client.post("/posts", headers=b, json=POST)
    await client.post("/messages", headers=b, json={"recipient_id": alice["id"], "content": "hi"})

    res = await client.post(f"/users/{bob['id']}/block", headers=a)
    assert res.status_code == 200 and res.json()["blocked_ids"] == [bob["id"]]

    assert (await client.get("/posts", headers=a)).json() == []
    assert len((await client.get("/posts")).json()) == 1  # others still see it
    assert (await client.get("/messages", headers=a)).json() == []

    r = await client.post("/messages", headers=b, json={"recipient_id": alice["id"], "content": "hello?"})
    assert r.status_code == 403
    r = await client.post("/messages", headers=a, json={"recipient_id": bob["id"], "content": "hi"})
    assert r.status_code == 400

    assert (await client.post(f"/users/{alice['id']}/block", headers=a)).status_code == 400
    await client.delete(f"/users/{bob['id']}/block", headers=a)
    assert len((await client.get("/posts", headers=a)).json()) == 1
    r = await client.post("/messages", headers=b, json={"recipient_id": alice["id"], "content": "hello again"})
    assert r.status_code == 201


async def test_report_and_moderate_listing(client, register):
    _, admin_h = await register(ADMIN_EMAIL, name="Admin")
    reporter, r_h = await register("reporter@example.com", name="Rita")
    _, author_h = await register("author@example.com", name="Sam")
    post = (await client.post("/posts", headers=author_h, json=POST)).json()

    assert (await client.post("/reports", json={"target_type": "post", "target_id": post["id"], "reason": "scam"})).status_code == 401
    bad = await client.post("/reports", headers=author_h, json={"target_type": "post", "target_id": post["id"], "reason": "scam"})
    assert bad.status_code == 400  # can't report your own listing
    res = await client.post(
        "/reports", headers=r_h, json={"target_type": "post", "target_id": post["id"], "reason": "scam", "details": "Asked for gift cards"}
    )
    assert res.status_code == 201

    assert (await client.get("/admin/reports", headers=r_h)).status_code == 403
    reports = (await client.get("/admin/reports", headers=admin_h)).json()
    assert len(reports) == 1
    report = reports[0]
    assert report["target_label"] == POST["title"]
    assert report["reporter"]["name"] == "Rita"
    assert report["details"] == "Asked for gift cards"

    assert (await client.post(f"/admin/posts/{post['id']}/hidden", headers=admin_h, json={"hidden": True})).status_code == 204
    assert (await client.get("/posts")).json() == []
    assert (await client.get(f"/posts/{post['id']}")).status_code == 404
    assert (await client.get(f"/posts/{post['id']}", headers=author_h)).status_code == 200  # author still sees it
    assert (await client.get(f"/posts/{post['id']}", headers=admin_h)).status_code == 200

    assert (await client.post(f"/admin/reports/{report['id']}/resolve", headers=admin_h)).status_code == 204
    assert (await client.get("/admin/reports", headers=admin_h)).json() == []
    assert len((await client.get("/admin/reports", headers=admin_h, params={"status": "resolved"})).json()) == 1


async def test_ban_user(client, register):
    admin, admin_h = await register(ADMIN_EMAIL)
    bad, bad_h = await register("bad@example.com", name="Bad Actor")
    good, good_h = await register("good@example.com")
    await client.post("/posts", headers=bad_h, json=POST)
    await client.post("/reports", headers=good_h, json={"target_type": "user", "target_id": bad["id"], "reason": "unsafe"})
    assert (await client.get("/admin/reports", headers=admin_h)).json()[0]["target_label"] == "Bad Actor"

    assert (await client.post(f"/admin/users/{admin['id']}/banned", headers=admin_h, json={"banned": True})).status_code == 400
    assert (await client.post(f"/admin/users/{bad['id']}/banned", headers=admin_h, json={"banned": True})).status_code == 204

    assert (await client.get("/auth/me", headers=bad_h)).status_code == 403
    login = await client.post("/auth/login", json={"email": "bad@example.com", "password": "password123"})
    assert login.status_code == 403
    assert (await client.get("/posts")).json() == []
    assert (await client.get(f"/users/{bad['id']}")).status_code == 404
    r = await client.post("/messages", headers=good_h, json={"recipient_id": bad["id"], "content": "hi"})
    assert r.status_code == 404

    await client.post(f"/admin/users/{bad['id']}/banned", headers=admin_h, json={"banned": False})
    assert len((await client.get("/posts")).json()) == 1
    assert (await client.get("/auth/me", headers=bad_h)).status_code == 200


async def test_login_rate_limit(client, register):
    await register("rl@example.com")
    for _ in range(20):
        r = await client.post("/auth/login", json={"email": "rl@example.com", "password": "wrong-password"})
        assert r.status_code == 401
    r = await client.post("/auth/login", json={"email": "rl@example.com", "password": "password123"})
    assert r.status_code == 429
    assert "wait" in r.json()["detail"]
