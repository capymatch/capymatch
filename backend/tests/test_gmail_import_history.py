"""
Gmail History Import Feature Tests
Tests backend endpoints:
- POST /api/gmail/import-history - Start import (403 if Gmail not connected)
- GET /api/gmail/import-history/{run_id}/status - Poll status (404 if not found)
- POST /api/gmail/import-history/{run_id}/confirm - Confirm import (404 if not found, 400 if empty selection)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestGmailImportHistory:
    """Tests for Gmail History Import feature endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as demo user and get session token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with demo credentials
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@capymatch.com", "password": "demo2026"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("session_token")
        assert token, "No session_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    # ─── POST /api/gmail/import-history Tests ───
    
    def test_import_history_returns_403_when_gmail_not_connected(self):
        """Demo user doesn't have Gmail connected, so should return 403"""
        response = self.session.post(f"{BASE_URL}/api/gmail/import-history")
        
        assert response.status_code == 403, f"Expected 403 but got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "not connected" in data["detail"].lower()
    
    def test_import_history_requires_authentication(self):
        """Should return 401 without auth token"""
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.post(f"{BASE_URL}/api/gmail/import-history")
        assert response.status_code == 401, f"Expected 401 but got {response.status_code}"
        unauth_session.close()
    
    # ─── GET /api/gmail/import-history/{run_id}/status Tests ───
    
    def test_import_status_returns_404_for_nonexistent_run(self):
        """Should return 404 for fake/non-existent run_id"""
        response = self.session.get(f"{BASE_URL}/api/gmail/import-history/fake_id/status")
        
        assert response.status_code == 404, f"Expected 404 but got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_import_status_returns_404_for_random_uuid_run(self):
        """Should return 404 for random UUID format run_id"""
        response = self.session.get(f"{BASE_URL}/api/gmail/import-history/import_abc123xyz/status")
        
        assert response.status_code == 404, f"Expected 404 but got {response.status_code}"
        data = response.json()
        assert "detail" in data
    
    def test_import_status_requires_authentication(self):
        """Should return 401 without auth token"""
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.get(f"{BASE_URL}/api/gmail/import-history/fake_id/status")
        assert response.status_code == 401, f"Expected 401 but got {response.status_code}"
        unauth_session.close()
    
    # ─── POST /api/gmail/import-history/{run_id}/confirm Tests ───
    
    def test_confirm_import_returns_404_for_nonexistent_run(self):
        """Should return 404 for fake/non-existent run_id"""
        response = self.session.post(
            f"{BASE_URL}/api/gmail/import-history/fake_id/confirm",
            json={"selected": [{"school_id": "Test University"}]}
        )
        
        assert response.status_code == 404, f"Expected 404 but got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
    
    def test_confirm_import_returns_404_for_random_uuid_run(self):
        """Should return 404 for random UUID format run_id"""
        response = self.session.post(
            f"{BASE_URL}/api/gmail/import-history/import_xyz987abc/confirm",
            json={"selected": [{"school_id": "Test University"}]}
        )
        
        assert response.status_code == 404, f"Expected 404 but got {response.status_code}"
    
    def test_confirm_import_requires_authentication(self):
        """Should return 401 without auth token"""
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.post(
            f"{BASE_URL}/api/gmail/import-history/fake_id/confirm",
            json={"selected": [{"school_id": "Test"}]}
        )
        assert response.status_code == 401, f"Expected 401 but got {response.status_code}"
        unauth_session.close()
    
    # Note: Testing empty selected array requires a real/ready import run
    # Since demo user doesn't have Gmail connected, we can only test 404 cases
    # The 400 for empty selection would require mocking or setting up a real run


class TestGmailStatusEndpoint:
    """Verify Gmail status endpoint for demo user (should show not connected)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as demo user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@capymatch.com", "password": "demo2026"}
        )
        assert login_response.status_code == 200
        
        token = login_response.json().get("session_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        self.session.close()
    
    def test_gmail_status_shows_not_connected_for_demo_user(self):
        """Demo user should have Gmail not connected"""
        response = self.session.get(f"{BASE_URL}/api/gmail/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("connected") == False, "Demo user should NOT have Gmail connected"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
