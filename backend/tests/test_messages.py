async def test_messaging_thread_and_inbox(client, register):
    alice, a = await register("alice@example.com", name="Alice")
    bob, b = await register("bob@example.com", name="Bob")
    carl, c = await register("carl@example.com", name="Carl")

    r = await client.post("/messages", headers=a, json={"recipient_id": bob["id"], "content": "Hi Bob!"})
    assert r.status_code == 201, r.text
    await client.post("/messages", headers=b, json={"recipient_id": alice["id"], "content": "Hey Alice"})
    await client.post("/messages", headers=c, json={"recipient_id": alice["id"], "content": "Carl here"})

    thread = (await client.get(f"/messages/{bob['id']}", headers=a)).json()
    assert [m["content"] for m in thread] == ["Hi Bob!", "Hey Alice"]
    # Bob sees the same thread from his side; Carl's message is not in it.
    assert [m["content"] for m in (await client.get(f"/messages/{alice['id']}", headers=b)).json()] == [
        "Hi Bob!",
        "Hey Alice",
    ]

    inbox = (await client.get("/messages", headers=a)).json()
    assert [(cv["other_user"]["name"], cv["last_message"]["content"]) for cv in inbox] == [
        ("Carl", "Carl here"),
        ("Bob", "Hey Alice"),
    ]


async def test_message_validation(client, register):
    alice, a = await register("alice@example.com")
    bob, _ = await register("bob@example.com")
    assert (await client.post("/messages", json={"recipient_id": bob["id"], "content": "x"})).status_code == 401
    assert (await client.post("/messages", headers=a, json={"recipient_id": alice["id"], "content": "me"})).status_code == 400
    assert (await client.post("/messages", headers=a, json={"recipient_id": bob["id"], "content": "   "})).status_code == 422
    missing = "000000000000000000000000"
    assert (await client.post("/messages", headers=a, json={"recipient_id": missing, "content": "hi"})).status_code == 404
    r = await client.post("/messages", headers=a, json={"recipient_id": bob["id"], "content": "hi", "post_id": missing})
    assert r.status_code == 404
