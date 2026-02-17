"""
Backend tests for Journey Page Redesign with 7 Apple-inspired UX improvements.

Tests:
- Progress Rail with 6 stages (added, outreach_sent, coach_replied, campus_visit, offer, committed)
- Pulse indicator (active, cooling, cold, neutral)
- Journey rail auto-detection from timeline data
- Manual stage override via journey_stage field
- Compare endpoint for school comparison page
- Mark as replied endpoint
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "premium@test.com"
TEST_PASSWORD = "password"

# Known program IDs
UCLA_PROGRAM_ID = "prog_4319d98c1c3b"
STANFORD_PROGRAM_ID = "prog_3cbb4ff4df51"


@pytest.fixture(scope="module")
def auth_session():
    """Create authenticated session for all tests."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if resp.status_code != 200:
        pytest.skip(f"Login failed with status {resp.status_code}")
    
    return session


class TestJourneyRailEndpoint:
    """Test GET /api/programs/{id} returns journey_rail data."""
    
    def test_get_program_returns_journey_rail(self, auth_session):
        """Program endpoint should return journey_rail with stages and pulse."""
        resp = auth_session.get(f"{BASE_URL}/api/programs/{UCLA_PROGRAM_ID}")
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        # journey_rail should be present
        assert "journey_rail" in data, "journey_rail missing from response"
        rail = data["journey_rail"]
        
        # Check rail structure
        assert "stages" in rail, "stages missing from journey_rail"
        assert "active" in rail, "active missing from journey_rail"
        assert "pulse" in rail, "pulse missing from journey_rail"
        
        # Check all 6 stages are present
        expected_stages = ["added", "outreach_sent", "coach_replied", "campus_visit", "offer", "committed"]
        for stage in expected_stages:
            assert stage in rail["stages"], f"Stage '{stage}' missing from journey_rail.stages"
        
        print(f"SUCCESS: UCLA journey_rail: active={rail['active']}, pulse={rail['pulse']}")
        print(f"         Stages: {rail['stages']}")
    
    def test_stanford_has_coach_replied_stage(self, auth_session):
        """Stanford should have coach_replied stage completed (from review_request)."""
        resp = auth_session.get(f"{BASE_URL}/api/programs/{STANFORD_PROGRAM_ID}")
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        
        # Should have journey_rail
        assert "journey_rail" in data, "journey_rail missing"
        rail = data["journey_rail"]
        
        # Check if coach_replied stage is true (based on interactions)
        signals = data.get("signals", {})
        has_reply = signals.get("has_coach_reply", False)
        
        print(f"SUCCESS: Stanford signals.has_coach_reply={has_reply}")
        print(f"         Rail active stage: {rail['active']}")
        print(f"         Rail pulse: {rail['pulse']}")
        
        # If Stanford has coach reply, the active stage should be coach_replied or higher
        if has_reply:
            assert rail["stages"]["coach_replied"] == True, "coach_replied stage should be True"


class TestPulseIndicator:
    """Test pulse indicator calculation based on activity."""
    
    def test_pulse_values_are_valid(self, auth_session):
        """Pulse should be one of: active, cooling, cold, neutral."""
        resp = auth_session.get(f"{BASE_URL}/api/programs/{UCLA_PROGRAM_ID}")
        
        assert resp.status_code == 200
        data = resp.json()
        
        rail = data.get("journey_rail", {})
        pulse = rail.get("pulse")
        
        valid_pulses = ["active", "cooling", "cold", "neutral"]
        assert pulse in valid_pulses, f"Invalid pulse value: {pulse}"
        
        print(f"SUCCESS: Pulse value '{pulse}' is valid")


class TestJourneyTimeline:
    """Test GET /api/programs/{id}/journey returns timeline data."""
    
    def test_get_journey_timeline(self, auth_session):
        """Journey endpoint should return timeline array."""
        resp = auth_session.get(f"{BASE_URL}/api/programs/{STANFORD_PROGRAM_ID}/journey")
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert "timeline" in data, "timeline missing from response"
        assert isinstance(data["timeline"], list), "timeline should be an array"
        
        print(f"SUCCESS: Stanford timeline has {len(data['timeline'])} events")
        
        # Check timeline event structure if there are events
        if data["timeline"]:
            event = data["timeline"][0]
            expected_fields = ["id", "event_type", "title", "date"]
            for field in expected_fields:
                assert field in event, f"Event missing field '{field}'"
            print(f"         First event: {event.get('title')} ({event.get('event_type')})")


class TestManualStageOverride:
    """Test manual journey_stage override."""
    
    def test_update_journey_stage(self, auth_session):
        """PUT /api/programs/{id} with journey_stage should update the rail."""
        # Create a test program first
        create_resp = auth_session.post(f"{BASE_URL}/api/programs", json={
            "university_name": "TEST_JourneyStageOverride University",
            "division": "D1"
        })
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test program")
        
        test_program_id = create_resp.json()["program_id"]
        
        try:
            # Update journey_stage to campus_visit
            update_resp = auth_session.put(f"{BASE_URL}/api/programs/{test_program_id}", json={
                "journey_stage": "campus_visit"
            })
            
            assert update_resp.status_code == 200, f"Update failed: {update_resp.status_code}"
            
            # Fetch program and verify rail
            get_resp = auth_session.get(f"{BASE_URL}/api/programs/{test_program_id}")
            assert get_resp.status_code == 200
            
            data = get_resp.json()
            rail = data.get("journey_rail", {})
            
            # Manual override should mark campus_visit and all prior stages as completed
            assert rail["stages"]["added"] == True, "added should be True"
            assert rail["stages"]["outreach_sent"] == True, "outreach_sent should be True after manual override"
            assert rail["stages"]["coach_replied"] == True, "coach_replied should be True after manual override"
            assert rail["stages"]["campus_visit"] == True, "campus_visit should be True after manual override"
            assert rail["active"] == "campus_visit", f"Active should be campus_visit, got {rail['active']}"
            
            print(f"SUCCESS: Manual stage override working - active={rail['active']}")
            
        finally:
            # Cleanup
            auth_session.delete(f"{BASE_URL}/api/programs/{test_program_id}")


class TestCompareEndpoint:
    """Test POST /api/programs/compare endpoint."""
    
    def test_compare_multiple_programs(self, auth_session):
        """Compare endpoint should return enriched data for multiple programs."""
        resp = auth_session.post(f"{BASE_URL}/api/programs/compare", json={
            "program_ids": [UCLA_PROGRAM_ID, STANFORD_PROGRAM_ID]
        })
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Compare should return an array"
        assert len(data) >= 1, "Should return at least 1 program"
        
        # Check each program has required enrichment fields
        for program in data:
            assert "program_id" in program, "Missing program_id"
            assert "journey_rail" in program, "Missing journey_rail in compare response"
            assert "signals" in program, "Missing signals in compare response"
            assert "board_group" in program, "Missing board_group in compare response"
            
        print(f"SUCCESS: Compare returned {len(data)} programs with enriched data")
        for p in data:
            print(f"         - {p.get('university_name')}: rail.active={p.get('journey_rail', {}).get('active')}")
    
    def test_compare_empty_list(self, auth_session):
        """Compare with empty list should return empty array."""
        resp = auth_session.post(f"{BASE_URL}/api/programs/compare", json={
            "program_ids": []
        })
        
        assert resp.status_code == 200
        data = resp.json()
        assert data == [], "Empty program_ids should return empty array"
        
        print("SUCCESS: Compare with empty list returns []")


class TestMarkAsReplied:
    """Test POST /api/programs/{id}/mark-replied endpoint."""
    
    def test_mark_replied_requires_note(self, auth_session):
        """Mark replied should require non-empty note."""
        resp = auth_session.post(f"{BASE_URL}/api/programs/{UCLA_PROGRAM_ID}/mark-replied", json={
            "note": ""
        })
        
        assert resp.status_code == 400, f"Expected 400 for empty note, got {resp.status_code}"
        print("SUCCESS: Empty note correctly rejected with 400")
    
    def test_mark_replied_creates_interaction(self, auth_session):
        """Mark replied with valid note should create coach_reply interaction."""
        # Create a test program
        create_resp = auth_session.post(f"{BASE_URL}/api/programs", json={
            "university_name": "TEST_MarkReplied University",
            "division": "D2"
        })
        
        if create_resp.status_code != 200:
            pytest.skip("Could not create test program")
        
        test_program_id = create_resp.json()["program_id"]
        
        try:
            # Mark as replied
            reply_resp = auth_session.post(f"{BASE_URL}/api/programs/{test_program_id}/mark-replied", json={
                "note": "TEST: Coach invited me to a camp"
            })
            
            assert reply_resp.status_code == 200, f"Mark replied failed: {reply_resp.status_code}"
            data = reply_resp.json()
            
            # Should return updated program with signals
            assert "signals" in data, "Response should include signals"
            signals = data["signals"]
            assert signals.get("has_coach_reply") == True, "has_coach_reply should be True after marking replied"
            
            # Verify by fetching journey
            journey_resp = auth_session.get(f"{BASE_URL}/api/programs/{test_program_id}/journey")
            assert journey_resp.status_code == 200
            
            timeline = journey_resp.json().get("timeline", [])
            coach_replies = [e for e in timeline if e.get("event_type") in ("email_received", "coach_reply")]
            
            assert len(coach_replies) >= 1, "Should have at least 1 coach reply in timeline"
            print(f"SUCCESS: Mark replied created coach_reply interaction")
            print(f"         signals.has_coach_reply={signals.get('has_coach_reply')}")
            
        finally:
            # Cleanup
            auth_session.delete(f"{BASE_URL}/api/programs/{test_program_id}")


class TestBoardGroupCategories:
    """Test board_group categorization works correctly."""
    
    def test_board_group_values(self, auth_session):
        """board_group should be one of the valid categories."""
        resp = auth_session.get(f"{BASE_URL}/api/programs")
        
        assert resp.status_code == 200
        programs = resp.json()
        
        valid_groups = ["overdue", "needs_outreach", "waiting_on_reply", "in_conversation", "archived"]
        
        for p in programs:
            group = p.get("board_group")
            assert group in valid_groups, f"Invalid board_group '{group}' for {p.get('university_name')}"
        
        print(f"SUCCESS: All {len(programs)} programs have valid board_group")
        
        # Count by group
        counts = {}
        for p in programs:
            g = p.get("board_group")
            counts[g] = counts.get(g, 0) + 1
        print(f"         Distribution: {counts}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
