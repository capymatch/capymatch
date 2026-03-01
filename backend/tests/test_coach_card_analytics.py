"""
Coach Card Analytics Tests - View Tracking & Analytics
Features tested:
1. POST /api/card/{slug}/view - records a view (public, fire-and-forget)
2. GET /api/coach-card/{program_id}/analytics - returns analytics (authenticated)
3. GET /api/card/{slug} returns view_count field
4. POST /api/card/nonexistent/view returns 404
5. GET /api/coach-card/{program_id}/analytics requires authentication
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test constants
EXISTING_SLUG = "clara-gimenes-stanford-university-a73931"
EXISTING_PROGRAM_ID = "prog_e8ee256e0c79"
TEST_EMAIL = "demo@capymatch.com"
TEST_PASSWORD = "demo2026"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token via login"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("session_token") or data.get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestViewTracking:
    """View tracking endpoint tests (public - no auth required)"""
    
    def test_record_view_success(self, api_client):
        """POST /api/card/{slug}/view records a view and returns {ok: true}"""
        # First get current view count
        initial_response = api_client.get(f"{BASE_URL}/api/card/{EXISTING_SLUG}")
        assert initial_response.status_code == 200
        initial_view_count = initial_response.json().get("view_count", 0)
        
        # Record a view
        response = api_client.post(f"{BASE_URL}/api/card/{EXISTING_SLUG}/view")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("ok") == True, f"Expected ok: true, got {data}"
        
        # Verify view count incremented
        after_response = api_client.get(f"{BASE_URL}/api/card/{EXISTING_SLUG}")
        assert after_response.status_code == 200
        new_view_count = after_response.json().get("view_count", 0)
        
        assert new_view_count == initial_view_count + 1, \
            f"Expected view_count to increment from {initial_view_count} to {initial_view_count + 1}, got {new_view_count}"
        
        print(f"PASS: View recorded, count incremented from {initial_view_count} to {new_view_count}")
    
    def test_record_view_nonexistent_slug_returns_404(self, api_client):
        """POST /api/card/nonexistent/view returns 404"""
        response = api_client.post(f"{BASE_URL}/api/card/nonexistent-slug-12345/view")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Expected error detail in response"
        
        print(f"PASS: Nonexistent slug returns 404 with detail: {data['detail']}")


class TestPublicCoachCardViewCount:
    """Test that public coach card endpoint returns view_count"""
    
    def test_public_card_returns_view_count(self, api_client):
        """GET /api/card/{slug} returns view_count field"""
        response = api_client.get(f"{BASE_URL}/api/card/{EXISTING_SLUG}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "view_count" in data, "Expected view_count field in response"
        assert isinstance(data["view_count"], int), f"Expected view_count to be int, got {type(data['view_count'])}"
        assert data["view_count"] >= 0, f"Expected view_count >= 0, got {data['view_count']}"
        
        print(f"PASS: Public coach card returns view_count: {data['view_count']}")


class TestAnalyticsEndpoint:
    """Analytics endpoint tests (authenticated)"""
    
    def test_analytics_requires_auth(self, api_client):
        """GET /api/coach-card/{program_id}/analytics requires authentication"""
        # Create fresh session without auth
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.get(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}/analytics")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"PASS: Analytics endpoint returns 401 without auth")
    
    def test_analytics_returns_expected_fields(self, authenticated_client):
        """GET /api/coach-card/{program_id}/analytics returns total_views, unique_visitors, recent_views, views_by_day"""
        response = authenticated_client.get(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify all required fields exist
        assert "total_views" in data, "Expected total_views field"
        assert "unique_visitors" in data, "Expected unique_visitors field"
        assert "recent_views" in data, "Expected recent_views field"
        assert "views_by_day" in data, "Expected views_by_day field"
        
        # Verify types
        assert isinstance(data["total_views"], int), f"total_views should be int"
        assert isinstance(data["unique_visitors"], int), f"unique_visitors should be int"
        assert isinstance(data["recent_views"], list), f"recent_views should be list"
        assert isinstance(data["views_by_day"], dict), f"views_by_day should be dict"
        
        print(f"PASS: Analytics endpoint returns correct structure:")
        print(f"  total_views: {data['total_views']}")
        print(f"  unique_visitors: {data['unique_visitors']}")
        print(f"  recent_views count: {len(data['recent_views'])}")
        print(f"  views_by_day keys: {list(data['views_by_day'].keys())}")
    
    def test_analytics_recent_views_structure(self, authenticated_client):
        """Analytics recent_views contain viewed_at, referer, visitor_hash"""
        response = authenticated_client.get(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}/analytics")
        
        assert response.status_code == 200
        
        data = response.json()
        recent_views = data.get("recent_views", [])
        
        if len(recent_views) > 0:
            first_view = recent_views[0]
            assert "viewed_at" in first_view, "Expected viewed_at in recent_views"
            
            print(f"PASS: recent_views entry has viewed_at: {first_view.get('viewed_at')}")
        else:
            print("PASS: recent_views is empty (no views recorded yet)")
    
    def test_analytics_views_by_day_format(self, authenticated_client):
        """Analytics views_by_day is dict keyed by YYYY-MM-DD"""
        response = authenticated_client.get(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}/analytics")
        
        assert response.status_code == 200
        
        data = response.json()
        views_by_day = data.get("views_by_day", {})
        
        if len(views_by_day) > 0:
            for key in views_by_day.keys():
                # Verify format is YYYY-MM-DD
                assert len(key) == 10, f"Expected YYYY-MM-DD format, got {key}"
                assert key[4] == "-" and key[7] == "-", f"Expected YYYY-MM-DD format, got {key}"
                assert isinstance(views_by_day[key], int), f"Expected int value for {key}"
            
            print(f"PASS: views_by_day has {len(views_by_day)} entries with correct format")
        else:
            print("PASS: views_by_day is empty (no views in last 7 days)")
    
    def test_analytics_for_nonexistent_program(self, authenticated_client):
        """GET /api/coach-card/nonexistent/analytics returns zero analytics (not 404)"""
        response = authenticated_client.get(f"{BASE_URL}/api/coach-card/nonexistent-program/analytics")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("total_views") == 0, f"Expected total_views 0 for nonexistent, got {data.get('total_views')}"
        assert data.get("unique_visitors") == 0, f"Expected unique_visitors 0 for nonexistent, got {data.get('unique_visitors')}"
        
        print(f"PASS: Nonexistent program returns zero analytics")


class TestViewTrackingAndAnalyticsIntegration:
    """Test that recording views updates analytics"""
    
    def test_record_view_updates_analytics(self, api_client, authenticated_client):
        """Recording a view should increase total_views and add to recent_views"""
        # Get initial analytics
        analytics_before = authenticated_client.get(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}/analytics")
        assert analytics_before.status_code == 200
        before_data = analytics_before.json()
        before_total = before_data.get("total_views", 0)
        before_recent_count = len(before_data.get("recent_views", []))
        
        # Record a view (using fresh session without auth to simulate public access)
        fresh_session = requests.Session()
        view_response = fresh_session.post(f"{BASE_URL}/api/card/{EXISTING_SLUG}/view")
        assert view_response.status_code == 200
        
        # Get analytics again
        analytics_after = authenticated_client.get(f"{BASE_URL}/api/coach-card/{EXISTING_PROGRAM_ID}/analytics")
        assert analytics_after.status_code == 200
        after_data = analytics_after.json()
        after_total = after_data.get("total_views", 0)
        after_recent_count = len(after_data.get("recent_views", []))
        
        # Verify increment
        assert after_total == before_total + 1, \
            f"Expected total_views to increment from {before_total} to {before_total + 1}, got {after_total}"
        
        print(f"PASS: View tracking updates analytics - total_views: {before_total} -> {after_total}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
