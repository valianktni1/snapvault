"""
Test suite for SnapVault Payment Flow - Iteration 5
Tests the reworked payment flow:
1. Organiser creates event → payment_status='unpaid', is_paid=false
2. Organiser submits payment → payment_status='awaiting_approval', is_paid=false (via submit-payment)
3. Admin approves → is_paid=true, payment_status='approved' (via admin approve-payment)

Key verification:
- Organiser CANNOT self-approve (submit-payment does NOT set is_paid=true)
- Only admin can approve and set is_paid=true
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORGANIZER_EMAIL = "testorg@test.com"
ORGANIZER_PASSWORD = "Test123!"
ADMIN_EMAIL = "admin@snapvault.uk"
ADMIN_PASSWORD = "Admin123!"

@pytest.fixture(scope="module")
def organizer_token():
    """Login as organizer and return token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORGANIZER_EMAIL,
        "password": ORGANIZER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Organizer login failed: {response.text}")
    return response.json()["token"]

@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json()["token"]

@pytest.fixture
def organizer_session(organizer_token):
    """Session with organizer auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {organizer_token}",
        "Content-Type": "application/json"
    })
    return session

@pytest.fixture
def admin_session(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    })
    return session


# =============================================================================
# TEST: Health Check
# =============================================================================
class TestHealth:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"
        print("✓ API health check passed")


# =============================================================================
# TEST: Event Creation - Verify new events start as unpaid
# =============================================================================
class TestEventCreation:
    """Test that new events are created with payment_status='unpaid' and is_paid=false"""
    
    def test_create_event_starts_unpaid(self, organizer_session):
        """New event should have payment_status='unpaid' and is_paid=false"""
        unique_title = f"TEST_PaymentFlow_{int(time.time())}"
        response = organizer_session.post(f"{BASE_URL}/api/events", json={
            "title": unique_title,
            "event_type": "wedding",
            "template": "elegant_frame",
            "subtitle": "Test payment flow",
            "welcome_message": "Welcome to our test",
            "event_date": "2026-06-15"
        })
        
        assert response.status_code == 200, f"Failed to create event: {response.text}"
        data = response.json()
        
        # Verify event is created with correct payment status
        assert data.get("is_paid") == False, f"Expected is_paid=False, got {data.get('is_paid')}"
        assert data.get("payment_status") == "unpaid", f"Expected payment_status='unpaid', got {data.get('payment_status')}"
        assert "id" in data, "Event should have an ID"
        assert "slug" in data, "Event should have a slug"
        
        print(f"✓ Event created with id={data['id']}, is_paid=False, payment_status='unpaid'")
        
        # Store event_id for later cleanup
        pytest.event_id_for_cleanup = data["id"]
        return data["id"]


# =============================================================================
# TEST: Submit Payment Endpoint (Organizer)
# =============================================================================
class TestSubmitPayment:
    """Test the organiser submit-payment endpoint"""
    
    @pytest.fixture
    def fresh_event(self, organizer_session):
        """Create a fresh unpaid event for testing"""
        unique_title = f"TEST_SubmitPayment_{int(time.time())}"
        response = organizer_session.post(f"{BASE_URL}/api/events", json={
            "title": unique_title,
            "event_type": "birthday",
            "template": "confetti_party",
            "subtitle": "Submit payment test"
        })
        assert response.status_code == 200
        return response.json()
    
    def test_submit_payment_sets_awaiting_approval(self, organizer_session, fresh_event):
        """
        POST /events/{id}/submit-payment should:
        - Set payment_status to 'awaiting_approval'
        - Keep is_paid as False (organiser cannot self-approve)
        """
        event_id = fresh_event["id"]
        guest_url = f"https://example.com/event/{fresh_event['slug']}"
        
        response = organizer_session.post(f"{BASE_URL}/api/events/{event_id}/submit-payment", json={
            "qr_template": "confetti_party",
            "qr_size": "10x8",
            "guest_url": guest_url
        })
        
        assert response.status_code == 200, f"Submit payment failed: {response.text}"
        data = response.json()
        
        # Verify response indicates awaiting_approval
        assert data.get("payment_status") == "awaiting_approval", \
            f"Expected payment_status='awaiting_approval', got {data.get('payment_status')}"
        
        print(f"✓ Submit payment returns payment_status='awaiting_approval'")
        
        # GET event to verify is_paid is still False
        get_response = organizer_session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        event_data = get_response.json()
        
        assert event_data.get("is_paid") == False, \
            f"CRITICAL: is_paid should be False after submit-payment but got {event_data.get('is_paid')}"
        assert event_data.get("payment_status") == "awaiting_approval", \
            f"Expected payment_status='awaiting_approval', got {event_data.get('payment_status')}"
        
        print(f"✓ Organiser CANNOT self-approve: is_paid still False after submit-payment")
        
        # Cleanup
        organizer_session.delete(f"{BASE_URL}/api/events/{event_id}")
    
    def test_submit_payment_requires_qr_template(self, organizer_session, fresh_event):
        """Submit payment should require qr_template field"""
        event_id = fresh_event["id"]
        
        response = organizer_session.post(f"{BASE_URL}/api/events/{event_id}/submit-payment", json={
            "qr_size": "10x8",
            "guest_url": "https://example.com/event/test"
        })
        
        # Should fail without qr_template
        assert response.status_code in [400, 422], f"Expected validation error, got {response.status_code}"
        print(f"✓ Submit payment correctly requires qr_template field")
        
        # Cleanup
        organizer_session.delete(f"{BASE_URL}/api/events/{event_id}")
    
    def test_submit_payment_on_already_paid_event_fails(self, organizer_session, admin_session):
        """Cannot submit payment for an already paid/approved event"""
        # Create event
        unique_title = f"TEST_AlreadyPaid_{int(time.time())}"
        create_resp = organizer_session.post(f"{BASE_URL}/api/events", json={
            "title": unique_title,
            "event_type": "corporate",
            "template": "professional_navy"
        })
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # Submit payment first
        guest_url = f"https://example.com/event/{create_resp.json()['slug']}"
        organizer_session.post(f"{BASE_URL}/api/events/{event_id}/submit-payment", json={
            "qr_template": "professional_navy",
            "qr_size": "10x8",
            "guest_url": guest_url
        })
        
        # Admin approves
        admin_session.post(f"{BASE_URL}/api/admin/events/{event_id}/approve-payment")
        
        # Try to submit payment again - should fail
        response = organizer_session.post(f"{BASE_URL}/api/events/{event_id}/submit-payment", json={
            "qr_template": "tech_modern",
            "qr_size": "8x6",
            "guest_url": guest_url
        })
        
        assert response.status_code == 400, f"Expected 400 for already paid event, got {response.status_code}"
        print(f"✓ Submit payment correctly rejects already paid events")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/events/{event_id}")


# =============================================================================
# TEST: Admin Approve Payment Endpoint
# =============================================================================
class TestAdminApprovePayment:
    """Test the admin approve-payment endpoint"""
    
    @pytest.fixture
    def awaiting_event(self, organizer_session):
        """Create an event in awaiting_approval state"""
        unique_title = f"TEST_AdminApprove_{int(time.time())}"
        create_resp = organizer_session.post(f"{BASE_URL}/api/events", json={
            "title": unique_title,
            "event_type": "wedding",
            "template": "elegant_frame"
        })
        assert create_resp.status_code == 200
        event = create_resp.json()
        
        # Submit payment to set awaiting_approval
        guest_url = f"https://example.com/event/{event['slug']}"
        submit_resp = organizer_session.post(f"{BASE_URL}/api/events/{event['id']}/submit-payment", json={
            "qr_template": "elegant_frame",
            "qr_size": "10x8",
            "guest_url": guest_url
        })
        assert submit_resp.status_code == 200
        return event
    
    def test_admin_approve_sets_is_paid_true(self, admin_session, organizer_session, awaiting_event):
        """
        POST /admin/events/{id}/approve-payment should:
        - Set is_paid to True
        - Set payment_status to 'approved'
        """
        event_id = awaiting_event["id"]
        
        response = admin_session.post(f"{BASE_URL}/api/admin/events/{event_id}/approve-payment")
        
        assert response.status_code == 200, f"Admin approve failed: {response.text}"
        data = response.json()
        
        assert data.get("is_paid") == True, f"Expected is_paid=True, got {data.get('is_paid')}"
        print(f"✓ Admin approve sets is_paid=True")
        
        # Verify by GET
        get_response = organizer_session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_response.status_code == 200
        event_data = get_response.json()
        
        assert event_data.get("is_paid") == True, \
            f"GET event: Expected is_paid=True, got {event_data.get('is_paid')}"
        assert event_data.get("payment_status") == "approved", \
            f"Expected payment_status='approved', got {event_data.get('payment_status')}"
        
        print(f"✓ Event is now paid and approved after admin approval")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/events/{event_id}")
    
    def test_admin_approve_already_approved_fails(self, admin_session, organizer_session):
        """Cannot approve an already approved event"""
        # Create and approve event
        unique_title = f"TEST_DoubleApprove_{int(time.time())}"
        create_resp = organizer_session.post(f"{BASE_URL}/api/events", json={
            "title": unique_title,
            "event_type": "birthday",
            "template": "balloon_fun"
        })
        assert create_resp.status_code == 200
        event = create_resp.json()
        
        guest_url = f"https://example.com/event/{event['slug']}"
        organizer_session.post(f"{BASE_URL}/api/events/{event['id']}/submit-payment", json={
            "qr_template": "balloon_fun",
            "qr_size": "10x8",
            "guest_url": guest_url
        })
        
        # First approval
        first_resp = admin_session.post(f"{BASE_URL}/api/admin/events/{event['id']}/approve-payment")
        assert first_resp.status_code == 200
        
        # Second approval should fail
        second_resp = admin_session.post(f"{BASE_URL}/api/admin/events/{event['id']}/approve-payment")
        assert second_resp.status_code == 400, f"Expected 400 for already approved, got {second_resp.status_code}"
        
        print(f"✓ Admin approve correctly rejects already approved events")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/events/{event['id']}")
    
    def test_organizer_cannot_use_admin_approve(self, organizer_session):
        """Organizer should NOT be able to call admin approve endpoint"""
        # Create event
        unique_title = f"TEST_OrgApprove_{int(time.time())}"
        create_resp = organizer_session.post(f"{BASE_URL}/api/events", json={
            "title": unique_title,
            "event_type": "wedding",
            "template": "modern_minimal"
        })
        assert create_resp.status_code == 200
        event_id = create_resp.json()["id"]
        
        # Try to use admin endpoint as organizer
        response = organizer_session.post(f"{BASE_URL}/api/admin/events/{event_id}/approve-payment")
        
        # Should be forbidden
        assert response.status_code == 403, \
            f"CRITICAL: Organizer should NOT have access to admin approve endpoint. Got {response.status_code}"
        
        print(f"✓ Organizer correctly denied access to admin approve-payment endpoint")
        
        # Cleanup
        organizer_session.delete(f"{BASE_URL}/api/events/{event_id}")


# =============================================================================
# TEST: Admin Events List - Payment Column
# =============================================================================
class TestAdminEventsPaymentColumn:
    """Test that admin events list shows correct payment status"""
    
    def test_admin_events_includes_payment_status(self, admin_session):
        """Admin events list should include payment status fields"""
        response = admin_session.get(f"{BASE_URL}/api/admin/events")
        
        assert response.status_code == 200, f"Admin events failed: {response.text}"
        events = response.json()
        
        if len(events) > 0:
            event = events[0]
            assert "is_paid" in event, "Event should have is_paid field"
            assert "payment_status" in event, "Event should have payment_status field"
            print(f"✓ Admin events list includes payment fields (is_paid, payment_status)")
        else:
            print("⚠ No events to verify payment fields (but endpoint works)")


# =============================================================================
# TEST: SMTP Settings
# =============================================================================
class TestSMTPSettings:
    """Test SMTP settings endpoint exists and returns defaults"""
    
    def test_get_smtp_settings_returns_defaults(self, admin_session):
        """SMTP settings should return Hostinger defaults"""
        response = admin_session.get(f"{BASE_URL}/api/admin/settings/smtp")
        
        assert response.status_code == 200, f"SMTP settings failed: {response.text}"
        data = response.json()
        
        # Should have smtp fields
        assert "smtp_host" in data, "Should have smtp_host"
        assert "smtp_port" in data, "Should have smtp_port"
        assert "smtp_user" in data, "Should have smtp_user"
        
        # Check Hostinger defaults
        assert data.get("smtp_host") == "smtp.hostinger.com", \
            f"Expected smtp.hostinger.com, got {data.get('smtp_host')}"
        assert data.get("smtp_port") == 465, f"Expected port 465, got {data.get('smtp_port')}"
        assert data.get("smtp_user") == "admin@snapvault.uk", \
            f"Expected admin@snapvault.uk, got {data.get('smtp_user')}"
        
        print(f"✓ SMTP settings pre-filled with Hostinger defaults")
    
    def test_organizer_cannot_access_smtp(self, organizer_session):
        """Organizer should not have access to SMTP settings"""
        response = organizer_session.get(f"{BASE_URL}/api/admin/settings/smtp")
        assert response.status_code == 403, \
            f"Organizer should not access SMTP settings, got {response.status_code}"
        print(f"✓ SMTP settings correctly restricted to admin only")


# =============================================================================
# TEST: Full Payment Flow E2E
# =============================================================================
class TestFullPaymentFlowE2E:
    """End-to-end test of the complete payment flow"""
    
    def test_complete_payment_flow(self, organizer_session, admin_session):
        """
        Complete flow:
        1. Organizer creates event → unpaid
        2. Organizer submits payment → awaiting_approval
        3. Admin approves → paid/approved
        """
        # Step 1: Create event
        unique_title = f"TEST_E2E_Flow_{int(time.time())}"
        create_resp = organizer_session.post(f"{BASE_URL}/api/events", json={
            "title": unique_title,
            "event_type": "wedding",
            "template": "romantic_floral",
            "subtitle": "E2E Test Wedding"
        })
        assert create_resp.status_code == 200
        event = create_resp.json()
        event_id = event["id"]
        
        assert event["is_paid"] == False
        assert event["payment_status"] == "unpaid"
        print(f"✓ Step 1: Event created with is_paid=False, payment_status='unpaid'")
        
        # Step 2: Submit payment
        guest_url = f"https://qr-upload-staging.preview.emergentagent.com/event/{event['slug']}"
        submit_resp = organizer_session.post(f"{BASE_URL}/api/events/{event_id}/submit-payment", json={
            "qr_template": "romantic_floral",
            "qr_size": "10x8",
            "guest_url": guest_url
        })
        assert submit_resp.status_code == 200
        submit_data = submit_resp.json()
        
        assert submit_data["payment_status"] == "awaiting_approval"
        
        # Verify event still not paid
        get_resp = organizer_session.get(f"{BASE_URL}/api/events/{event_id}")
        assert get_resp.status_code == 200
        event_after_submit = get_resp.json()
        assert event_after_submit["is_paid"] == False, "CRITICAL: is_paid should still be False"
        assert event_after_submit["payment_status"] == "awaiting_approval"
        print(f"✓ Step 2: Submit payment set payment_status='awaiting_approval', is_paid still False")
        
        # Step 3: Admin approves
        approve_resp = admin_session.post(f"{BASE_URL}/api/admin/events/{event_id}/approve-payment")
        assert approve_resp.status_code == 200
        approve_data = approve_resp.json()
        
        assert approve_data["is_paid"] == True
        
        # Verify final state
        final_get = organizer_session.get(f"{BASE_URL}/api/events/{event_id}")
        assert final_get.status_code == 200
        final_event = final_get.json()
        
        assert final_event["is_paid"] == True
        assert final_event["payment_status"] == "approved"
        print(f"✓ Step 3: Admin approved - is_paid=True, payment_status='approved'")
        
        print(f"✓ COMPLETE: Full payment flow E2E test passed!")
        
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/events/{event_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
