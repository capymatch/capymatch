"""
Backend API tests for Gmail Integration Routes
Tests route registration and authentication for Gmail endpoints
"""
import pytest
import requests
import os

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGmailRouteRegistration:
    """Test that Gmail routes are properly registered (401 vs 404)"""
    
    def test_gmail_status_returns_401_unauthenticated(self):
        """GET /api/gmail/status should return 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/gmail/status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Not authenticated" in response.json().get("detail", "")
        print("PASS: GET /api/gmail/status returns 401 (route exists)")
    
    def test_gmail_connect_returns_401_unauthenticated(self):
        """GET /api/gmail/connect should return 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/gmail/connect")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Not authenticated" in response.json().get("detail", "")
        print("PASS: GET /api/gmail/connect returns 401 (route exists)")
    
    def test_gmail_disconnect_returns_401_unauthenticated(self):
        """POST /api/gmail/disconnect should return 401 when not authenticated"""
        response = requests.post(f"{BASE_URL}/api/gmail/disconnect")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Not authenticated" in response.json().get("detail", "")
        print("PASS: POST /api/gmail/disconnect returns 401 (route exists)")
    
    def test_gmail_emails_returns_401_unauthenticated(self):
        """GET /api/gmail/emails should return 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/gmail/emails")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Not authenticated" in response.json().get("detail", "")
        print("PASS: GET /api/gmail/emails returns 401 (route exists)")
    
    def test_gmail_send_returns_422_missing_fields(self):
        """POST /api/gmail/send should return 422 for missing required fields (Pydantic validation before auth)"""
        response = requests.post(
            f"{BASE_URL}/api/gmail/send",
            json={},
            headers={"Content-Type": "application/json"}
        )
        # 422 is expected because Pydantic validation happens before auth check for POST endpoints with body
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("PASS: POST /api/gmail/send returns 422 for validation (route exists)")
    
    def test_gmail_send_returns_401_with_valid_body(self):
        """POST /api/gmail/send should return 401 when body is valid but not authenticated"""
        response = requests.post(
            f"{BASE_URL}/api/gmail/send",
            json={"to": "test@example.com", "subject": "Test", "body": "Test body"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/gmail/send returns 401 (route exists, auth required)")
    
    def test_gmail_thread_returns_401_unauthenticated(self):
        """GET /api/gmail/threads/{id} should return 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/gmail/threads/test_thread_id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Not authenticated" in response.json().get("detail", "")
        print("PASS: GET /api/gmail/threads/{id} returns 401 (route exists)")
    
    def test_gmail_email_by_id_returns_401_unauthenticated(self):
        """GET /api/gmail/emails/{id} should return 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/gmail/emails/test_message_id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert "Not authenticated" in response.json().get("detail", "")
        print("PASS: GET /api/gmail/emails/{id} returns 401 (route exists)")
    
    def test_gmail_reply_returns_422_missing_fields(self):
        """POST /api/gmail/reply should return 422 for missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/gmail/reply",
            json={},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        print("PASS: POST /api/gmail/reply returns 422 for validation (route exists)")
    
    def test_gmail_toggle_read_returns_401_unauthenticated(self):
        """POST /api/gmail/emails/{id}/toggle-read should return 401 when not authenticated"""
        response = requests.post(f"{BASE_URL}/api/gmail/emails/test_id/toggle-read")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/gmail/emails/{id}/toggle-read returns 401 (route exists)")


class TestExistingCRMEndpoints:
    """Verify existing CRM endpoints still work correctly"""
    
    def test_api_root(self):
        """GET /api/ should return 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data
        print("PASS: GET /api/ returns 200")
    
    def test_auth_me_returns_401_unauthenticated(self):
        """GET /api/auth/me should return 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/auth/me returns 401 (requires auth)")
    
    def test_programs_returns_401_unauthenticated(self):
        """GET /api/programs should return 401 when not authenticated"""
        response = requests.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/programs returns 401 (requires auth)")
    
    def test_knowledge_base_returns_200(self):
        """GET /api/knowledge-base should return 200 (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/knowledge-base returns 200 with {len(data)} universities")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
