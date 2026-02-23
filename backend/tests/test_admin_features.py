"""
Test admin panel, bulk download, audio upload, and delete inappropriate content features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test@snapvault.uk"
ADMIN_PASS = "test1234"
NON_ADMIN_EMAIL = "testuser2_nonadmin@snapvault.uk"
NON_ADMIN_PASS = "test1234"


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    assert data.get("user", {}).get("role") == "admin", f"Expected admin role, got: {data.get('user', {}).get('role')}"
    return data["token"]


@pytest.fixture(scope="module")
def non_admin_token():
    # Try login first
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": NON_ADMIN_EMAIL, "password": NON_ADMIN_PASS})
    if resp.status_code == 200:
        return resp.json()["token"]
    # Register if not exists
    reg = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": NON_ADMIN_EMAIL, "password": NON_ADMIN_PASS, "name": "Test User Two"
    })
    assert reg.status_code == 200, f"Registration failed: {reg.text}"
    return reg.json()["token"]


@pytest.fixture(scope="module")
def first_event_id(admin_token):
    resp = requests.get(f"{BASE_URL}/api/admin/events", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    events = resp.json()
    if events:
        return events[0]["id"]
    return None


class TestAdminAuth:
    """Admin login and role verification"""

    def test_admin_login_returns_admin_role(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("user", {}).get("role") == "admin"

    def test_non_admin_cannot_access_admin_stats(self, non_admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {non_admin_token}"})
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_admin_stats(self):
        resp = requests.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code in [401, 403]


class TestAdminStats:
    """Admin stats endpoint"""

    def test_admin_stats_returns_200(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200

    def test_admin_stats_has_required_fields(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        assert "total_users" in data
        assert "total_events" in data
        assert "total_media" in data
        assert "storage_used" in data

    def test_admin_stats_values_are_non_negative(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        data = resp.json()
        assert data["total_users"] >= 0
        assert data["total_events"] >= 0
        assert data["total_media"] >= 0


class TestAdminEvents:
    """Admin events listing - should show ALL events"""

    def test_admin_events_returns_200(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/events", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200

    def test_admin_events_is_list(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/events", headers={"Authorization": f"Bearer {admin_token}"})
        assert isinstance(resp.json(), list)

    def test_admin_events_has_organizer_info(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/events", headers={"Authorization": f"Bearer {admin_token}"})
        events = resp.json()
        if events:
            event = events[0]
            assert "id" in event
            assert "title" in event
            # Should have organizer info
            assert "organizer_name" in event or "organizer_email" in event or "organizer_id" in event

    def test_non_admin_cannot_list_admin_events(self, non_admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/events", headers={"Authorization": f"Bearer {non_admin_token}"})
        assert resp.status_code == 403


class TestAdminUsers:
    """Admin users listing"""

    def test_admin_users_returns_200(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200

    def test_admin_users_is_list(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert isinstance(resp.json(), list)

    def test_admin_users_has_required_fields(self, admin_token):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        users = resp.json()
        if users:
            user = users[0]
            assert "id" in user
            assert "name" in user or "email" in user
            assert "role" in user


class TestBulkDownload:
    """Bulk download ZIP endpoint"""

    def test_organizer_can_download_own_event(self, admin_token, first_event_id):
        if not first_event_id:
            pytest.skip("No events available")
        resp = requests.get(
            f"{BASE_URL}/api/events/{first_event_id}/download",
            headers={"Authorization": f"Bearer {admin_token}"},
            stream=True
        )
        # Either 200 (zip) or 404 (no media), both valid
        assert resp.status_code in [200, 404]

    def test_download_returns_zip_content_type(self, admin_token, first_event_id):
        if not first_event_id:
            pytest.skip("No events available")
        resp = requests.get(
            f"{BASE_URL}/api/events/{first_event_id}/download",
            headers={"Authorization": f"Bearer {admin_token}"},
            stream=True
        )
        if resp.status_code == 200:
            assert "zip" in resp.headers.get("content-type", "").lower() or \
                   "octet-stream" in resp.headers.get("content-type", "").lower()

    def test_non_auth_cannot_download(self, first_event_id):
        if not first_event_id:
            pytest.skip("No events available")
        resp = requests.get(f"{BASE_URL}/api/events/{first_event_id}/download")
        assert resp.status_code in [401, 403]

    def test_non_owner_cannot_download_others_event(self, non_admin_token, first_event_id):
        if not first_event_id:
            pytest.skip("No events available")
        resp = requests.get(
            f"{BASE_URL}/api/events/{first_event_id}/download",
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        # Should be 403 or 404 (not owner)
        assert resp.status_code in [403, 404]
