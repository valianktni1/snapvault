"""
Test cases for Forgot Password and Reset Password functionality.
Tests cover:
- Forgot password endpoint for non-existent emails (returns success for security)
- Forgot password endpoint for existing emails (returns 503 when SMTP not configured)
- Reset password with valid token
- Reset password with expired token
- Reset password with invalid token
- Password validation (minimum 6 characters)
- Login verification after password reset
"""
import pytest
import requests
import os
import jwt
from datetime import datetime, timezone, timedelta

# Get BASE_URL from environment (includes /api prefix)
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
JWT_SECRET = 'snapvault-events-secure-key-2024-selfhosted-change-in-prod'

# Test user - known to exist in system
TEST_USER_ID = "69a05f8310d4456eb794526c"
TEST_USER_EMAIL = "testorg@test.com"
TEST_USER_PASSWORD = "Test123!"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def valid_reset_token():
    """Generate a valid reset token for testing"""
    return jwt.encode(
        {"sub": TEST_USER_ID, "type": "reset", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        JWT_SECRET, algorithm="HS256"
    )


@pytest.fixture
def expired_reset_token():
    """Generate an expired reset token for testing"""
    return jwt.encode(
        {"sub": TEST_USER_ID, "type": "reset", "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
        JWT_SECRET, algorithm="HS256"
    )


class TestForgotPassword:
    """Tests for POST /api/auth/forgot-password endpoint"""

    def test_forgot_password_nonexistent_email_returns_success(self, api_client):
        """For security, non-existent emails should return success message"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent_user_12345@test.com",
            "site_url": BASE_URL
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "if an account exists" in data["message"].lower()

    def test_forgot_password_existing_email_returns_503_when_smtp_not_configured(self, api_client):
        """Existing emails should return 503 when SMTP is not configured"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": TEST_USER_EMAIL,
            "site_url": BASE_URL
        })
        
        # In preview environment, SMTP is not configured, so expect 503
        # This is expected behavior - the endpoint correctly attempts to send email
        # and fails gracefully when SMTP is unavailable
        assert response.status_code == 503
        data = response.json()
        assert "detail" in data
        # Error message should indicate email service issue
        assert "email" in data["detail"].lower() or "send" in data["detail"].lower()

    def test_forgot_password_requires_email(self, api_client):
        """Request without email should fail validation"""
        response = api_client.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "site_url": BASE_URL
        })
        
        assert response.status_code == 422  # Validation error


class TestResetPassword:
    """Tests for POST /api/auth/reset-password endpoint"""

    def test_reset_password_with_valid_token(self, api_client):
        """Password reset with valid token should succeed"""
        # Generate fresh token
        valid_token = jwt.encode(
            {"sub": TEST_USER_ID, "type": "reset", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            JWT_SECRET, algorithm="HS256"
        )
        
        new_password = "TempTestPassword123!"
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": valid_token,
            "new_password": new_password
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "success" in data["message"].lower()
        
        # Verify new password works
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": new_password
        })
        assert login_response.status_code == 200
        
        # Restore original password
        restore_token = jwt.encode(
            {"sub": TEST_USER_ID, "type": "reset", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            JWT_SECRET, algorithm="HS256"
        )
        api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": restore_token,
            "new_password": TEST_USER_PASSWORD
        })

    def test_reset_password_with_expired_token(self, api_client, expired_reset_token):
        """Password reset with expired token should fail"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": expired_reset_token,
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()

    def test_reset_password_with_invalid_token(self, api_client):
        """Password reset with invalid token should fail"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "completely_invalid_token_12345",
            "new_password": "NewPassword123!"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_reset_password_short_password_rejected(self, api_client, valid_reset_token):
        """Password less than 6 characters should be rejected"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": valid_reset_token,
            "new_password": "abc"  # Too short
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "6 characters" in data["detail"] or "short" in data["detail"].lower()

    def test_old_password_rejected_after_reset(self, api_client):
        """After password reset, old password should not work"""
        # First reset to new password
        reset_token = jwt.encode(
            {"sub": TEST_USER_ID, "type": "reset", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            JWT_SECRET, algorithm="HS256"
        )
        
        new_password = "AnotherTempPassword456!"
        api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": new_password
        })
        
        # Try old password - should fail
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD  # Old password
        })
        assert login_response.status_code == 401
        
        # Try new password - should succeed
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": new_password
        })
        assert login_response.status_code == 200
        
        # Restore original password
        restore_token = jwt.encode(
            {"sub": TEST_USER_ID, "type": "reset", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            JWT_SECRET, algorithm="HS256"
        )
        api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": restore_token,
            "new_password": TEST_USER_PASSWORD
        })


class TestLoginRegisterRegression:
    """Regression tests to ensure existing auth functionality still works"""

    def test_login_with_valid_credentials(self, api_client):
        """Standard login should work"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_USER_EMAIL

    def test_login_with_invalid_credentials(self, api_client):
        """Login with wrong password should fail"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": "wrong_password_12345"
        })
        
        assert response.status_code == 401

    def test_register_new_user(self, api_client):
        """New user registration should work"""
        import uuid
        unique_email = f"test_forgot_pwd_{uuid.uuid4().hex[:8]}@test.com"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Test User Forgot Pwd"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
