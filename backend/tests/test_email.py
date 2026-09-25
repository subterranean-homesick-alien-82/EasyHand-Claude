import re
from datetime import timedelta

from bson import ObjectId

from app import email
from app.db import get_db
from app.utils import utcnow


def reset_token_from_outbox() -> str:
    match = re.search(r"reset-password\?token=([\w-]+)", email.outbox[-1].text)
    assert match, email.outbox[-1].text
    return match.group(1)


async def test_forgot_and_reset_password(client, register):
    user, old_headers = await register("forgetful@example.com", name="Pat Jones")

    res = await client.post("/auth/forgot-password", json={"email": "FORGETFUL@example.com"})
    assert res.status_code == 202
    assert len(email.outbox) == 1
    msg = email.outbox[0]
    assert msg.to == "forgetful@example.com"
    assert "Hi Pat" in msg.text
    token = reset_token_from_outbox()

    res = await client.post("/auth/reset-password", json={"token": token, "password": "brand-new-pass"})
    assert res.status_code == 200, res.text
    new_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    assert (await client.get("/auth/me", headers=new_headers)).status_code == 200

    # Sessions from before the reset stop working. The check compares whole seconds, so move the
    # reset time forward instead of sleeping to make the old token clearly older.
    await get_db().users.update_one(
        {"_id": ObjectId(user["id"])}, {"$set": {"password_changed_at": utcnow() + timedelta(seconds=2)}}
    )
    assert (await client.get("/auth/me", headers=old_headers)).status_code == 401
    bad = await client.post("/auth/login", json={"email": "forgetful@example.com", "password": "password123"})
    assert bad.status_code == 401
    good = await client.post("/auth/login", json={"email": "forgetful@example.com", "password": "brand-new-pass"})
    assert good.status_code == 200

    # A link only works once.
    again = await client.post("/auth/reset-password", json={"token": token, "password": "another-pass"})
    assert again.status_code == 400


async def test_forgot_password_unknown_email_looks_the_same(client):
    res = await client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert res.status_code == 202
    assert email.outbox == []


async def test_reset_link_expires(client, register):
    await register("late@example.com")
    await client.post("/auth/forgot-password", json={"email": "late@example.com"})
    token = reset_token_from_outbox()
    await get_db().password_resets.update_many({}, {"$set": {"expires_at": utcnow() - timedelta(minutes=1)}})
    res = await client.post("/auth/reset-password", json={"token": token, "password": "brand-new-pass"})
    assert res.status_code == 400
    assert "expired" in res.json()["detail"]


async def test_new_message_email_is_throttled_and_can_be_turned_off(client, register):
    alice, a = await register("alice@example.com", name="Alice Green")
    bob, b = await register("bob@example.com", name="Bob")
    post = (
        await client.post(
            "/posts", headers=b, json={"title": "Fix my Wi-Fi", "description": "Router keeps dropping", "category": "tech"}
        )
    ).json()

    await client.post("/messages", headers=a, json={"recipient_id": bob["id"], "content": "I can help!", "post_id": post["id"]})
    assert len(email.outbox) == 1
    msg = email.outbox[0]
    assert msg.to == "bob@example.com"
    assert msg.subject == "Alice Green sent you a message on EasyHand"
    assert 'about "Fix my Wi-Fi"' in msg.text
    assert f"/chat/{alice['id']}" in msg.text

    # A second message soon after doesn't send another email...
    await client.post("/messages", headers=a, json={"recipient_id": bob["id"], "content": "Saturday ok?"})
    assert len(email.outbox) == 1
    # ...but a reply in the other direction does, and so does a message after the quiet period.
    await client.post("/messages", headers=b, json={"recipient_id": alice["id"], "content": "Yes please"})
    assert [m.to for m in email.outbox] == ["bob@example.com", "alice@example.com"]
    await get_db().message_notifications.update_many({}, {"$set": {"sent_at": utcnow() - timedelta(hours=1)}})
    await client.post("/messages", headers=a, json={"recipient_id": bob["id"], "content": "<b>See you</b>"})
    assert len(email.outbox) == 3
    assert "<b>See you</b>" not in email.outbox[-1].html  # content is escaped

    # Turning notifications off stops them.
    res = await client.put("/users/profile", headers=b, json={"email_notifications": False})
    assert res.json()["email_notifications"] is False
    await get_db().message_notifications.update_many({}, {"$set": {"sent_at": utcnow() - timedelta(hours=1)}})
    await client.post("/messages", headers=a, json={"recipient_id": bob["id"], "content": "Hello?"})
    assert len(email.outbox) == 3
