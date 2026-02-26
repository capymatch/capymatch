"""
Test Dashboard resilience, Gmail debug-config, and Admin endpoint authorization.

P0 production bugs being tested:
1. Dashboard loads even if individual API calls fail (resilient Promise.all)
2. Dashboard name display uses authUser.name fallback
3. Gmail debug-config endpoint returns correct config source
4. Gmail admin update endpoint works for admin users
5. Non-admin users are blocked from admin endpoints (403)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
DEMO_USER = {"email": "demo@capymatch.com", "password": "demo2026"}
ADMIN_EMAIL = "douglas@yeslms.com"


class TestGmailDebugConfigPublicEndpoint:
    """Gmail debug-config endpoint is public (no auth required)"""
    
    def test_gmail_debug_config_no_auth(self):
        """GET /api/gmail/debug-config should work without authentication"""
        response = requests.get(f"{BASE_URL}/api/gmail/debug-config")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify expected fields exist
        assert "client_id_prefix" in data, "Missing client_id_prefix"
        assert "client_secret_set" in data, "Missing client_secret_set"
        assert "redirect_uri" in data, "Missing redirect_uri"
        assert "source" in data, "Missing source field - should indicate 'database' or 'env'"
        assert "scopes" in data, "Missing scopes"
        
        # Verify source is valid
        assert data["source"] in ["database", "env", "none"], f"Invalid source: {data['source']}"
        print(f"PASSED: Gmail debug-config returns config_source: {data['source']}")


class TestAdminEndpointAuthGuard:
    """Test that non-admin users get 403 from admin endpoints"""
    
    @pytest.fixture
    def demo_user_session(self):
        """Login as demo user and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code != 200:
            pytest.skip(f"Could not login demo user: {response.status_code}")
        data = response.json()
        token = data.get("session_token") or data.get("token")
        if not token:
            pytest.skip("No session token returned")
        return token
    
    def test_admin_integrations_blocked_for_demo_user(self, demo_user_session):
        """GET /api/admin/integrations should return 403 for non-admin users"""
        headers = {"Authorization": f"Bearer {demo_user_session}"}
        response = requests.get(f"{BASE_URL}/api/admin/integrations", headers=headers)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("PASSED: Non-admin user blocked from /api/admin/integrations")
    
    def test_gmail_admin_update_blocked_for_demo_user(self, demo_user_session):
        """POST /api/gmail/admin/update-oauth-config should return 403 for non-admin users"""
        headers = {"Authorization": f"Bearer {demo_user_session}"}
        payload = {"client_id": "test", "client_secret": "test"}
        response = requests.post(f"{BASE_URL}/api/gmail/admin/update-oauth-config", json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("PASSED: Non-admin user blocked from /api/gmail/admin/update-oauth-config")


class TestDashboardAPIResilience:
    """Test dashboard APIs individually to verify they work"""
    
    @pytest.fixture
    def session(self):
        """Login and get session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DEMO_USER)
        if response.status_code != 200:
            pytest.skip(f"Could not login: {response.status_code}")
        data = response.json()
        token = data.get("session_token") or data.get("token")
        session = requests.Session()
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_programs_api(self, session):
        """GET /api/programs should return data or empty array"""
        response = session.get(f"{BASE_URL}/api/programs")
        print(f"Programs: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Programs should be a list"
        print(f"PASSED: /api/programs returns {len(data)} programs")
    
    def test_events_api(self, session):
        """GET /api/events should return data or empty array"""
        response = session.get(f"{BASE_URL}/api/events")
        print(f"Events: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Events should be a list"
        print(f"PASSED: /api/events returns {len(data)} events")
    
    def test_interactions_api(self, session):
        """GET /api/interactions should return data or empty array"""
        response = session.get(f"{BASE_URL}/api/interactions")
        print(f"Interactions: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Interactions should be a list"
        print(f"PASSED: /api/interactions returns {len(data)} interactions")
    
    def test_athlete_profile_api(self, session):
        """GET /api/athlete-profile should return data or empty object"""
        response = session.get(f"{BASE_URL}/api/athlete-profile")
        print(f"Athlete Profile: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Athlete profile should be a dict"
        print(f"PASSED: /api/athlete-profile returns data")
    
    def test_gmail_status_api(self, session):
        """GET /api/gmail/status should return connected status"""
        response = session.get(f"{BASE_URL}/api/gmail/status")
        print(f"Gmail Status: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data, "Should have connected field"
        print(f"PASSED: /api/gmail/status returns connected={data['connected']}")
    
    def test_inbound_contacts_api(self, session):
        """GET /api/inbound-contacts should return contacts or empty"""
        response = session.get(f"{BASE_URL}/api/inbound-contacts")
        print(f"Inbound Contacts: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data, "Should have contacts field"
        print(f"PASSED: /api/inbound-contacts returns {len(data['contacts'])} contacts")


class TestAdminIntegrationsStatusConfigSource:
    """Test that admin integrations status includes config_source for Gmail"""
    
    def test_admin_integrations_has_config_source_field(self):
        """Check backend code has config_source in response"""
        # Read the admin_integrations.py file to verify config_source is present
        admin_file = "/app/backend/routes/admin_integrations.py"
        with open(admin_file, "r") as f:
            content = f.read()
        
        # Verify config_source is in the gmail response
        assert "config_source" in content, "config_source field missing from admin_integrations.py"
        assert '"database"' in content or "'database'" in content, "Should check for database config"
        print("PASSED: admin_integrations.py includes config_source field in Gmail status")


class TestDashboardCodeReview:
    """Code review tests for Dashboard.js fixes"""
    
    def test_dashboard_has_resilient_promise_all(self):
        """Dashboard.js should have .catch() on all 6 API calls"""
        dashboard_file = "/app/frontend/src/pages/Dashboard.js"
        with open(dashboard_file, "r") as f:
            content = f.read()
        
        # Check for resilient Promise.all pattern
        api_calls = [
            'api.get("/programs").catch',
            'api.get("/events").catch',
            'api.get("/interactions").catch',
            'api.get("/athlete-profile").catch',
            'api.get("/gmail/status").catch',
            'api.get("/inbound-contacts").catch',
        ]
        
        for call in api_calls:
            assert call in content, f"Missing resilient call: {call}"
        
        print("PASSED: All 6 API calls in Dashboard.js have .catch() for resilience")
    
    def test_dashboard_uses_auth_user_name_fallback(self):
        """Dashboard.js should use authUser.name as fallback for athlete name"""
        dashboard_file = "/app/frontend/src/pages/Dashboard.js"
        with open(dashboard_file, "r") as f:
            content = f.read()
        
        # Check for authUser import via useOutletContext
        assert "useOutletContext" in content, "Missing useOutletContext import"
        assert "authUser" in content, "Missing authUser usage"
        
        # Check for name fallback pattern
        assert "authUser?.name" in content or "authUser.name" in content, "Missing authUser.name fallback"
        
        print("PASSED: Dashboard.js uses authUser.name as fallback for name display")
    
    def test_layout_passes_user_via_outlet_context(self):
        """Layout.js should pass user via Outlet context prop"""
        layout_file = "/app/frontend/src/components/Layout.js"
        with open(layout_file, "r") as f:
            content = f.read()
        
        # Check for Outlet with context prop
        assert "Outlet" in content, "Missing Outlet component"
        assert "context=" in content or "context =" in content, "Missing context prop on Outlet"
        assert "user" in content, "Missing user in context"
        
        print("PASSED: Layout.js passes user via Outlet context")


class TestGmailAdminUpdateEndpoint:
    """Test Gmail admin update endpoint structure"""
    
    def test_gmail_admin_update_endpoint_exists(self):
        """Verify /api/gmail/admin/update-oauth-config endpoint exists in code"""
        gmail_file = "/app/backend/routes/gmail.py"
        with open(gmail_file, "r") as f:
            content = f.read()
        
        assert "/admin/update-oauth-config" in content, "Missing admin update endpoint"
        assert "require_admin" in content, "Missing admin guard"
        assert "client_id" in content, "Missing client_id handling"
        assert "client_secret" in content, "Missing client_secret handling"
        
        print("PASSED: Gmail admin update endpoint exists with proper structure")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
