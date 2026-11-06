import pytest
from datetime import date, timedelta
import time

pytestmark = pytest.mark.asyncio


async def get_admin_headers(client):
    login_res = await client.post(
        "/auth/login",
        json={"email": "admin@elanora-luxury.com", "password": "AdminPassword123!"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def get_client_headers(client):
    login = await client.post(
        "/auth/login",
        json={"email": "test.client@example.com", "password": "ClientPassword123!"}
    )
    if login.status_code == 200:
        return {"Authorization": f"Bearer {login.json()['access_token']}"}
    reg = await client.post(
        "/auth/register",
        json={
            "email": "test.client@example.com",
            "password": "ClientPassword123!",
            "full_name": "Test Client",
            "phone": "+91 98989 89898"
        }
    )
    assert reg.status_code == 201
    login_after = await client.post(
        "/auth/login",
        json={"email": "test.client@example.com", "password": "ClientPassword123!"}
    )
    assert login_after.status_code == 200
    return {"Authorization": f"Bearer {login_after.json()['access_token']}"}


async def ensure_category(client, admin_headers):
    cats = (await client.get("/categories/")).json()
    if cats:
        return cats[0]
    res = await client.post("/categories/", json={"name": "Test Atelier Category"}, headers=admin_headers)
    assert res.status_code == 201
    return res.json()


async def ensure_asset(client, admin_headers, category_id):
    assets = (await client.get("/assets/")).json()
    avail = [a for a in assets if a.get("status") == "available" and not a.get("is_in_dry_cleaning")]
    if avail:
        return avail[0]
    res = await client.post(
        "/assets/",
        json={
            "name": "Test Haute Couture Gown",
            "description": "Exclusive test luxury piece",
            "category_id": category_id,
            "quantity": 1,
            "listing_type": "both",
            "rental_price": 2500,
            "buy_price": 35000,
            "sizes": "M,L",
        },
        headers=admin_headers
    )
    assert res.status_code == 201
    return res.json()[0]


async def test_health_and_root(client):
    res = await client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    health = await client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"


async def test_auth_login_and_me(client):
    # Login as admin
    login_res = await client.post(
        "/auth/login",
        json={"email": "admin@elanora-luxury.com", "password": "AdminPassword123!"}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # Get current user profile
    me_res = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == "admin@elanora-luxury.com"
    assert user_data["role"] == "admin"


async def test_categories_and_plans(client):
    admin_headers = await get_admin_headers(client)
    await ensure_category(client, admin_headers)

    cats = await client.get("/categories/")
    assert cats.status_code == 200
    cat_list = cats.json()
    assert len(cat_list) >= 1

    plans = await client.get("/rental-plans/")
    assert plans.status_code == 200
    plan_list = plans.json()
    assert len(plan_list) >= 1


async def test_assets_catalog(client):
    admin_headers = await get_admin_headers(client)
    cat = await ensure_category(client, admin_headers)
    test_asset = await ensure_asset(client, admin_headers, cat["id"])

    res = await client.get("/assets/")
    assert res.status_code == 200
    assets = res.json()
    assert len(assets) >= 1
    asset_id = test_asset["id"]

    detail = await client.get(f"/assets/{asset_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == asset_id


async def test_contact_inquiry(client):
    res = await client.post(
        "/contact/",
        json={
            "name": "Pooja Hegde",
            "email": "pooja@example.com",
            "phone": "+91 99999 88888",
            "message": "Interested in private bridal consultation for December."
        }
    )
    assert res.status_code == 200
    assert res.json()["status"] == "success"


async def test_end_to_end_booking_lifecycle(client):
    # 1. Login or register test client
    client_headers = await get_client_headers(client)

    # 2. Login as admin
    admin_headers = await get_admin_headers(client)

    # 3. Get plans and find/create an available asset
    plans_res = await client.get("/rental-plans/")
    plan = plans_res.json()[0]

    cat = await ensure_category(client, admin_headers)
    asset = await ensure_asset(client, admin_headers, cat["id"])

    # 4. Create booking
    test_offset = 120 + int(time.time() * 10) % 2000
    pickup_date = (date.today() + timedelta(days=test_offset)).isoformat()
    booking_payload = {
        "rental_plan_id": plan["id"],
        "pickup_date": pickup_date,
        "category_id": asset["category_id"],
        "requested_asset_id": asset["id"],
        "aadhaar_number": "123456789012",
        "pan_number": "ABCDE1234F"
    }
    create_res = await client.post("/bookings/", json=booking_payload, headers=client_headers)
    assert create_res.status_code == 201
    booking = create_res.json()
    booking_id = booking["id"]
    assert booking["status"] == "pending"

    # 5. Pay deposit
    deposit_res = await client.post(f"/payments/deposit/{booking_id}", headers=client_headers)
    assert deposit_res.status_code == 201
    assert deposit_res.json()["status"] == "paid"

    # 6. Admin allocates asset
    alloc_res = await client.post(
        f"/admin/allocate/{booking_id}",
        json={"asset_id": asset["id"]},
        headers=admin_headers
    )
    assert alloc_res.status_code == 200
    assert alloc_res.json()["asset_id"] == asset["id"]

    # 7. Pay rent
    rent_res = await client.post(f"/payments/rent/{booking_id}", headers=client_headers)
    assert rent_res.status_code == 201
    assert rent_res.json()["status"] == "paid"

    # 8. Check tracking timeline
    track_res = await client.get(f"/tracking/bookings/{booking_id}", headers=client_headers)
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert len(track_data["events"]) >= 3

    # 9. Payment breakdown
    breakdown_res = await client.get(f"/payments/breakdown/{booking_id}", headers=client_headers)
    assert breakdown_res.status_code == 200
    assert breakdown_res.json()["booking_id"] == booking_id


async def test_security_and_business_rules(client):
    # 1. Login or register test client
    client_headers = await get_client_headers(client)

    # 2. Login as admin
    admin_headers = await get_admin_headers(client)

    # 3. Ensure category and asset exist
    plans_res = await client.get("/rental-plans/")
    plan = plans_res.json()[0]
    cat = await ensure_category(client, admin_headers)
    asset = await ensure_asset(client, admin_headers, cat["id"])

    test_day_offset = 300 + int(time.time() * 10) % 2000
    booking_res = await client.post(
        "/bookings/",
        json={
            "rental_plan_id": plan["id"],
            "pickup_date": (date.today() + timedelta(days=test_day_offset)).isoformat(),
            "category_id": asset["category_id"],
            "requested_asset_id": asset["id"],
            "aadhaar_number": "998877665544",
            "pan_number": "ABCDE1234F"
        },
        headers=client_headers
    )
    assert booking_res.status_code == 201
    booking_data = booking_res.json()
    assert booking_data["aadhaar_number"] == "XXXXXXXX5544"
    assert "99887766" not in booking_data["aadhaar_number"]

    # 4. Double booking overlap check (must reject with 409)
    conflict_res = await client.post(
        "/bookings/",
        json={
            "rental_plan_id": plan["id"],
            "pickup_date": (date.today() + timedelta(days=test_day_offset)).isoformat(),
            "category_id": asset["category_id"],
            "requested_asset_id": asset["id"],
            "aadhaar_number": "112233445566",
            "pan_number": "XYZAB9876C"
        },
        headers=client_headers
    )
    assert conflict_res.status_code == 409

    # 5. Cannot pay rent before allocation (must reject with 400)
    rent_fail = await client.post(f"/payments/rent/{booking_data['id']}", headers=client_headers)
    assert rent_fail.status_code == 400

    # 6. Admin cannot demote themselves (must reject with 400)
    admin_me = await client.get("/users/me", headers=admin_headers)
    admin_id = admin_me.json()["id"]
    demote_fail = await client.patch(
        f"/users/{admin_id}/role",
        json={"role": "user"},
        headers=admin_headers
    )
    assert demote_fail.status_code == 400

    # 7. OTP Flow: send OTP, verify OTP
    send_otp_res = await client.post(
        "/auth/send-otp",
        json={"phone": "+91 9876543210"}
    )
    assert send_otp_res.status_code == 200
    otp_data = send_otp_res.json()
    assert "dev_otp" in otp_data
    code = otp_data["dev_otp"]

    verify_otp_res = await client.post(
        "/auth/verify-otp",
        json={"phone": "+91 9876543210", "otp": code}
    )
    assert verify_otp_res.status_code == 200
    assert verify_otp_res.json()["verified"] is True

    # 8. User Role Modification & Deletion Flow
    # Create a dummy user - MUST always register as normal user
    dummy_reg = await client.post(
        "/auth/register",
        json={
            "full_name": "Role Change Test",
            "email": "role.change.test@example.com",
            "password": "Password123!",
            "phone": "+91 9123456789"
        }
    )
    assert dummy_reg.status_code == 201
    dummy_user = dummy_reg.json()
    assert dummy_user["role"] == "user"

    # Login check: user remains normal user
    login_dummy = await client.post(
        "/auth/login",
        json={"email": "role.change.test@example.com", "password": "Password123!"}
    )
    assert login_dummy.status_code == 200
    me_dummy = await client.get("/users/me", headers={"Authorization": f"Bearer {login_dummy.json()['access_token']}"})
    assert me_dummy.json()["role"] == "user"

    # Admin changes role to staff
    role_change_res = await client.patch(
        f"/users/{dummy_user['id']}/role",
        json={"role": "staff"},
        headers=admin_headers
    )
    assert role_change_res.status_code == 200
    assert role_change_res.json()["role"] == "staff"

    # Admin activates/deactivates user
    deact_res = await client.patch(
        f"/users/{dummy_user['id']}/activate",
        json={"is_active": False},
        headers=admin_headers
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Admin deletes user
    del_res = await client.delete(
        f"/users/{dummy_user['id']}",
        headers=admin_headers
    )
    assert del_res.status_code == 200
