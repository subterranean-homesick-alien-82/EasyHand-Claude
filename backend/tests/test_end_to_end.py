async def test_community_loop(client, register):
    """Profile -> post a lawncare listing -> see it on the feed -> message the author about it."""
    poster, poster_h = await register("maria@example.com", name="Maria", neighborhood="Midtown")
    helper, helper_h = await register("jay@example.com", name="Jay", neighborhood="Midtown")

    await client.put(
        "/users/profile", headers=helper_h, json={"bio": "I mow on weekends.", "skills": ["Lawn Care Enthusiast"]}
    )

    listing = (
        await client.post(
            "/posts",
            headers=poster_h,
            json={
                "title": "Front yard needs mowing",
                "description": "Small front yard, mower available in the shed.",
                "category": "lawncare",
                "compensation": "$30",
            },
        )
    ).json()

    feed = (await client.get("/posts", params={"category": "lawncare"})).json()
    assert feed[0]["id"] == listing["id"]
    assert feed[0]["author"]["id"] == poster["id"]

    sent = await client.post(
        "/messages",
        headers=helper_h,
        json={"recipient_id": feed[0]["author_id"], "post_id": listing["id"], "content": "I can do Saturday morning!"},
    )
    assert sent.status_code == 201

    inbox = (await client.get("/messages", headers=poster_h)).json()
    assert inbox[0]["other_user"]["name"] == "Jay"
    assert inbox[0]["last_message"]["post_id"] == listing["id"]

    helper_profile = (await client.get(f"/users/{helper['id']}")).json()
    assert helper_profile["skills"] == ["Lawn Care Enthusiast"]

    await client.patch(f"/posts/{listing['id']}/status", headers=poster_h, json={"status": "completed"})
    assert (await client.get(f"/posts/{listing['id']}")).json()["status"] == "completed"
