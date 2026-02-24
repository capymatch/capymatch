"""
Test suite for P0 CORS Bug Fix - Google OAuth Login
Verifies:
1. CORS headers do NOT include access-control-allow-credentials: true
2. POST /api/auth/login returns session_token in body, no set-cookie for session_token
3. POST /api/auth/register returns session_token in body, no set-cookie for session_token
4. POST /api/auth/session (OAuth exchange) works without access-control-allow-credentials
5. GET /api/auth/me works with Bearer token authentication
6. POST /api/auth/logout invalidates the session
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestCORSHeaders:
    """Test that CORS headers are correctly configured after the fix"""
    
    def test_cors_preflight_no_credentials_header(self):
        """CORS preflight should NOT include access-control-allow-credentials: true"""
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": "https://app.capymatch.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        # Check status is 200 or 204 (preflight success - 204 No Content is also valid)
        assert response.status_code in [200, 204], f"Preflight failed: {response.status_code}"
        
        # CRITICAL: access-control-allow-credentials should NOT be 'true'
        credentials_header = response.headers.get('access-control-allow-credentials', '').lower()
        assert credentials_header != 'true', \
            f"CORS BUG: access-control-allow-credentials should NOT be 'true', got: '{credentials_header}'"
        
        print(f"✓ CORS preflight correct - no credentials header or not 'true'")
        print(f"  Headers: {dict(response.headers)}")
    
    def test_cors_allows_all_origins(self):
        """CORS should allow all origins with Access-Control-Allow-Origin: *"""
        response = requests.options(
            f"{BASE_URL}/api/auth/login",
            headers={
                "Origin": "https://app.capymatch.com",
                "Access-Control-Request-Method": "POST"
            }
        )
        
        allow_origin = response.headers.get('access-control-allow-origin', '')
        assert allow_origin == '*', f"Expected allow-origin: *, got: {allow_origin}"
        print(f"✓ CORS allows all origins: {allow_origin}")


class TestAuthLogin:
    """Test /api/auth/login endpoint"""
    
    def test_login_success_returns_token_in_body(self):
        """Login should return session_token in response body"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo@capymatch.com",
                "password": "demo2026"
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "session_token" in data, "session_token missing from response body"
        assert data["session_token"].startswith("sess_"), f"Invalid token format: {data['session_token'][:10]}..."
        assert "email" in data, "email missing from response"
        assert data["email"] == "demo@capymatch.com"
        
        print(f"✓ Login returns session_token in body: {data['session_token'][:15]}...")
        return data["session_token"]
    
    def test_login_no_set_cookie_for_session_token(self):
        """Login should NOT set session_token cookie (only Bearer token auth)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo@capymatch.com",
                "password": "demo2026"
            }
        )
        
        assert response.status_code == 200
        
        # Check Set-Cookie header does NOT contain session_token
        set_cookie = response.headers.get('set-cookie', '')
        assert 'session_token' not in set_cookie.lower(), \
            f"BUG: set-cookie contains session_token: {set_cookie}"
        
        print(f"✓ No set-cookie for session_token")
        print(f"  Set-Cookie header: {set_cookie or '(none)'}")
    
    def test_login_invalid_credentials(self):
        """Login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo@capymatch.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print(f"✓ Invalid credentials returns 401")


class TestAuthRegister:
    """Test /api/auth/register endpoint"""
    
    def test_register_returns_token_in_body(self):
        """Register should return session_token in response body"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpassword123",
                "name": "Test User"
            }
        )
        
        assert response.status_code == 200, f"Register failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "session_token" in data, "session_token missing from register response"
        assert data["session_token"].startswith("sess_")
        assert data["email"] == test_email
        
        print(f"✓ Register returns session_token in body")
        return data["session_token"]
    
    def test_register_no_set_cookie(self):
        """Register should NOT set session_token cookie"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpassword123",
                "name": "Test User"
            }
        )
        
        assert response.status_code == 200
        
        set_cookie = response.headers.get('set-cookie', '')
        assert 'session_token' not in set_cookie.lower(), \
            f"BUG: register set-cookie contains session_token"
        
        print(f"✓ Register has no set-cookie for session_token")


class TestAuthSessionExchange:
    """Test /api/auth/session endpoint (OAuth session exchange)"""
    
    def test_session_endpoint_exists(self):
        """Session exchange endpoint should accept POST"""
        response = requests.post(
            f"{BASE_URL}/api/auth/session",
            json={"session_id": "invalid_test_session"}
        )
        
        # Should return 401 (invalid session) not 404 (endpoint not found)
        assert response.status_code in [400, 401, 503], \
            f"Unexpected status: {response.status_code}"
        print(f"✓ Session exchange endpoint exists, returns {response.status_code} for invalid session")
    
    def test_session_cors_no_credentials(self):
        """Session endpoint CORS should NOT have credentials header"""
        response = requests.options(
            f"{BASE_URL}/api/auth/session",
            headers={
                "Origin": "https://app.capymatch.com",
                "Access-Control-Request-Method": "POST"
            }
        )
        
        credentials = response.headers.get('access-control-allow-credentials', '').lower()
        assert credentials != 'true', f"Session CORS should not have credentials=true"
        print(f"✓ Session endpoint CORS correct")


class TestBearerTokenAuth:
    """Test Bearer token authentication for /api/auth/me"""
    
    @pytest.fixture
    def valid_token(self):
        """Get a valid session token by logging in"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo@capymatch.com",
                "password": "demo2026"
            }
        )
        if response.status_code != 200:
            pytest.skip("Could not login to get token")
        return response.json()["session_token"]
    
    def test_auth_me_with_bearer_token(self, valid_token):
        """GET /api/auth/me should work with Bearer token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {valid_token}"}
        )
        
        assert response.status_code == 200, f"Auth/me failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "email" in data
        assert data["email"] == "demo@capymatch.com"
        assert "user_id" in data
        
        print(f"✓ Bearer token auth works for /api/auth/me")
        print(f"  User: {data['email']}, ID: {data['user_id']}")
    
    def test_auth_me_without_token_fails(self):
        """GET /api/auth/me without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print(f"✓ /api/auth/me without token returns 401")
    
    def test_auth_me_with_invalid_token_fails(self):
        """GET /api/auth/me with invalid token should return 401"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401, f"Expected 401, got: {response.status_code}"
        print(f"✓ /api/auth/me with invalid token returns 401")


class TestLogout:
    """Test /api/auth/logout endpoint"""
    
    def test_logout_invalidates_session(self):
        """Logout should invalidate the session token"""
        # First login to get a token
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "demo@capymatch.com",
                "password": "demo2026"
            }
        )
        
        if login_resp.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_resp.json()["session_token"]
        
        # Verify token works before logout
        me_resp = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200, "Token should work before logout"
        
        # Logout
        logout_resp = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.status_code}"
        
        # Verify token no longer works
        me_resp_after = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp_after.status_code == 401, "Token should be invalid after logout"
        
        print(f"✓ Logout invalidates session token")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
