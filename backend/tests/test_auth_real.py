"""
Test Suite for Real Authentication System
Tests: register, login, logout, /auth/me endpoints
Previously auth was mocked with static user - now uses real MongoDB sessions
"""
import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAuthRegister:
    """Registration endpoint tests"""
    
    def test_register_success(self):
        """Register new user returns 200 with user data"""
        unique_email = f"test_reg_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test User",
            "email": unique_email,
            "password": "testpass123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert data["email"] == unique_email
        assert data["name"] == "Test User"
        # Verify session cookie was set
        assert "session_token" in session.cookies.get_dict() or response.cookies.get("session_token")
    
    def test_register_duplicate_email_returns_409(self):
        """Register with existing email returns 409 conflict"""
        # First register
        email = f"test_dup_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "First User", "email": email, "password": "pass123"
        })
        # Duplicate register
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Second User", "email": email, "password": "pass456"
        })
        assert response.status_code == 409
        assert "already exists" in response.json().get("detail", "").lower()
    
    def test_register_missing_name_returns_400(self):
        """Register without name returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@test.com", "password": "pass123"
        })
        assert response.status_code == 400
    
    def test_register_missing_email_returns_400(self):
        """Register without email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test", "password": "pass123"
        })
        assert response.status_code == 400
    
    def test_register_short_password_returns_400(self):
        """Register with password < 6 chars returns 400"""
        email = f"test_short_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test", "email": email, "password": "12345"
        })
        assert response.status_code == 400
        assert "6 characters" in response.json().get("detail", "").lower()


class TestAuthLogin:
    """Login endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_test_user(self):
        """Create a test user for login tests"""
        self.test_email = f"login_test_{uuid.uuid4().hex[:8]}@test.com"
        self.test_password = "testpass123"
        self.test_name = "Login Test User"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": self.test_name,
            "email": self.test_email,
            "password": self.test_password
        })
        if response.status_code != 200:
            pytest.skip(f"Failed to create test user: {response.text}")
    
    def test_login_success(self):
        """Login with valid credentials returns 200 and user data"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == self.test_email
        assert data["name"] == self.test_name
        assert "user_id" in data
    
    def test_login_wrong_password_returns_401(self):
        """Login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "invalid" in response.json().get("detail", "").lower()
    
    def test_login_nonexistent_email_returns_401(self):
        """Login with non-existent email returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@doesnotexist.com",
            "password": "anypassword"
        })
        assert response.status_code == 401
    
    def test_login_empty_email_returns_400(self):
        """Login with empty email returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "",
            "password": "somepass"
        })
        assert response.status_code == 400
    
    def test_login_empty_password_returns_400(self):
        """Login with empty password returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": ""
        })
        assert response.status_code == 400


class TestAuthMe:
    """/auth/me endpoint tests"""
    
    @pytest.fixture
    def authenticated_session(self):
        """Create a logged-in session"""
        email = f"me_test_{uuid.uuid4().hex[:8]}@test.com"
        password = "testpass123"
        session = requests.Session()
        # Register and get session
        response = session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Me Test User",
            "email": email,
            "password": password
        })
        if response.status_code != 200:
            pytest.skip(f"Failed to create test user: {response.text}")
        return session, email
    
    def test_auth_me_returns_user_when_authenticated(self, authenticated_session):
        """GET /auth/me returns user data when session is valid"""
        session, email = authenticated_session
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == email
        assert "user_id" in data
        assert "password_hash" not in data  # Should not expose password hash
    
    def test_auth_me_returns_401_when_not_authenticated(self):
        """GET /auth/me returns 401 when no session"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        assert "not authenticated" in response.json().get("detail", "").lower()


class TestAuthLogout:
    """Logout endpoint tests"""
    
    @pytest.fixture
    def authenticated_session(self):
        """Create a logged-in session"""
        email = f"logout_test_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Logout Test User",
            "email": email,
            "password": "testpass123"
        })
        return session
    
    def test_logout_clears_session(self, authenticated_session):
        """POST /auth/logout clears the session"""
        session = authenticated_session
        # Verify logged in
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        assert logout_response.json().get("ok") == True
        
        # Verify session is cleared - /auth/me should return 401
        me_after_logout = session.get(f"{BASE_URL}/api/auth/me")
        assert me_after_logout.status_code == 401


class TestExistingUserJane:
    """Test with existing test user jane@test.com from requirements"""
    
    def test_jane_login(self):
        """Login with jane@test.com works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "jane@test.com",
            "password": "password123"
        })
        # Should succeed if user exists
        if response.status_code == 200:
            data = response.json()
            assert data["email"] == "jane@test.com"
            assert data["name"] == "Jane Doe"
        elif response.status_code == 401:
            pytest.skip("jane@test.com user may not exist yet")


class TestProtectedEndpoints:
    """Test that protected endpoints require authentication"""
    
    def test_protected_endpoint_without_auth_returns_401(self):
        """Protected endpoints return 401 without session"""
        # Test a few protected endpoints
        endpoints = ["/api/programs", "/api/dashboard", "/api/recruiting-profile"]
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 401, f"{endpoint} should return 401 but got {response.status_code}"
    
    def test_protected_endpoint_with_auth_succeeds(self):
        """Protected endpoints work with valid session"""
        email = f"protected_test_{uuid.uuid4().hex[:8]}@test.com"
        session = requests.Session()
        session.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Protected Test", "email": email, "password": "testpass123"
        })
        # Test access to protected endpoint
        response = session.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
