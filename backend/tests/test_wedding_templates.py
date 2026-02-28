"""
Test Suite for Wedding QR Card Templates Feature
Tests the new premium wedding templates: Golden Elegance, Botanical Garden, Midnight Romance
Plus the renamed Clean Elegant (modern_minimal key)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "templatetest@test.com"
TEST_USER_PASSWORD = "testpass123"
TEST_EVENT_ID = "69a34c7b9a69d63e30b75101"


class TestBackendHealth:
    """Basic backend health checks"""
    
    def test_health_endpoint(self):
        """Verify backend health check works"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("PASS: Backend health check passed")


class TestTemplateImages:
    """Test that background template images are served correctly"""
    
    def test_golden_elegance_image(self):
        """Verify golden_elegance.png is accessible"""
        response = requests.get(f"{BASE_URL}/templates/golden_elegance.png")
        assert response.status_code == 200
        assert response.headers.get('content-type', '').startswith('image/')
        print("PASS: golden_elegance.png is accessible")
    
    def test_botanical_garden_image(self):
        """Verify botanical_garden.png is accessible"""
        response = requests.get(f"{BASE_URL}/templates/botanical_garden.png")
        assert response.status_code == 200
        assert response.headers.get('content-type', '').startswith('image/')
        print("PASS: botanical_garden.png is accessible")
    
    def test_midnight_romance_image(self):
        """Verify midnight_romance.png is accessible"""
        response = requests.get(f"{BASE_URL}/templates/midnight_romance.png")
        assert response.status_code == 200
        assert response.headers.get('content-type', '').startswith('image/')
        print("PASS: midnight_romance.png is accessible")


class TestAuthentication:
    """Test auth flows still work (regression tests)"""
    
    def test_login_success(self):
        """Verify login works with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        print(f"PASS: Login successful for {TEST_USER_EMAIL}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Verify invalid login is rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Invalid credentials correctly rejected")


class TestEventAccess:
    """Test event access with the test event"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not authenticate")
    
    def test_get_event(self, auth_token):
        """Verify test event is accessible"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/events/{TEST_EVENT_ID}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TEST_EVENT_ID
        assert data["event_type"] == "wedding"
        assert data["is_paid"] == True  # Event should be paid for testing
        print(f"PASS: Event {TEST_EVENT_ID} accessible, is_paid={data['is_paid']}")
        return data
    
    def test_get_events_list(self, auth_token):
        """Verify events list is accessible"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/events", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Events list returned {len(data)} events")


class TestEventCreation:
    """Test event creation with new template keys"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not authenticate")
    
    def test_create_event_golden_elegance(self, auth_token):
        """Test creating event with golden_elegance template"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json={
            "title": "TEST_Golden Wedding",
            "event_type": "wedding",
            "template": "golden_elegance",
            "subtitle": "Test Subtitle",
            "welcome_message": "Test welcome",
            "event_date": "2026-06-15"
        }, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["event_type"] == "wedding"
        assert data["template"] == "golden_elegance"
        assert data["is_paid"] == False
        print(f"PASS: Created event with golden_elegance template, id={data['id']}")
        
        # Cleanup - delete the test event
        delete_response = requests.delete(f"{BASE_URL}/api/events/{data['id']}", headers=headers)
        assert delete_response.status_code == 200
        print("PASS: Test event cleaned up")
    
    def test_create_event_botanical_garden(self, auth_token):
        """Test creating event with botanical_garden template"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json={
            "title": "TEST_Botanical Wedding",
            "event_type": "wedding",
            "template": "botanical_garden",
            "subtitle": "Garden Theme"
        }, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["template"] == "botanical_garden"
        print(f"PASS: Created event with botanical_garden template, id={data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/events/{data['id']}", headers=headers)
    
    def test_create_event_midnight_romance(self, auth_token):
        """Test creating event with midnight_romance template"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json={
            "title": "TEST_Midnight Wedding",
            "event_type": "wedding",
            "template": "midnight_romance",
            "subtitle": "Night Theme"
        }, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["template"] == "midnight_romance"
        print(f"PASS: Created event with midnight_romance template, id={data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/events/{data['id']}", headers=headers)
    
    def test_create_event_modern_minimal(self, auth_token):
        """Test creating event with modern_minimal template (Clean Elegant)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json={
            "title": "TEST_Clean Wedding",
            "event_type": "wedding",
            "template": "modern_minimal",
            "subtitle": "Minimal Style"
        }, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["template"] == "modern_minimal"
        print(f"PASS: Created event with modern_minimal template, id={data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/events/{data['id']}", headers=headers)


class TestPaymentSubmission:
    """Test payment submission with new template keys"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not authenticate")
    
    @pytest.fixture
    def test_event(self, auth_token):
        """Create a test event for payment testing"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/events", json={
            "title": "TEST_Payment Event",
            "event_type": "wedding",
            "template": "golden_elegance"
        }, headers=headers)
        data = response.json()
        yield data
        # Cleanup
        requests.delete(f"{BASE_URL}/api/events/{data['id']}", headers=headers)
    
    def test_submit_payment_with_new_template(self, auth_token, test_event):
        """Test payment submission works with new template keys"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/events/{test_event['id']}/submit-payment",
            json={
                "qr_template": "golden_elegance",
                "qr_size": "10x8",
                "guest_url": f"https://example.com/event/{test_event['slug']}"
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["payment_status"] == "awaiting_approval"
        print("PASS: Payment submission with golden_elegance template works")
    
    def test_submit_payment_with_8x6_size(self, auth_token, test_event):
        """Test payment submission works with 8x6 size"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        # First submit with 10x8
        requests.post(
            f"{BASE_URL}/api/events/{test_event['id']}/submit-payment",
            json={
                "qr_template": "botanical_garden",
                "qr_size": "8x6",
                "guest_url": f"https://example.com/event/{test_event['slug']}"
            },
            headers=headers
        )
        # Get event and verify submission was recorded
        get_response = requests.get(f"{BASE_URL}/api/events/{test_event['id']}", headers=headers)
        data = get_response.json()
        assert data["payment_status"] == "awaiting_approval"
        print("PASS: Payment submission with 8x6 size works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
