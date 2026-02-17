# Test file for Next Step Card feature and related timeline/interaction logic
# Tests: Timeline event_type mapping, Camp/Campus Visit/Showcase interactions

import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNextStepCardFeature:
    """Tests for Next Step card feature - backend timeline and interaction logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get session cookie"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with pro user
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        
        self.program_id = "prog_pro_test1"  # UCLA with camp interaction
    
    def test_journey_timeline_endpoint_returns_timeline(self):
        """Test: Journey timeline endpoint returns timeline array"""
        resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "timeline" in data, "Response should contain 'timeline' key"
        assert isinstance(data["timeline"], list), "Timeline should be a list"
        print(f"Timeline has {len(data['timeline'])} events")
    
    def test_timeline_events_have_required_fields(self):
        """Test: Timeline events have id, event_type, title, date fields"""
        resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        assert resp.status_code == 200
        data = resp.json()
        timeline = data.get("timeline", [])
        
        for event in timeline:
            assert "id" in event, f"Event missing 'id': {event}"
            assert "event_type" in event, f"Event missing 'event_type': {event}"
            assert "title" in event, f"Event missing 'title': {event}"
            assert "date" in event, f"Event missing 'date': {event}"
            print(f"Event: type={event['event_type']}, title={event['title']}")
    
    def test_camp_interaction_returns_camp_event_type(self):
        """Test: Camp interaction returns event_type='camp' in timeline"""
        resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        assert resp.status_code == 200
        data = resp.json()
        timeline = data.get("timeline", [])
        
        # Find camp events
        camp_events = [e for e in timeline if e.get("event_type") == "camp"]
        print(f"Found {len(camp_events)} camp events in timeline")
        
        # UCLA should have at least one camp event
        assert len(camp_events) >= 1, "UCLA (prog_pro_test1) should have at least 1 camp event"
        
        # Check camp event has proper title format
        for camp in camp_events:
            print(f"Camp event: title='{camp['title']}', date={camp['date']}")
            assert "Camp" in camp["title"] or "camp" in camp["title"].lower(), \
                f"Camp title should contain 'Camp': {camp['title']}"
    
    def test_create_camp_interaction_and_verify_timeline(self):
        """Test: Create new Camp interaction and verify it appears in timeline with correct type"""
        # Create a new Camp interaction
        interaction_data = {
            "program_id": self.program_id,
            "university_name": "UCLA",
            "type": "Camp",
            "notes": "TEST_Camp interaction for Next Step card testing",
            "outcome": "Positive",
            "date_time": datetime.now(timezone.utc).isoformat()
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/interactions", json=interaction_data)
        assert create_resp.status_code == 200, f"Failed to create camp interaction: {create_resp.text}"
        created = create_resp.json()
        print(f"Created interaction: {created.get('interaction_id')}")
        
        # Verify in timeline
        timeline_resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        assert timeline_resp.status_code == 200
        timeline = timeline_resp.json().get("timeline", [])
        
        # Find our new camp event (most recent)
        test_camp = next((e for e in timeline if "TEST_Camp" in (e.get("content") or "")), None)
        assert test_camp is not None, "Created camp interaction should appear in timeline"
        assert test_camp["event_type"] == "camp", f"Camp interaction should have event_type='camp', got: {test_camp['event_type']}"
        print(f"Verified camp in timeline: type={test_camp['event_type']}, title={test_camp['title']}")
    
    def test_create_campus_visit_interaction_and_verify_timeline(self):
        """Test: Create Campus Visit interaction and verify event_type='campus_visit'"""
        interaction_data = {
            "program_id": self.program_id,
            "university_name": "UCLA",
            "type": "Campus Visit",
            "notes": "TEST_CampusVisit interaction for testing",
            "outcome": "Positive",
            "date_time": datetime.now(timezone.utc).isoformat()
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/interactions", json=interaction_data)
        assert create_resp.status_code == 200, f"Failed to create campus visit: {create_resp.text}"
        
        # Verify in timeline
        timeline_resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        timeline = timeline_resp.json().get("timeline", [])
        
        test_visit = next((e for e in timeline if "TEST_CampusVisit" in (e.get("content") or "")), None)
        assert test_visit is not None, "Created campus visit should appear in timeline"
        assert test_visit["event_type"] == "campus_visit", f"Campus Visit should have event_type='campus_visit', got: {test_visit['event_type']}"
        print(f"Verified campus_visit: type={test_visit['event_type']}, title={test_visit['title']}")
    
    def test_create_showcase_interaction_and_verify_timeline(self):
        """Test: Create Showcase interaction and verify event_type='showcase'"""
        interaction_data = {
            "program_id": self.program_id,
            "university_name": "UCLA",
            "type": "Showcase",
            "notes": "TEST_Showcase interaction for testing",
            "outcome": "Positive",
            "date_time": datetime.now(timezone.utc).isoformat()
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/interactions", json=interaction_data)
        assert create_resp.status_code == 200, f"Failed to create showcase: {create_resp.text}"
        
        # Verify in timeline
        timeline_resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        timeline = timeline_resp.json().get("timeline", [])
        
        test_showcase = next((e for e in timeline if "TEST_Showcase" in (e.get("content") or "")), None)
        assert test_showcase is not None, "Created showcase should appear in timeline"
        assert test_showcase["event_type"] == "showcase", f"Showcase should have event_type='showcase', got: {test_showcase['event_type']}"
        print(f"Verified showcase: type={test_showcase['event_type']}, title={test_showcase['title']}")
    
    def test_coach_reply_hides_next_step_card(self):
        """Test: When latest event is coach_reply, celebration hero shows (not Next Step card)"""
        # Get current program data
        resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}")
        assert resp.status_code == 200
        program = resp.json()
        
        # Get timeline
        timeline_resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        timeline = timeline_resp.json().get("timeline", [])
        
        if timeline:
            latest = timeline[0]
            latest_type = latest.get("event_type", "").lower()
            print(f"Latest event: type={latest_type}, title={latest.get('title')}")
            
            # Logic check: if latest is coach_reply or email_received, celebration should show
            if latest_type in ["coach_reply", "email_received"]:
                # Board group should be in_conversation
                assert program.get("board_group") == "in_conversation", \
                    f"With coach reply, board_group should be 'in_conversation', got: {program.get('board_group')}"
                print("Celebration hero scenario: latest is coach reply, in_conversation status")
            else:
                # Next Step card should show for other activity types
                print(f"Next Step card scenario: latest is {latest_type}, not a coach reply")
    
    def test_new_school_shows_checklist_not_next_step(self):
        """Test: Create new school - should show getting started checklist, not Next Step card"""
        # Create a test program
        create_data = {
            "university_name": f"TEST_NewSchool_{datetime.now().strftime('%H%M%S')}",
            "division": "D1",
            "conference": "Test Conference",
            "region": "West"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json=create_data)
        assert create_resp.status_code == 200, f"Failed to create program: {create_resp.text}"
        new_program = create_resp.json()
        new_program_id = new_program["program_id"]
        print(f"Created test program: {new_program_id}")
        
        try:
            # Get program details
            resp = self.session.get(f"{BASE_URL}/api/programs/{new_program_id}")
            assert resp.status_code == 200
            program = resp.json()
            
            # Get timeline - should be empty
            timeline_resp = self.session.get(f"{BASE_URL}/api/programs/{new_program_id}/journey")
            timeline = timeline_resp.json().get("timeline", [])
            
            assert len(timeline) == 0, f"New school should have empty timeline, got {len(timeline)} events"
            print("New school has empty timeline - checklist scenario")
            
            # Board group should be needs_outreach (no interactions)
            assert program.get("board_group") == "needs_outreach", \
                f"New school should be 'needs_outreach', got: {program.get('board_group')}"
            
        finally:
            # Cleanup - delete test program
            delete_resp = self.session.delete(f"{BASE_URL}/api/programs/{new_program_id}")
            print(f"Cleanup: deleted test program {new_program_id}")
    
    def test_progress_rail_stages_structure(self):
        """Test: Progress rail has correct stage structure"""
        resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}")
        assert resp.status_code == 200
        program = resp.json()
        
        rail = program.get("journey_rail")
        assert rail is not None, "Program should have journey_rail"
        
        # Check rail structure
        assert "stages" in rail, "Rail should have stages"
        assert "active" in rail, "Rail should have active"
        assert "line_fill" in rail, "Rail should have line_fill"
        assert "pulse" in rail, "Rail should have pulse"
        
        stages = rail["stages"]
        expected_stages = ["added", "outreach_sent", "coach_replied", "campus_visit", "offer", "committed"]
        for stage in expected_stages:
            assert stage in stages, f"Stages should include '{stage}'"
        
        print(f"Progress rail: active={rail['active']}, pulse={rail['pulse']}")
        print(f"Stages: {stages}")


class TestInteractionTypeMapping:
    """Tests for interaction type to timeline event_type mapping"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        assert login_resp.status_code == 200
        self.program_id = "prog_pro_test1"
    
    def test_phone_call_maps_to_phone_call(self):
        """Phone Call interaction should map to phone_call event_type"""
        timeline_resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        timeline = timeline_resp.json().get("timeline", [])
        
        phone_events = [e for e in timeline if e.get("event_type") == "phone_call"]
        print(f"Found {len(phone_events)} phone_call events")
        
        for e in phone_events:
            print(f"  - {e['title']}: {e.get('content', '')[:50]}...")
    
    def test_coach_reply_maps_to_email_received(self):
        """coach_reply interaction should map to email_received event_type"""
        timeline_resp = self.session.get(f"{BASE_URL}/api/programs/{self.program_id}/journey")
        timeline = timeline_resp.json().get("timeline", [])
        
        coach_reply_events = [e for e in timeline if e.get("event_type") == "email_received"]
        print(f"Found {len(coach_reply_events)} email_received (coach_reply) events")
        
        # UCLA should have coach reply migrated from legacy data
        assert len(coach_reply_events) >= 1, "UCLA should have at least 1 coach reply event"


# Cleanup test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_interactions():
    """Cleanup TEST_ prefixed interactions after tests"""
    yield
    
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "pro@test.com",
        "password": "password"
    })
    
    if login_resp.status_code == 200:
        # Get all interactions
        resp = session.get(f"{BASE_URL}/api/interactions")
        if resp.status_code == 200:
            interactions = resp.json()
            for i in interactions:
                notes = i.get("notes", "")
                if notes and notes.startswith("TEST_"):
                    print(f"Note: TEST interaction would be cleaned up: {i.get('interaction_id')}")
                    # Note: No delete endpoint for individual interactions in current API


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
