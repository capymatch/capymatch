"""
Engagement Tracking Tests for CapyMatch
Tests email opens, link clicks, profile views tracking endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTrackingEndpoints:
    """Public tracking endpoints - no auth required"""

    def test_track_email_open_returns_gif(self):
        """GET /api/track/open/{id} should return 1x1 transparent GIF"""
        # Use a random tracking ID (won't find a record but should still return GIF)
        random_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/track/open/{random_id}")
        
        # Status should be 200 OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Content type should be image/gif
        assert response.headers.get('Content-Type') == 'image/gif', f"Expected image/gif, got {response.headers.get('Content-Type')}"
        
        # Response should be a valid GIF (starts with GIF87a or GIF89a)
        content = response.content
        assert len(content) > 0, "Response body should not be empty"
        assert content[:3] == b'GIF', f"Content should start with GIF header, got {content[:6]}"
        print(f"PASS: track/open returns GIF ({len(content)} bytes)")

    def test_track_click_redirects_for_unknown_id(self):
        """GET /api/track/click/{id} should redirect to / for unknown IDs"""
        random_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/track/click/{random_id}", allow_redirects=False)
        
        # Should return 302 redirect
        assert response.status_code == 302, f"Expected 302, got {response.status_code}"
        
        # Location header should point to /
        location = response.headers.get('Location', '')
        assert location == '/' or location.endswith('/'), f"Expected redirect to /, got {location}"
        print(f"PASS: track/click redirects for unknown ID (Location: {location})")


class TestEngagementSummaryEndpoint:
    """Authenticated engagement summary endpoint tests"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token by logging in"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@capymatch.com",
            "password": "demo2026"
        })
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        data = login_response.json()
        token = data.get('session_token') or data.get('token')
        if not token:
            pytest.skip("No token in login response")
        print(f"Login successful, token obtained")
        return token

    def test_engagement_summary_requires_auth(self):
        """GET /api/engagement/summary should require auth"""
        response = requests.get(f"{BASE_URL}/api/engagement/summary")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: engagement/summary requires auth (status: {response.status_code})")

    def test_engagement_summary_returns_expected_fields(self, auth_token):
        """GET /api/engagement/summary with auth should return expected structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/engagement/summary", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required top-level fields
        assert "totals" in data, "Response should have 'totals' field"
        assert "feed" in data, "Response should have 'feed' field"
        assert "by_school" in data, "Response should have 'by_school' field"
        assert "hot_leads" in data, "Response should have 'hot_leads' field"
        
        # Check totals structure
        totals = data["totals"]
        assert "email_opens" in totals, "totals should have 'email_opens'"
        assert "link_clicks" in totals, "totals should have 'link_clicks'"
        assert "profile_views" in totals, "totals should have 'profile_views'"
        
        # feed should be a list
        assert isinstance(data["feed"], list), "feed should be a list"
        
        # by_school should be a dict
        assert isinstance(data["by_school"], dict), "by_school should be a dict"
        
        # hot_leads should be a list
        assert isinstance(data["hot_leads"], list), "hot_leads should be a list"
        
        print(f"PASS: engagement/summary returns expected structure")
        print(f"  - Totals: opens={totals.get('email_opens')}, clicks={totals.get('link_clicks')}, views={totals.get('profile_views')}")
        print(f"  - Feed items: {len(data['feed'])}")
        print(f"  - Schools with engagement: {len(data['by_school'])}")
        print(f"  - Hot leads: {len(data['hot_leads'])}")


class TestSchoolEngagementEndpoint:
    """Authenticated school-specific engagement endpoint tests"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token by logging in"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "demo@capymatch.com",
            "password": "demo2026"
        })
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        data = login_response.json()
        token = data.get('session_token') or data.get('token')
        if not token:
            pytest.skip("No token in login response")
        return token

    def test_school_engagement_requires_auth(self):
        """GET /api/engagement/school/{id} should require auth"""
        response = requests.get(f"{BASE_URL}/api/engagement/school/some-program-id")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: engagement/school/{'{id}'} requires auth (status: {response.status_code})")

    def test_school_engagement_returns_expected_fields(self, auth_token):
        """GET /api/engagement/school/{id} with auth should return expected structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Use a made-up program_id - should return empty data but valid structure
        test_program_id = "test-program-id-123"
        response = requests.get(f"{BASE_URL}/api/engagement/school/{test_program_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check expected fields
        assert "program_id" in data, "Response should have 'program_id'"
        assert "total_opens" in data, "Response should have 'total_opens'"
        assert "total_clicks" in data, "Response should have 'total_clicks'"
        assert "unique_opens" in data, "Response should have 'unique_opens'"
        assert "timeline" in data, "Response should have 'timeline'"
        
        # timeline should be a list
        assert isinstance(data["timeline"], list), "timeline should be a list"
        
        # program_id should match what we requested
        assert data["program_id"] == test_program_id, f"program_id should match request"
        
        print(f"PASS: engagement/school/{'{id}'} returns expected structure")
        print(f"  - Program ID: {data['program_id']}")
        print(f"  - Total opens: {data['total_opens']}")
        print(f"  - Total clicks: {data['total_clicks']}")
        print(f"  - Unique opens: {data['unique_opens']}")
        print(f"  - Timeline events: {len(data['timeline'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
