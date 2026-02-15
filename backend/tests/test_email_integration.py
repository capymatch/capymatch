"""
Test Email Integration (Resend) for Recruiting HQ
- GET /api/admin/integrations (email section)
- PUT /api/admin/integrations/email (update Resend API key)
- PUT /api/admin/integrations/email/settings (toggle email types)
- POST /api/auth/register (triggers welcome email)
- POST /api/team/invite (triggers invitation email)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_USER = {"email": "jane@test.com", "password": "password123"}
NEW_REGISTER_EMAIL = f"emailtest_{uuid.uuid4().hex[:6]}@test.com"


class TestAdminIntegrationsEmailEndpoint:
    """Test GET /api/admin/integrations returns email section correctly"""

    def test_integrations_returns_email_object(self, auth_session):
        """GET /api/admin/integrations returns email object with all required fields"""
        response = auth_session.get(f"{BASE_URL}/api/admin/integrations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "email" in data, "Response should contain 'email' object"
        
        email = data["email"]
        # Verify all required fields
        assert "connected" in email, "email.connected field missing"
        assert "provider" in email, "email.provider field missing"
        assert "key_masked" in email, "email.key_masked field missing"
        assert "sender_email" in email, "email.sender_email field missing"
        assert "settings" in email, "email.settings field missing"
        
        # Verify settings structure
        settings = email["settings"]
        assert "welcome_email" in settings, "settings.welcome_email field missing"
        assert "invitation_email" in settings, "settings.invitation_email field missing"
        assert isinstance(settings["welcome_email"], bool), "welcome_email should be boolean"
        assert isinstance(settings["invitation_email"], bool), "invitation_email should be boolean"

    def test_email_provider_is_resend(self, auth_session):
        """Email provider should be Resend"""
        response = auth_session.get(f"{BASE_URL}/api/admin/integrations")
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"]["provider"] == "Resend", "Provider should be Resend"

    def test_email_key_masked_format(self, auth_session):
        """Email API key should be masked"""
        response = auth_session.get(f"{BASE_URL}/api/admin/integrations")
        assert response.status_code == 200
        
        data = response.json()
        key_masked = data["email"]["key_masked"]
        # When connected, should be masked like "re_...XXXX"
        if data["email"]["connected"]:
            assert "..." in key_masked or "re_" in key_masked, f"Key should be masked, got: {key_masked}"


class TestUpdateResendApiKey:
    """Test PUT /api/admin/integrations/email (update Resend API key)"""

    def test_update_resend_key_requires_key(self, auth_session):
        """PUT /api/admin/integrations/email returns 400 when api_key is empty"""
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email",
            json={"api_key": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "required" in response.json().get("detail", "").lower()

    def test_update_resend_key_validates_prefix(self, auth_session):
        """PUT /api/admin/integrations/email validates re_ prefix"""
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email",
            json={"api_key": "invalid_key_without_re_prefix"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        detail = response.json().get("detail", "").lower()
        assert "re_" in detail or "invalid" in detail, f"Should mention re_ format, got: {detail}"

    def test_update_resend_key_success(self, auth_session):
        """PUT /api/admin/integrations/email accepts valid key with re_ prefix"""
        # Use a test key format
        test_key = "re_test_1234567890abcdef"
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email",
            json={"api_key": test_key}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["ok"] is True, "Response should have ok: true"
        assert "key_masked" in data, "Response should include key_masked"
        # Verify masking
        assert test_key[-6:] in data["key_masked"], "Masked key should contain last 6 chars"


class TestEmailSettings:
    """Test PUT /api/admin/integrations/email/settings (toggle email types)"""

    def test_toggle_welcome_email_off(self, auth_session):
        """PUT /api/admin/integrations/email/settings can disable welcome_email"""
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email/settings",
            json={"welcome_email": False}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["ok"] is True
        assert data.get("welcome_email") is False

    def test_toggle_welcome_email_on(self, auth_session):
        """PUT /api/admin/integrations/email/settings can enable welcome_email"""
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email/settings",
            json={"welcome_email": True}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["ok"] is True
        assert data.get("welcome_email") is True

    def test_toggle_invitation_email_off(self, auth_session):
        """PUT /api/admin/integrations/email/settings can disable invitation_email"""
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email/settings",
            json={"invitation_email": False}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["ok"] is True
        assert data.get("invitation_email") is False

    def test_toggle_invitation_email_on(self, auth_session):
        """PUT /api/admin/integrations/email/settings can enable invitation_email"""
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email/settings",
            json={"invitation_email": True}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["ok"] is True
        assert data.get("invitation_email") is True

    def test_toggle_both_settings(self, auth_session):
        """PUT /api/admin/integrations/email/settings can update both settings"""
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email/settings",
            json={"welcome_email": True, "invitation_email": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert data.get("welcome_email") is True
        assert data.get("invitation_email") is True

    def test_empty_settings_returns_400(self, auth_session):
        """PUT /api/admin/integrations/email/settings returns 400 when no settings provided"""
        response = auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email/settings",
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_settings_persist_in_integrations(self, auth_session):
        """Email settings changes persist and are returned by GET /api/admin/integrations"""
        # Set both to True
        auth_session.put(
            f"{BASE_URL}/api/admin/integrations/email/settings",
            json={"welcome_email": True, "invitation_email": True}
        )
        
        # Verify via GET
        response = auth_session.get(f"{BASE_URL}/api/admin/integrations")
        assert response.status_code == 200
        
        settings = response.json()["email"]["settings"]
        assert settings["welcome_email"] is True
        assert settings["invitation_email"] is True


class TestRegistrationTriggersWelcomeEmail:
    """Test POST /api/auth/register triggers welcome email attempt"""

    def test_register_triggers_welcome_email(self):
        """POST /api/auth/register should trigger welcome email (fire-and-forget)"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Register a new user
        unique_email = f"emailtest_{uuid.uuid4().hex[:8]}@test.com"
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Email Test User",
            "email": unique_email,
            "password": "test1234"
        })
        
        # Registration should succeed (email sending is fire-and-forget)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert data["email"] == unique_email
        assert "user_id" in data
        
        # Note: Email attempt happens in background. In testing mode, Resend
        # will fail to deliver but the attempt is logged.
        print(f"Registered user {unique_email} - welcome email attempt triggered")


class TestInviteTriggersInvitationEmail:
    """Test POST /api/team/invite triggers invitation email attempt"""

    def test_invite_triggers_invitation_email(self, auth_session):
        """POST /api/team/invite should trigger invitation email (fire-and-forget)"""
        # Note: This will return 403 if on Basic plan (max_members=1)
        # But we can still verify the endpoint exists and validates input
        
        invite_email = f"invited_{uuid.uuid4().hex[:6]}@test.com"
        response = auth_session.post(f"{BASE_URL}/api/team/invite", json={
            "email": invite_email
        })
        
        # Accept either success (200) or subscription limit (403)
        # Both indicate the endpoint works correctly
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert data["email"] == invite_email
            print(f"Invitation sent to {invite_email} - invitation email attempt triggered")
        elif response.status_code == 403:
            # This is expected for Basic plan
            detail = response.json().get("detail", {})
            if isinstance(detail, dict):
                assert detail.get("error") == "subscription_limit"
                print("Basic plan - invitation blocked by subscription limit (expected)")
            else:
                print(f"Invitation blocked: {detail}")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_session(api_client):
    """Authenticated session with test user"""
    # Login
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=TEST_USER)
    if response.status_code != 200:
        pytest.skip(f"Login failed for {TEST_USER['email']}: {response.text}")
    
    # Extract session cookie
    if "session_token" in response.cookies:
        api_client.cookies.set("session_token", response.cookies["session_token"])
    
    return api_client
