"""SnapVault Events - Backend API Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "test@snapvault.uk"
TEST_PASSWORD = "test1234"


@pytest.fixture(scope="session")
def token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# --- Auth Tests ---
class TestAuth:
    def test_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL

    def test_login_invalid(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": "wrongpassword"})
        assert resp.status_code == 401

    def test_register_duplicate(self):
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={"email": TEST_EMAIL, "password": "test1234", "name": "Test"})
        assert resp.status_code == 400

    def test_me(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == TEST_EMAIL


# --- Event CRUD Tests ---
class TestEvents:
    created_event_id = None

    def test_create_wedding_event(self, auth_headers):
        resp = requests.post(f"{BASE_URL}/api/events", headers=auth_headers, json={
            "title": "TEST_John & Jane Wedding",
            "event_type": "wedding",
            "template": "floral",
            "subtitle": "July 2025",
            "event_date": "2025-07-15",
            "welcome_message": "Welcome to our wedding!"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "TEST_John & Jane Wedding"
        assert data["event_type"] == "wedding"
        assert data["template"] == "floral"
        assert "slug" in data
        assert len(data["slug"]) > 0
        TestEvents.created_event_id = data["id"]
        TestEvents.created_slug = data["slug"]

    def test_get_events(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/events", headers=auth_headers)
        assert resp.status_code == 200
        events = resp.json()
        assert isinstance(events, list)
        ids = [e["id"] for e in events]
        assert TestEvents.created_event_id in ids

    def test_get_single_event(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/events/{TestEvents.created_event_id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == TestEvents.created_event_id
        assert "media_count" in data

    def test_update_event(self, auth_headers):
        resp = requests.put(f"{BASE_URL}/api/events/{TestEvents.created_event_id}", headers=auth_headers, json={
            "subtitle": "Updated subtitle"
        })
        assert resp.status_code == 200
        assert resp.json()["subtitle"] == "Updated subtitle"

    def test_guest_get_event_by_slug(self):
        slug = TestEvents.created_slug
        resp = requests.get(f"{BASE_URL}/api/guest/event/{slug}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["event_type"] == "wedding"

    def test_guest_upload_image(self):
        """Upload a small test image via guest upload"""
        slug = TestEvents.created_slug
        import io
        # Create a minimal valid JPEG
        jpeg_bytes = (
            b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
            b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
            b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
            b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e'
            b'=\x19\x19 2 ())))#$,3 <=0<3) >\x02\x11\x03\x11\x01\x00?\x00\xf5'
            b'\xff\xd9'
        )
        files = {"file": ("test.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
        data = {"uploader_name": "TestGuest"}
        resp = requests.post(f"{BASE_URL}/api/guest/event/{slug}/upload", files=files, data=data)
        assert resp.status_code == 200
        r = resp.json()
        assert r["file_type"] == "image"
        TestEvents.uploaded_media_id = r.get("id")

    def test_get_event_media(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/events/{TestEvents.created_event_id}/media", headers=auth_headers)
        assert resp.status_code == 200
        media = resp.json()
        assert isinstance(media, list)
        assert len(media) >= 1
        m = media[0]
        assert "url" in m
        assert "filename" in m

    def test_delete_media(self, auth_headers):
        if not hasattr(TestEvents, 'uploaded_media_id') or not TestEvents.uploaded_media_id:
            pytest.skip("No media uploaded")
        resp = requests.delete(f"{BASE_URL}/api/media/{TestEvents.uploaded_media_id}", headers=auth_headers)
        assert resp.status_code == 200

    def test_delete_event(self, auth_headers):
        resp = requests.delete(f"{BASE_URL}/api/events/{TestEvents.created_event_id}", headers=auth_headers)
        assert resp.status_code == 200

    def test_deleted_event_not_found(self, auth_headers):
        resp = requests.get(f"{BASE_URL}/api/events/{TestEvents.created_event_id}", headers=auth_headers)
        assert resp.status_code == 404

    def test_invalid_slug_404(self):
        resp = requests.get(f"{BASE_URL}/api/guest/event/nonexistentslug123")
        assert resp.status_code == 404
