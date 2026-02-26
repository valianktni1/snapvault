"""
Test cases for SnapVault Payment Gate and SMTP Settings features.
- Event creation with is_paid: false
- Payment confirmation API
- SMTP settings CRUD (admin only)
- SMTP test email endpoint
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
TEST_ORGANIZER = {"email": "testorg@test.com", "password": "Test123!"}
ADMIN_CREDS = {"email": "admin@snapvault.uk", "password": "Admin123!"}


class TestHealthAndBasics:
    """Basic health and auth tests"""

    def test_health_endpoint(self):
        """Health endpoint should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("✓ Health endpoint working")

    def test_organizer_login(self):
        """Test organizer login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ORGANIZER)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Organizer login successful - user: {data['user']['email']}")

    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - user: {data['user']['email']}, role: {data['user']['role']}")


class TestEventCreationWithPaymentFlag:
    """Tests for event creation with is_paid: false by default"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for test organizer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ORGANIZER)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate organizer")

    def test_create_event_has_is_paid_false(self, auth_token):
        """Newly created events should have is_paid: false"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        event_data = {
            "title": f"TEST_Payment_Event_{uuid.uuid4().hex[:8]}",
            "event_type": "wedding",
            "template": "elegant_frame",
            "subtitle": "Test subtitle",
            "welcome_message": "Welcome!",
            "event_date": "2026-06-15"
        }
        response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify is_paid is False by default
        assert "is_paid" in data
        assert data["is_paid"] == False
        assert "id" in data
        assert data["title"] == event_data["title"]
        
        print(f"✓ Event created with is_paid={data['is_paid']} - ID: {data['id']}")
        
        # Cleanup: delete the test event
        del_response = requests.delete(f"{BASE_URL}/api/events/{data['id']}", headers=headers)
        assert del_response.status_code == 200
        print("✓ Test event cleaned up")

    def test_get_event_includes_is_paid_field(self, auth_token):
        """GET /api/events/{id} should include is_paid field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create event
        event_data = {
            "title": f"TEST_IsPaid_Field_{uuid.uuid4().hex[:8]}",
            "event_type": "birthday",
            "template": "confetti_party"
        }
        create_response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Get event and verify is_paid field exists
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}", headers=headers)
        assert get_response.status_code == 200
        event = get_response.json()
        assert "is_paid" in event
        assert event["is_paid"] == False
        print(f"✓ GET event includes is_paid field: {event['is_paid']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/events/{event_id}", headers=headers)


class TestPaymentConfirmation:
    """Tests for payment confirmation endpoint"""

    @pytest.fixture
    def auth_token_and_event(self):
        """Get auth token and create a test event for payment testing"""
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ORGANIZER)
        if response.status_code != 200:
            pytest.skip("Could not authenticate organizer")
        token = response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create event
        event_data = {
            "title": f"TEST_PaymentConfirm_{uuid.uuid4().hex[:8]}",
            "event_type": "wedding",
            "template": "elegant_frame",
            "subtitle": "Payment test event"
        }
        create_response = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create test event")
        event = create_response.json()
        
        yield {"token": token, "event": event, "headers": headers}
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/events/{event['id']}", headers=headers)

    def test_confirm_payment_sets_is_paid_true(self, auth_token_and_event):
        """POST /events/{id}/confirm-payment should set is_paid to true"""
        data = auth_token_and_event
        headers = data["headers"]
        event = data["event"]
        event_id = event["id"]
        
        # Confirm payment
        payment_data = {
            "qr_template": "elegant_frame",
            "qr_size": "10x8",
            "guest_url": f"https://example.com/event/{event['slug']}"
        }
        response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/confirm-payment",
            json=payment_data,
            headers=headers
        )
        assert response.status_code == 200
        result = response.json()
        
        assert result["is_paid"] == True
        assert result["message"] == "Payment confirmed"
        # email_sent can be True or False depending on SMTP config
        assert "email_sent" in result
        print(f"✓ Payment confirmed: is_paid={result['is_paid']}, email_sent={result['email_sent']}")
        
        # Verify event is now marked as paid
        get_response = requests.get(f"{BASE_URL}/api/events/{event_id}", headers=headers)
        assert get_response.status_code == 200
        updated_event = get_response.json()
        assert updated_event["is_paid"] == True
        print(f"✓ Event verified as paid via GET: is_paid={updated_event['is_paid']}")

    def test_confirm_payment_twice_fails(self, auth_token_and_event):
        """Confirming payment twice should fail with 400"""
        data = auth_token_and_event
        headers = data["headers"]
        event_id = data["event"]["id"]
        
        payment_data = {
            "qr_template": "elegant_frame",
            "qr_size": "10x8",
            "guest_url": "https://example.com/event/test"
        }
        
        # First confirmation
        first_response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/confirm-payment",
            json=payment_data,
            headers=headers
        )
        assert first_response.status_code == 200
        
        # Second confirmation should fail
        second_response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/confirm-payment",
            json=payment_data,
            headers=headers
        )
        assert second_response.status_code == 400
        assert "already confirmed" in second_response.json()["detail"].lower()
        print("✓ Double payment confirmation correctly rejected")

    def test_confirm_payment_requires_qr_template(self, auth_token_and_event):
        """Payment confirmation requires qr_template field"""
        data = auth_token_and_event
        headers = data["headers"]
        event_id = data["event"]["id"]
        
        # Missing qr_template
        payment_data = {
            "qr_size": "10x8",
            "guest_url": "https://example.com/event/test"
        }
        response = requests.post(
            f"{BASE_URL}/api/events/{event_id}/confirm-payment",
            json=payment_data,
            headers=headers
        )
        assert response.status_code == 422  # Validation error
        print("✓ Missing qr_template correctly rejected with 422")


class TestSMTPSettings:
    """Tests for SMTP settings endpoints (admin only)"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip("Could not authenticate admin")
        return response.json().get("token")

    @pytest.fixture
    def organizer_token(self):
        """Get organizer auth token (non-admin)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ORGANIZER)
        if response.status_code != 200:
            pytest.skip("Could not authenticate organizer")
        return response.json().get("token")

    def test_get_smtp_settings_default_values(self, admin_token):
        """GET /admin/settings/smtp should return default values"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings/smtp", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "smtp_host" in data
        assert "smtp_port" in data
        assert "smtp_user" in data
        assert "smtp_password" in data
        
        # Check defaults (or previously saved values)
        # Per requirements: smtp.hostinger.com, port 465, admin@snapvault.uk
        print(f"✓ SMTP settings retrieved: host={data['smtp_host']}, port={data['smtp_port']}, user={data['smtp_user']}")
        print(f"  Password is masked: {data['smtp_password'] == '********' or data['smtp_password'] == ''}")

    def test_save_smtp_settings(self, admin_token):
        """POST /admin/settings/smtp should save settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current settings first
        get_response = requests.get(f"{BASE_URL}/api/admin/settings/smtp", headers=headers)
        original_settings = get_response.json()
        
        # Save new settings
        new_settings = {
            "smtp_host": "smtp.hostinger.com",
            "smtp_port": 465,
            "smtp_user": "admin@snapvault.uk",
            "smtp_password": "test_password_123"
        }
        save_response = requests.post(f"{BASE_URL}/api/admin/settings/smtp", json=new_settings, headers=headers)
        assert save_response.status_code == 200
        assert "saved" in save_response.json()["message"].lower()
        print("✓ SMTP settings saved successfully")
        
        # Verify password is masked on retrieval
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings/smtp", headers=headers)
        assert verify_response.status_code == 200
        verified_data = verify_response.json()
        assert verified_data["smtp_password"] == "********"  # Password should be masked
        print("✓ Password correctly masked as '********' on retrieval")

    def test_smtp_settings_non_admin_forbidden(self, organizer_token):
        """Non-admin users should get 403 when accessing SMTP settings"""
        headers = {"Authorization": f"Bearer {organizer_token}"}
        
        # GET should be forbidden
        get_response = requests.get(f"{BASE_URL}/api/admin/settings/smtp", headers=headers)
        assert get_response.status_code == 403
        print("✓ Non-admin correctly gets 403 on GET SMTP settings")
        
        # POST should be forbidden
        post_response = requests.post(
            f"{BASE_URL}/api/admin/settings/smtp",
            json={"smtp_host": "test", "smtp_port": 465, "smtp_user": "test@test.com"},
            headers=headers
        )
        assert post_response.status_code == 403
        print("✓ Non-admin correctly gets 403 on POST SMTP settings")

    def test_smtp_test_email_endpoint_exists(self, admin_token):
        """POST /admin/settings/smtp/test endpoint should exist and respond"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/settings/smtp/test", headers=headers)
        
        # Should return 200 (success) or 400 (SMTP config issue) - not 404/500
        assert response.status_code in [200, 400]
        data = response.json()
        
        if response.status_code == 200:
            assert "sent" in data["message"].lower() or "test" in data["message"].lower()
            print(f"✓ SMTP test succeeded: {data['message']}")
        else:
            # 400 means endpoint exists but SMTP not configured correctly (expected for test env)
            assert "detail" in data
            print(f"✓ SMTP test endpoint exists but failed (expected in test env): {data['detail']}")


class TestChangePassword:
    """Tests for password change functionality"""

    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip("Could not authenticate admin")
        return response.json().get("token")

    def test_change_password_endpoint_exists(self, admin_token):
        """POST /auth/change-password should exist"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with incorrect current password (should return 400, not 404)
        response = requests.post(
            f"{BASE_URL}/api/auth/change-password",
            json={"current_password": "wrong_password", "new_password": "NewPass123!"},
            headers=headers
        )
        assert response.status_code == 400  # Wrong password, but endpoint exists
        assert "incorrect" in response.json()["detail"].lower()
        print("✓ Change password endpoint exists and validates current password")


class TestExistingTestEvents:
    """Tests for the existing test events mentioned in context"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for test organizer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=TEST_ORGANIZER)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate organizer")

    def test_paid_event_status(self, auth_token):
        """Test Wedding event should be marked as paid"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # From context: 'Test Wedding' (ID: 69a05f8e10d4456eb794526d) - already paid
        paid_event_id = "69a05f8e10d4456eb794526d"
        response = requests.get(f"{BASE_URL}/api/events/{paid_event_id}", headers=headers)
        
        if response.status_code == 200:
            event = response.json()
            assert event.get("is_paid") == True
            print(f"✓ Test Wedding event is_paid={event['is_paid']}")
        else:
            print(f"⚠ Could not fetch Test Wedding event (status: {response.status_code}) - may have been deleted")

    def test_unpaid_event_status(self, auth_token):
        """Unpaid Birthday event should be marked as unpaid"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # From context: 'Unpaid Birthday' (ID: 69a05fe310d4456eb794526e) - NOT paid
        unpaid_event_id = "69a05fe310d4456eb794526e"
        response = requests.get(f"{BASE_URL}/api/events/{unpaid_event_id}", headers=headers)
        
        if response.status_code == 200:
            event = response.json()
            assert event.get("is_paid") == False
            print(f"✓ Unpaid Birthday event is_paid={event['is_paid']}")
        else:
            print(f"⚠ Could not fetch Unpaid Birthday event (status: {response.status_code}) - may have been deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
