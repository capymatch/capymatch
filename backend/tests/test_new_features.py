"""
Test new features: AI Draft Email, Reminders, Profile Views
These are the 3 new features added for Volleyball Recruiting CRM.
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
SESSION_TOKEN = "sess_gmail_test_debug"
TENANT_ID = "tenant_test_debug"
PROGRAM_ID = "prog_test_ai"  # Test program with coach jcook@huskers.unl.edu

@pytest.fixture
def auth_headers():
    return {"Cookie": f"session_token={SESSION_TOKEN}"}

@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestRemindersEndpoint:
    """Tests for GET /api/reminders - Smart Follow-Up Reminders"""
    
    def test_reminders_returns_array_with_total(self, api_client, auth_headers):
        """Verify reminders endpoint returns reminders array with total_overdue count"""
        response = api_client.get(f"{BASE_URL}/api/reminders", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "reminders" in data, "Response should have 'reminders' key"
        assert "total_overdue" in data, "Response should have 'total_overdue' key"
        assert isinstance(data["reminders"], list), "'reminders' should be an array"
        assert isinstance(data["total_overdue"], int), "'total_overdue' should be an integer"
        print(f"Reminders endpoint returned {data['total_overdue']} overdue items")
    
    def test_reminders_requires_auth(self, api_client):
        """Verify reminders endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/reminders")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestProfileViewsEndpoint:
    """Tests for GET /api/profile-views - Profile View Tracking"""
    
    def test_profile_views_returns_views_array_with_counts(self, api_client, auth_headers):
        """Verify profile-views endpoint returns views array with total, today, this_week counts"""
        response = api_client.get(f"{BASE_URL}/api/profile-views", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "views" in data, "Response should have 'views' key"
        assert "total" in data, "Response should have 'total' key"
        assert "today" in data, "Response should have 'today' key"
        assert "this_week" in data, "Response should have 'this_week' key"
        assert isinstance(data["views"], list), "'views' should be an array"
        print(f"Profile views: total={data['total']}, today={data['today']}, this_week={data['this_week']}")
    
    def test_profile_views_requires_auth(self, api_client):
        """Verify profile-views endpoint requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/profile-views")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestPublicScheduleLogsViews:
    """Tests for GET /api/public/schedule/{tenant_id} - Profile View Logging"""
    
    def test_public_schedule_logs_profile_view(self, api_client, auth_headers):
        """Verify public schedule endpoint logs profile views"""
        # First, get current view count
        views_before = api_client.get(f"{BASE_URL}/api/profile-views", headers=auth_headers).json()
        initial_total = views_before.get("total", 0)
        
        # Visit public schedule (no auth required)
        public_response = api_client.get(
            f"{BASE_URL}/api/public/schedule/{TENANT_ID}",
            headers={"Referer": "https://test-coach-university.edu/recruiting"}
        )
        assert public_response.status_code == 200, f"Expected 200, got {public_response.status_code}"
        
        data = public_response.json()
        assert "profile" in data, "Response should have 'profile' key"
        assert "upcoming_events" in data, "Response should have 'upcoming_events' key"
        assert "past_events" in data, "Response should have 'past_events' key"
        
        # Check view was logged
        views_after = api_client.get(f"{BASE_URL}/api/profile-views", headers=auth_headers).json()
        new_total = views_after.get("total", 0)
        assert new_total > initial_total, f"View count should increase. Before: {initial_total}, After: {new_total}"
        print(f"Profile view logged successfully. Total views increased from {initial_total} to {new_total}")
    
    def test_public_schedule_returns_404_for_invalid_tenant(self, api_client):
        """Verify public schedule returns 404 for non-existent tenant"""
        response = api_client.get(f"{BASE_URL}/api/public/schedule/invalid_tenant_xyz")
        assert response.status_code == 404, f"Expected 404 for invalid tenant, got {response.status_code}"


class TestAIDraftEndpoint:
    """Tests for POST /api/ai/draft-email - AI Email Draft Generation"""
    
    def test_ai_draft_returns_subject_body_coach_info(self, api_client, auth_headers):
        """Verify AI draft endpoint returns subject, body, coach_name, coach_email"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/draft-email",
            headers=auth_headers,
            json={"program_id": PROGRAM_ID, "email_type": "intro"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check required fields
        assert "subject" in data, "Response should have 'subject' key"
        assert "body" in data, "Response should have 'body' key"
        assert "coach_name" in data, "Response should have 'coach_name' key"
        assert "coach_email" in data, "Response should have 'coach_email' key"
        
        # Validate content is non-empty
        assert len(data["subject"]) > 0, "Subject should not be empty"
        assert len(data["body"]) > 50, "Body should have substantial content"
        
        # Check coach info (expected: John Cook, jcook@huskers.unl.edu)
        assert data["coach_email"] == "jcook@huskers.unl.edu", f"Expected coach email jcook@huskers.unl.edu, got {data['coach_email']}"
        print(f"AI Draft generated: subject='{data['subject'][:50]}...', coach={data['coach_name']}")
    
    def test_ai_draft_returns_404_for_invalid_program(self, api_client, auth_headers):
        """Verify AI draft returns 404 for invalid program_id"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/draft-email",
            headers=auth_headers,
            json={"program_id": "invalid_program_xyz", "email_type": "intro"}
        )
        assert response.status_code == 404, f"Expected 404 for invalid program, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have error detail"
    
    def test_ai_draft_requires_auth(self, api_client):
        """Verify AI draft endpoint requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/draft-email",
            json={"program_id": PROGRAM_ID, "email_type": "intro"}
        )
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_ai_draft_accepts_different_email_types(self, api_client, auth_headers):
        """Verify AI draft accepts different email types (intro, follow_up, thank_you, interest_update)"""
        email_types = ["intro", "follow_up", "thank_you", "interest_update"]
        
        for email_type in email_types:
            response = api_client.post(
                f"{BASE_URL}/api/ai/draft-email",
                headers=auth_headers,
                json={"program_id": PROGRAM_ID, "email_type": email_type}
            )
            assert response.status_code == 200, f"Expected 200 for email_type={email_type}, got {response.status_code}"
            data = response.json()
            assert "subject" in data and "body" in data, f"Missing subject/body for email_type={email_type}"
            print(f"Email type '{email_type}' generated successfully")
    
    def test_ai_draft_with_custom_instructions(self, api_client, auth_headers):
        """Verify AI draft accepts custom instructions"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/draft-email",
            headers=auth_headers,
            json={
                "program_id": PROGRAM_ID,
                "email_type": "intro",
                "custom_instructions": "Mention that I will be attending their camp next month"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert len(data["body"]) > 50, "Body should have substantial content with custom instructions"
        print(f"Custom instructions accepted, draft generated")


class TestDashboardStatsIntegration:
    """Tests to verify dashboard stats include new feature data"""
    
    def test_dashboard_returns_follow_ups_due(self, api_client, auth_headers):
        """Verify dashboard endpoint returns follow_ups_due count"""
        response = api_client.get(f"{BASE_URL}/api/dashboard", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "follow_ups_due" in data, "Dashboard should have 'follow_ups_due' field"
        assert isinstance(data["follow_ups_due"], int), "'follow_ups_due' should be integer"
        print(f"Dashboard shows {data['follow_ups_due']} follow-ups due")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
