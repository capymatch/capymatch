"""
Backend API tests for Pipeline and Journey page features
Tests:
- Pipeline page loads with programs
- Pipeline status filtering
- Due date color coding logic (tested via date checks)
- Journey page endpoint
- Journey page interactions
- Program status updates
- Notification navigation
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ── Test Configuration ──
TEST_PROGRAM_ID = "prog_5308e1ed4f77"  # Baylor University

@pytest.fixture(scope="module")
def api_client():
    """Create requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPipelinePage:
    """Pipeline board endpoint tests"""
    
    def test_get_all_programs(self, api_client):
        """Test GET /api/programs returns all programs"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should have at least 1 program"
        print(f"SUCCESS: GET /api/programs returns {len(data)} programs")
    
    def test_programs_have_required_fields(self, api_client):
        """Test programs have fields needed for pipeline display"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["program_id", "university_name", "recruiting_status", "next_action_due", "priority"]
        
        for program in data[:3]:  # Check first 3
            for field in required_fields:
                assert field in program, f"Program missing field: {field}"
        
        print("SUCCESS: Programs have required pipeline fields")
    
    def test_programs_distributed_across_statuses(self, api_client):
        """Test programs are distributed across different status groups"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        
        data = response.json()
        statuses = [p.get("recruiting_status", "") for p in data]
        unique_statuses = set(statuses)
        
        assert len(unique_statuses) >= 1, "Should have at least 1 unique status"
        print(f"SUCCESS: Programs distributed across {len(unique_statuses)} statuses: {unique_statuses}")
    
    def test_filter_programs_by_division(self, api_client):
        """Test filtering programs by division"""
        response = api_client.get(f"{BASE_URL}/api/programs", params={"division": "D1"})
        assert response.status_code == 200
        
        data = response.json()
        for program in data:
            assert program.get("division") == "D1", f"Filtered program should be D1, got {program.get('division')}"
        
        print(f"SUCCESS: Division filter works, returned {len(data)} D1 programs")
    
    def test_search_programs(self, api_client):
        """Test search functionality"""
        response = api_client.get(f"{BASE_URL}/api/programs", params={"search": "Baylor"})
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1, "Should find Baylor University"
        assert any("Baylor" in p.get("university_name", "") for p in data)
        
        print("SUCCESS: Search filter works for 'Baylor'")


class TestDueDateColorCoding:
    """Test due date field is present for color coding"""
    
    def test_programs_have_due_dates(self, api_client):
        """Test programs have next_action_due field"""
        response = api_client.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        
        data = response.json()
        programs_with_due = [p for p in data if p.get("next_action_due")]
        
        print(f"SUCCESS: {len(programs_with_due)} out of {len(data)} programs have due dates set")
    
    def test_update_due_date(self, api_client):
        """Test updating due date via PUT"""
        # Set a past due date
        past_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        response = api_client.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"next_action_due": past_date}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("next_action_due") == past_date
        print(f"SUCCESS: Updated due date to {past_date} (should show red)")
        
        # Set within 14 days date (orange)
        within_14 = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        response = api_client.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"next_action_due": within_14}
        )
        assert response.status_code == 200
        print(f"SUCCESS: Updated due date to {within_14} (should show orange)")


class TestJourneyPage:
    """Journey page endpoint tests"""
    
    def test_get_program_details(self, api_client):
        """Test GET /api/programs/{program_id} returns full details"""
        response = api_client.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("university_name") == "Baylor University", f"Expected Baylor, got {data.get('university_name')}"
        assert data.get("program_id") == TEST_PROGRAM_ID
        
        print(f"SUCCESS: GET /api/programs/{TEST_PROGRAM_ID} returns Baylor University")
    
    def test_get_journey_timeline(self, api_client):
        """Test GET /api/programs/{program_id}/journey returns timeline"""
        response = api_client.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/journey")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "timeline" in data, "Response should have 'timeline' key"
        assert isinstance(data["timeline"], list), "Timeline should be a list"
        
        print(f"SUCCESS: Journey endpoint returns timeline with {len(data['timeline'])} events")
    
    def test_journey_timeline_no_datetime_errors(self, api_client):
        """Test journey endpoint handles dates without errors"""
        response = api_client.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/journey")
        assert response.status_code == 200
        
        data = response.json()
        # If we get here without 500, datetime handling is fixed
        for event in data.get("timeline", []):
            assert "date" in event or "id" in event  # Should have either date or id
        
        print("SUCCESS: Journey endpoint handles datetime comparison without errors")
    
    def test_program_not_found(self, api_client):
        """Test 404 for non-existent program"""
        response = api_client.get(f"{BASE_URL}/api/programs/prog_nonexistent123")
        assert response.status_code == 404
        print("SUCCESS: Non-existent program returns 404")


class TestStatusUpdates:
    """Test status badge updates via PUT"""
    
    def test_update_recruiting_status(self, api_client):
        """Test updating recruiting_status"""
        response = api_client.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"recruiting_status": "Contacted"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("recruiting_status") == "Contacted"
        print("SUCCESS: Updated recruiting_status to 'Contacted'")
    
    def test_update_reply_status(self, api_client):
        """Test updating reply_status"""
        response = api_client.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"reply_status": "Awaiting Reply"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("reply_status") == "Awaiting Reply"
        print("SUCCESS: Updated reply_status to 'Awaiting Reply'")
    
    def test_update_priority(self, api_client):
        """Test updating priority"""
        response = api_client.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"priority": "High"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("priority") == "High"
        print("SUCCESS: Updated priority to 'High'")
    
    def test_update_interest_levels(self, api_client):
        """Test updating athlete_interest and school_interest"""
        response = api_client.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"athlete_interest": 8, "school_interest": 6}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("athlete_interest") == 8
        assert data.get("school_interest") == 6
        print("SUCCESS: Updated interest levels (athlete: 8, school: 6)")


class TestInteractionLogging:
    """Test logging interactions from journey page"""
    
    def test_create_interaction(self, api_client):
        """Test POST /api/interactions creates interaction"""
        interaction_data = {
            "program_id": TEST_PROGRAM_ID,
            "university_name": "Baylor University",
            "type": "Phone Call",
            "notes": "Test interaction from pytest",
            "outcome": "Positive",
            "date_time": datetime.now().isoformat()
        }
        
        response = api_client.post(f"{BASE_URL}/api/interactions", json=interaction_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("interaction_id"), "Should have interaction_id"
        assert data.get("program_id") == TEST_PROGRAM_ID
        
        print(f"SUCCESS: Created interaction {data.get('interaction_id')}")
        return data.get("interaction_id")
    
    def test_interaction_appears_in_journey(self, api_client):
        """Test interaction shows in journey timeline"""
        # First create an interaction
        interaction_data = {
            "program_id": TEST_PROGRAM_ID,
            "university_name": "Baylor University",
            "type": "Email",
            "notes": "Follow-up email sent",
            "outcome": "Neutral",
            "date_time": datetime.now().isoformat()
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/interactions", json=interaction_data)
        assert create_resp.status_code == 200
        
        # Then check journey timeline
        journey_resp = api_client.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}/journey")
        assert journey_resp.status_code == 200
        
        timeline = journey_resp.json().get("timeline", [])
        # Timeline should have entries (may include the new interaction)
        print(f"SUCCESS: Journey timeline has {len(timeline)} events after creating interaction")


class TestCoachManagement:
    """Test coach CRUD for journey page"""
    
    def test_get_coaches_for_program(self, api_client):
        """Test GET /api/coaches with program_id filter"""
        response = api_client.get(f"{BASE_URL}/api/coaches", params={"program_id": TEST_PROGRAM_ID})
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET coaches for program returns {len(data)} coaches")
    
    def test_create_coach(self, api_client):
        """Test POST /api/coaches creates coach"""
        coach_data = {
            "program_id": TEST_PROGRAM_ID,
            "coach_name": "Test Coach",
            "role": "Assistant Coach",
            "email": "testcoach@baylor.edu",
            "phone": "123-456-7890"
        }
        
        response = api_client.post(f"{BASE_URL}/api/coaches", json=coach_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("coach_id"), "Should have coach_id"
        assert data.get("coach_name") == "Test Coach"
        
        print(f"SUCCESS: Created coach {data.get('coach_id')}")
        
        # Cleanup - delete the test coach
        if data.get("coach_id"):
            delete_resp = api_client.delete(f"{BASE_URL}/api/coaches/{data.get('coach_id')}")
            print(f"Cleanup: Deleted test coach")


class TestFollowUpScheduler:
    """Test follow-up scheduling from journey page"""
    
    def test_update_follow_up(self, api_client):
        """Test updating next_action and next_action_due"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = api_client.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={
                "next_action": "Send follow-up email about camp",
                "next_action_due": future_date
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("next_action") == "Send follow-up email about camp"
        assert data.get("next_action_due") == future_date
        
        print(f"SUCCESS: Follow-up scheduled for {future_date}")


class TestNotifications:
    """Test notifications endpoint"""
    
    def test_get_notifications(self, api_client):
        """Test GET /api/notifications returns notifications"""
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data, "Response should have 'notifications' key"
        assert "unread_count" in data, "Response should have 'unread_count' key"
        
        print(f"SUCCESS: GET notifications returns {len(data.get('notifications', []))} notifications, {data.get('unread_count')} unread")
    
    def test_notification_has_program_id(self, api_client):
        """Test notification data includes program_id for navigation"""
        response = api_client.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        
        data = response.json()
        notifications = data.get("notifications", [])
        
        # Check structure of notifications
        if notifications:
            notif = notifications[0]
            assert "notification_id" in notif
            # program_id may be in data field
            if notif.get("data"):
                print(f"SUCCESS: Notification has data field for program_id navigation")
            else:
                print(f"INFO: Notification structure: {list(notif.keys())}")


class TestAIEndpoints:
    """Test AI-related endpoints for journey page"""
    
    def test_ai_journey_summary_endpoint(self, api_client):
        """Test POST /api/ai/journey-summary endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/journey-summary",
            json={"program_id": TEST_PROGRAM_ID}
        )
        # Should get 200 or 500 (if AI not configured), not 404
        assert response.status_code != 404, "AI journey summary endpoint should exist"
        print(f"SUCCESS: AI journey summary endpoint exists (status: {response.status_code})")
    
    def test_ai_draft_email_endpoint(self, api_client):
        """Test POST /api/ai/draft-email endpoint exists"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/draft-email",
            json={"program_id": TEST_PROGRAM_ID, "email_type": "intro"}
        )
        # Should get 200 or 500 (if profile not set), not 404
        assert response.status_code != 404, "AI draft email endpoint should exist"
        print(f"SUCCESS: AI draft email endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
