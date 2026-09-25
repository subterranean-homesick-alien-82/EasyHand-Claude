POST = {
    "title": "Help setting up my new iPhone",
    "description": "Need someone to move contacts and photos from my old Android.",
    "category": "tech",
    "compensation": "$25 + coffee",
}


async def test_create_and_list_posts_with_filters(client, register):
    user, headers = await register("dee@example.com", name="Dee", neighborhood="Midtown")
    res = await client.post("/posts", headers=headers, json=POST)
    assert res.status_code == 201, res.text
    post = res.json()
    assert post["status"] == "active"
    assert post["kind"] == "request"
    assert post["neighborhood"] == "Midtown"  # defaults to the author's neighborhood
    assert post["author"]["name"] == "Dee"

    await client.post(
        "/posts",
        headers=headers,
        json={**POST, "title": "Mowing lawns on weekends", "category": "lawncare", "kind": "offer", "neighborhood": "Germantown"},
    )

    all_posts = (await client.get("/posts")).json()
    assert [p["title"] for p in all_posts] == ["Mowing lawns on weekends", POST["title"]]

    tech = (await client.get("/posts", params={"category": "tech"})).json()
    assert [p["id"] for p in tech] == [post["id"]]
    assert len((await client.get("/posts", params={"kind": "offer"})).json()) == 1
    assert len((await client.get("/posts", params={"neighborhood": "germantown"})).json()) == 1
    assert len((await client.get("/posts", params={"q": "iphone"})).json()) == 1
    assert (await client.get("/posts", params={"category": "bogus"})).status_code == 422

    detail = (await client.get(f"/posts/{post['id']}")).json()
    assert detail["title"] == POST["title"]


async def test_post_requires_auth_and_validates(client, register):
    assert (await client.post("/posts", json=POST)).status_code == 401
    _, headers = await register("eve@example.com")
    bad = await client.post("/posts", headers=headers, json={**POST, "image_url": "javascript:alert(1)"})
    assert bad.status_code == 422


async def test_only_author_can_change_status_or_delete(client, register):
    _, author = await register("fay@example.com")
    _, other = await register("gus@example.com")
    post = (await client.post("/posts", headers=author, json=POST)).json()
    url = f"/posts/{post['id']}"

    assert (await client.patch(f"{url}/status", headers=other, json={"status": "completed"})).status_code == 403
    res = await client.patch(f"{url}/status", headers=author, json={"status": "claimed"})
    assert res.status_code == 200 and res.json()["status"] == "claimed"
    assert len((await client.get("/posts", params={"status": "active"})).json()) == 0

    assert (await client.delete(url, headers=other)).status_code == 403
    assert (await client.delete(url, headers=author)).status_code == 204
    assert (await client.get(url)).status_code == 404
