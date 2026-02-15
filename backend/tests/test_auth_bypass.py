"""
Test suite for Auth Bypass implementation
Tests that all endpoints work without authentication (public access)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://scout-board.preview.emergentagent.com"


class TestAuthBypass:
    """Test that auth is bypassed and static user is returned"""
    
    def test_root_endpoint_works(self):
        """Test /api/ root endpoint works"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"Root endpoint: {data}")
    
    def test_auth_me_returns_static_user(self):
        """GET /api/auth/me returns static public user without session token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        # Verify static user fields
        assert data.get("user_id") == "user_public_default"
        assert data.get("name") == "Athlete"
        assert data.get("email") == "athlete@recruitinghq.app"
        print(f"Static user returned: {data}")
    
    def test_notifications_works_without_auth(self):
        """GET /api/notifications works without authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
        print(f"Notifications: {len(data.get('notifications', []))} notifications, {data.get('unread_count')} unread")
    
    def test_programs_works_without_auth(self):
        """GET /api/programs works without authentication"""
        response = requests.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Programs: {len(data)} programs returned")
    
    def test_events_works_without_auth(self):
        """GET /api/events works without authentication"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Events: {len(data)} events returned")
    
    def test_dashboard_stats_works_without_auth(self):
        """GET /api/dashboard works without authentication"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        # Verify dashboard stats structure
        assert "total_schools" in data
        assert "follow_ups_due" in data
        assert "status_counts" in data
        print(f"Dashboard stats: {data.get('total_schools')} schools, {data.get('follow_ups_due')} follow-ups")
    
    def test_athlete_profile_works_without_auth(self):
        """GET /api/athlete-profile works without authentication"""
        response = requests.get(f"{BASE_URL}/api/athlete-profile")
        assert response.status_code == 200
        
        data = response.json()
        assert "tenant_id" in data
        print(f"Athlete profile tenant: {data.get('tenant_id')}")
    
    def test_reminders_works_without_auth(self):
        """GET /api/reminders works without authentication"""
        response = requests.get(f"{BASE_URL}/api/reminders")
        assert response.status_code == 200
        
        data = response.json()
        assert "reminders" in data
        print(f"Reminders: {len(data.get('reminders', []))} reminders")
    
    def test_follow_ups_works_without_auth(self):
        """GET /api/follow-ups works without authentication"""
        response = requests.get(f"{BASE_URL}/api/follow-ups")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Follow-ups: {len(data)} follow-ups due")
    
    def test_knowledge_base_works(self):
        """GET /api/knowledge-base works (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Knowledge base: {len(data)} universities")
    
    def test_coaches_works_without_auth(self):
        """GET /api/coaches works without authentication"""
        response = requests.get(f"{BASE_URL}/api/coaches")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Coaches: {len(data)} coaches")
    
    def test_interactions_works_without_auth(self):
        """GET /api/interactions works without authentication"""
        response = requests.get(f"{BASE_URL}/api/interactions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Interactions: {len(data)} interactions")
    
    def test_profile_views_works_without_auth(self):
        """GET /api/profile-views works without authentication"""
        response = requests.get(f"{BASE_URL}/api/profile-views")
        assert response.status_code == 200
        
        data = response.json()
        assert "views" in data
        assert "total" in data
        print(f"Profile views: {data.get('total')} total views")
    
    def test_tenant_works_without_auth(self):
        """GET /api/tenant works without authentication"""
        response = requests.get(f"{BASE_URL}/api/tenant")
        assert response.status_code == 200
        
        data = response.json()
        # Tenant should have the public default tenant_id
        assert data.get("tenant_id") == "tenant_public_default"
        print(f"Tenant: {data}")
    
    def test_share_link_works_without_auth(self):
        """GET /api/share-link works without authentication"""
        response = requests.get(f"{BASE_URL}/api/share-link")
        assert response.status_code == 200
        
        data = response.json()
        assert "tenant_id" in data
        assert data.get("tenant_id") == "tenant_public_default"
        print(f"Share link: tenant_id={data.get('tenant_id')}")
    
    def test_gmail_status_works_without_auth(self):
        """GET /api/gmail/status works without authentication"""
        response = requests.get(f"{BASE_URL}/api/gmail/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "connected" in data
        print(f"Gmail status: connected={data.get('connected')}")


class TestStaticUserConsistency:
    """Test that static user is consistent across all endpoints"""
    
    def test_user_id_consistency(self):
        """Verify user_id is user_public_default in all responses"""
        # Get auth/me
        auth_response = requests.get(f"{BASE_URL}/api/auth/me")
        assert auth_response.status_code == 200
        auth_user = auth_response.json()
        
        # Get tenant
        tenant_response = requests.get(f"{BASE_URL}/api/tenant")
        assert tenant_response.status_code == 200
        tenant = tenant_response.json()
        
        # Verify consistency
        assert auth_user.get("user_id") == "user_public_default"
        assert tenant.get("owner_user_id") == "user_public_default"
        assert tenant.get("tenant_id") == "tenant_public_default"
        print("User ID consistency verified across endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
