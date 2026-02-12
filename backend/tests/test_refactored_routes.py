"""
Backend API Tests for Volleyball Recruiting CRM - Route Refactoring Validation
Tests verify all route modules are properly registered after refactoring from monolithic server.py
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRootAndPublicEndpoints:
    """Test root and public endpoints (no auth required)"""

    def test_api_root_returns_message(self):
        """GET /api/ - Root endpoint returns API message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Volleyball" in data["message"]
        print(f"PASS: /api/ returns: {data['message']}")

    def test_knowledge_base_returns_universities(self):
        """GET /api/knowledge-base - Returns list of universities"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure
        first = data[0]
        assert "university_name" in first
        assert "division" in first
        assert "conference" in first
        print(f"PASS: /api/knowledge-base returns {len(data)} universities")

    def test_knowledge_base_filter_by_division(self):
        """GET /api/knowledge-base?division=D1 - Filter by division"""
        response = requests.get(f"{BASE_URL}/api/knowledge-base?division=D1")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All results should be D1
        for uni in data:
            assert uni["division"] == "D1"
        print(f"PASS: /api/knowledge-base filter D1 returns {len(data)} universities")


class TestAuthRoutesModule:
    """Test auth routes module is registered (routes/auth_routes.py)"""

    def test_auth_me_requires_authentication(self):
        """GET /api/auth/me - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("PASS: /api/auth/me returns 401 (auth required)")


class TestProgramsRoutesModule:
    """Test programs routes module is registered (routes/programs.py)"""

    def test_programs_requires_authentication(self):
        """GET /api/programs - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 401
        print("PASS: /api/programs returns 401 (auth required)")

    def test_coaches_requires_authentication(self):
        """GET /api/coaches - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/coaches")
        assert response.status_code == 401
        print("PASS: /api/coaches returns 401 (auth required)")

    def test_interactions_requires_authentication(self):
        """GET /api/interactions - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/interactions")
        assert response.status_code == 401
        print("PASS: /api/interactions returns 401 (auth required)")

    def test_follow_ups_requires_authentication(self):
        """GET /api/follow-ups - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/follow-ups")
        assert response.status_code == 401
        print("PASS: /api/follow-ups returns 401 (auth required)")


class TestEventsRoutesModule:
    """Test events routes module is registered (routes/events.py)"""

    def test_events_requires_authentication(self):
        """GET /api/events - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/events")
        assert response.status_code == 401
        print("PASS: /api/events returns 401 (auth required)")


class TestDashboardRoutesModule:
    """Test dashboard routes module is registered (routes/dashboard.py)"""

    def test_dashboard_requires_authentication(self):
        """GET /api/dashboard - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/dashboard")
        assert response.status_code == 401
        print("PASS: /api/dashboard returns 401 (auth required)")

    def test_reminders_requires_authentication(self):
        """GET /api/reminders - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/reminders")
        assert response.status_code == 401
        print("PASS: /api/reminders returns 401 (auth required)")


class TestProfileRoutesModule:
    """Test profile routes module is registered (routes/profile.py)"""

    def test_athlete_profile_requires_authentication(self):
        """GET /api/athlete-profile - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/athlete-profile")
        assert response.status_code == 401
        print("PASS: /api/athlete-profile returns 401 (auth required)")

    def test_profile_views_requires_authentication(self):
        """GET /api/profile-views - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/profile-views")
        assert response.status_code == 401
        print("PASS: /api/profile-views returns 401 (auth required)")

    def test_tenant_requires_authentication(self):
        """GET /api/tenant - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/tenant")
        assert response.status_code == 401
        print("PASS: /api/tenant returns 401 (auth required)")

    def test_share_link_requires_authentication(self):
        """GET /api/share-link - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/share-link")
        assert response.status_code == 401
        print("PASS: /api/share-link returns 401 (auth required)")


class TestAIRoutesModule:
    """Test AI routes module is registered (routes/ai.py)"""

    def test_ai_draft_email_requires_authentication(self):
        """POST /api/ai/draft-email - Returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/ai/draft-email",
            json={"program_id": "test", "email_type": "intro"}
        )
        assert response.status_code == 401
        print("PASS: /api/ai/draft-email returns 401 (auth required)")


class TestGmailRoutesModule:
    """Test Gmail routes module is registered (routes/gmail.py)"""

    def test_gmail_status_requires_authentication(self):
        """GET /api/gmail/status - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/gmail/status")
        assert response.status_code == 401
        print("PASS: /api/gmail/status returns 401 (auth required)")

    def test_gmail_connect_requires_authentication(self):
        """GET /api/gmail/connect - Returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/gmail/connect")
        assert response.status_code == 401
        print("PASS: /api/gmail/connect returns 401 (auth required)")


class TestPublicScheduleRoute:
    """Test public schedule endpoint (no auth, but requires valid tenant)"""

    def test_public_schedule_returns_404_for_invalid_tenant(self):
        """GET /api/public/schedule/{tenant_id} - Returns 404 for invalid tenant"""
        response = requests.get(f"{BASE_URL}/api/public/schedule/invalid_tenant_xyz")
        assert response.status_code == 404
        print("PASS: /api/public/schedule/{invalid} returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
