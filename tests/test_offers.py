import pytest

pytestmark = pytest.mark.asyncio


async def get_admin_headers(client):
    login_res = await client.post(
        "/auth/login",
        json={"email": "admin@elanora-luxury.com", "password": "AdminPassword123!"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_offers_crud_flow(client):
    admin_headers = await get_admin_headers(client)

    # 1. Initially active offers query
    res = await client.get("/offers/active")
    assert res.status_code == 200
    initial_active = res.json()

    # 2. Admin creates a new 25% off sitewide festive offer
    create_payload = {
        "title": "Royal Diwali Festive Edit",
        "description": "Exclusive 25% savings on all bridal & occasion couture",
        "scope": "sitewide",
        "apply_to": "both",
        "discount_type": "percentage",
        "discount_value": 25.0,
        "badge_text": "FESTIVE 25% OFF",
        "is_active": True
    }
    create_res = await client.post("/offers/", json=create_payload, headers=admin_headers)
    assert create_res.status_code == 201
    offer_data = create_res.json()
    assert offer_data["title"] == "Royal Diwali Festive Edit"
    assert offer_data["discount_value"] == 25.0
    offer_id = offer_data["id"]

    # 3. Public active offers includes this offer
    active_res = await client.get("/offers/active")
    assert active_res.status_code == 200
    active_list = active_res.json()
    assert any(o["id"] == offer_id for o in active_list)

    # 4. Admin toggles offer inactive
    patch_res = await client.patch(f"/offers/{offer_id}", json={"is_active": False}, headers=admin_headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["is_active"] is False

    # 5. Active list no longer contains the paused offer
    active_res_after = await client.get("/offers/active")
    assert active_res_after.status_code == 200
    assert not any(o["id"] == offer_id for o in active_res_after.json())

    # 6. Admin deletes offer
    del_res = await client.delete(f"/offers/{offer_id}", headers=admin_headers)
    assert del_res.status_code == 204
