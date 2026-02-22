"""
Test module for PUT /api/auth/update-account endpoint
Tests Personal Info update functionality for Athletes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DEMO_USER_EMAIL = "demo@capymatch.com"
DEMO_USER_PASSWORD = "demo2026"
DEMO_USER_ORIGINAL_NAME = "Sarah Mitchell"

class TestUpdateAccountAPI:
    """Tests for PUT /api/auth/update-account endpoint"""

    @pytest.fixture(scope="class")
    def session(self):
        """Create a requests session and login as demo user"""
        s = requests.Session()
        # Login to get session cookie
        resp = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_USER_EMAIL,
            "password": DEMO_USER_PASSWORD
        })
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        return s

    def test_01_get_current_user_info(self, session):
        """Test GET /api/auth/me returns user info including auth_provider"""
        resp = session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert "email" in data
        assert "name" in data
        assert "auth_provider" in data
        print(f"Current user: {data.get('name')}, email: {data.get('email')}, auth_provider: {data.get('auth_provider')}")

    def test_02_update_name_success(self, session):
        """Test updating name successfully"""
        new_name = "Test Name Update"
        resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": new_name,
            "email": DEMO_USER_EMAIL  # Keep original email
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("ok") is True
        assert data.get("name") == new_name
        assert data.get("email") == DEMO_USER_EMAIL

        # Verify via GET /auth/me
        verify_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert verify_data.get("name") == new_name
        print(f"Name updated successfully to: {new_name}")

    def test_03_revert_name_to_original(self, session):
        """Revert name back to original for cleanup"""
        resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": DEMO_USER_ORIGINAL_NAME,
            "email": DEMO_USER_EMAIL
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("name") == DEMO_USER_ORIGINAL_NAME
        print(f"Name reverted to original: {DEMO_USER_ORIGINAL_NAME}")

    def test_04_empty_name_returns_400(self, session):
        """Test that empty name returns 400 error"""
        resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": "",
            "email": DEMO_USER_EMAIL
        })
        assert resp.status_code == 400
        data = resp.json()
        assert "Name is required" in data.get("detail", "")
        print("Empty name correctly rejected with 400")

    def test_05_whitespace_name_returns_400(self, session):
        """Test that whitespace-only name returns 400 error"""
        resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": "   ",
            "email": DEMO_USER_EMAIL
        })
        assert resp.status_code == 400
        data = resp.json()
        assert "Name is required" in data.get("detail", "")
        print("Whitespace-only name correctly rejected with 400")

    def test_06_empty_email_returns_400(self, session):
        """Test that empty email returns 400 error"""
        resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": DEMO_USER_ORIGINAL_NAME,
            "email": ""
        })
        assert resp.status_code == 400
        data = resp.json()
        assert "Email is required" in data.get("detail", "")
        print("Empty email correctly rejected with 400")

    def test_07_invalid_email_format_returns_400(self, session):
        """Test that invalid email format returns 400 error"""
        resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": DEMO_USER_ORIGINAL_NAME,
            "email": "notanemail"
        })
        assert resp.status_code == 400
        data = resp.json()
        assert "Invalid email format" in data.get("detail", "")
        print("Invalid email format correctly rejected with 400")

    def test_08_invalid_email_no_domain(self, session):
        """Test invalid email without domain"""
        resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": DEMO_USER_ORIGINAL_NAME,
            "email": "test@"
        })
        assert resp.status_code == 400
        print("Invalid email without domain correctly rejected")

    def test_09_duplicate_email_returns_409(self, session):
        """Test that using an existing email returns 409 conflict"""
        # First register a new user to test duplicate email
        # We'll use a test email that's unlikely to exist
        test_email = f"test_dup_{os.urandom(4).hex()}@test.com"
        
        # Register new user
        new_session = requests.Session()
        reg_resp = new_session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test Duplicate User"
        })
        
        if reg_resp.status_code == 201 or reg_resp.status_code == 200:
            # Now try to update demo user to use this email
            resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
                "name": DEMO_USER_ORIGINAL_NAME,
                "email": test_email
            })
            assert resp.status_code == 409
            data = resp.json()
            assert "already exists" in data.get("detail", "").lower()
            print("Duplicate email correctly rejected with 409")
        else:
            # If registration fails, skip this test
            pytest.skip("Could not create test user for duplicate email test")

    def test_10_update_email_success(self, session):
        """Test updating email successfully (local auth user only)"""
        # First check auth provider
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        user = me_resp.json()
        
        if user.get("auth_provider") == "google":
            pytest.skip("Google auth users cannot change email")
        
        # Update to a test email
        test_email = f"demo_temp_{os.urandom(4).hex()}@capymatch.com"
        resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": DEMO_USER_ORIGINAL_NAME,
            "email": test_email
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("email") == test_email
        print(f"Email updated to: {test_email}")
        
        # Revert back to original email
        revert_resp = session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": DEMO_USER_ORIGINAL_NAME,
            "email": DEMO_USER_EMAIL
        })
        assert revert_resp.status_code == 200
        print(f"Email reverted to original: {DEMO_USER_EMAIL}")

    def test_11_unauthenticated_request_returns_401(self):
        """Test that unauthenticated request returns 401"""
        new_session = requests.Session()  # No login
        resp = new_session.put(f"{BASE_URL}/api/auth/update-account", json={
            "name": "Test",
            "email": "test@test.com"
        })
        assert resp.status_code == 401
        print("Unauthenticated request correctly rejected with 401")

    def test_12_final_state_check(self, session):
        """Verify final state is correct after all tests"""
        resp = session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("email") == DEMO_USER_EMAIL
        assert data.get("name") == DEMO_USER_ORIGINAL_NAME
        print(f"Final state verified - Name: {data.get('name')}, Email: {data.get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
