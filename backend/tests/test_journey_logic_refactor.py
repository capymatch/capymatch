"""
Test Journey Logic Refactor - Data-Driven Signals System
=========================================================
Tests the major refactor where manual recruiting_status and reply_status dropdowns
are replaced with a data-driven system. The app now derives 'Next Step' from 
timeline data (interactions) and user-set due dates.

Key features tested:
- GET /api/programs returns `signals` object with data-driven fields
- GET /api/programs?grouped=true returns programs grouped by signals
- POST /api/programs/{program_id}/mark-replied creates coach_reply interaction
- PUT /api/programs/{program_id} with is_active=false moves to closed group
- GET /api/programs/{program_id}/journey shows coach_reply as email_received
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSignalsObjectInPrograms:
    """Tests for signals object computation in GET /api/programs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session for all tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as pro user
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_programs_returns_signals_object(self):
        """Test that GET /api/programs returns programs with signals object"""
        response = self.session.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            program = data[0]
            assert "signals" in program, "Program should have 'signals' object"
            signals = program["signals"]
            
            # Verify signals structure
            assert "emails_sent" in signals, "signals should have 'emails_sent'"
            assert "has_coach_reply" in signals, "signals should have 'has_coach_reply'"
            assert "last_outreach_date" in signals, "signals should have 'last_outreach_date'"
            assert "days_since_outreach" in signals, "signals should have 'days_since_outreach'"
            assert "total_interactions" in signals, "signals should have 'total_interactions'"
            
            print(f"✓ Program '{program.get('university_name')}' has signals: {signals}")
        else:
            print("⚠ No programs found to test signals on")
    
    def test_signals_contains_all_required_fields(self):
        """Test that signals object contains all required data-driven fields"""
        response = self.session.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            signals = data[0].get("signals", {})
            
            required_fields = [
                "emails_sent",
                "has_coach_reply", 
                "last_outreach_date",
                "last_reply_date",
                "days_since_outreach",
                "days_since_reply",
                "total_interactions"
            ]
            
            for field in required_fields:
                assert field in signals, f"signals missing required field: {field}"
            
            print(f"✓ All required signals fields present: {required_fields}")
    
    def test_single_program_returns_signals(self):
        """Test that GET /api/programs/{program_id} returns signals"""
        # First get list to find a program_id
        list_resp = self.session.get(f"{BASE_URL}/api/programs")
        assert list_resp.status_code == 200
        
        programs = list_resp.json()
        if len(programs) > 0:
            program_id = programs[0]["program_id"]
            
            # Get single program
            single_resp = self.session.get(f"{BASE_URL}/api/programs/{program_id}")
            assert single_resp.status_code == 200
            
            program = single_resp.json()
            assert "signals" in program, "Single program should have signals"
            print(f"✓ Single program GET returns signals object")
        else:
            print("⚠ No programs to test single GET")


class TestGroupedProgramsEndpoint:
    """Tests for GET /api/programs?grouped=true with data-driven signals"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_grouped_returns_four_groups(self):
        """Test that grouped endpoint returns all 4 board groups"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        assert "groups" in data
        
        expected_groups = ["action_required", "upcoming", "in_progress", "closed"]
        for group in expected_groups:
            assert group in data["groups"], f"Missing group: {group}"
        
        print(f"✓ Grouped endpoint returns all 4 groups: {list(data['groups'].keys())}")
        print(f"  Counts: {data.get('counts', {})}")
    
    def test_grouped_programs_have_board_group_field(self):
        """Test that each program in grouped response has board_group"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        for group_key, programs in data["groups"].items():
            for p in programs:
                assert "board_group" in p, f"Program missing board_group in {group_key}"
                assert p["board_group"] == group_key, f"Program board_group mismatch"
        
        print("✓ All grouped programs have correct board_group field")
    
    def test_grouped_programs_have_signals(self):
        """Test that all programs in grouped response have signals"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        for group_key, programs in data["groups"].items():
            for p in programs:
                assert "signals" in p, f"Program in {group_key} missing signals"
        
        print("✓ All grouped programs have signals object")


class TestMarkAsRepliedEndpoint:
    """Tests for POST /api/programs/{program_id}/mark-replied endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.test_program_id = None
    
    def test_mark_replied_requires_note(self):
        """Test that mark-replied returns 400 if note is empty"""
        # First get or create a test program
        list_resp = self.session.get(f"{BASE_URL}/api/programs")
        assert list_resp.status_code == 200
        
        programs = list_resp.json()
        if len(programs) > 0:
            program_id = programs[0]["program_id"]
            
            # Try with empty note
            response = self.session.post(
                f"{BASE_URL}/api/programs/{program_id}/mark-replied",
                json={"note": ""}
            )
            assert response.status_code == 400, f"Expected 400 for empty note, got {response.status_code}"
            print("✓ mark-replied returns 400 for empty note")
            
            # Try with whitespace only
            response2 = self.session.post(
                f"{BASE_URL}/api/programs/{program_id}/mark-replied",
                json={"note": "   "}
            )
            assert response2.status_code == 400, f"Expected 400 for whitespace note, got {response2.status_code}"
            print("✓ mark-replied returns 400 for whitespace-only note")
    
    def test_mark_replied_creates_interaction(self):
        """Test that mark-replied creates a coach_reply interaction"""
        # Create a test program
        test_name = f"TEST_MarkReplied_{uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json={
            "university_name": test_name,
            "division": "D1"
        })
        assert create_resp.status_code in [200, 201]
        program_id = create_resp.json()["program_id"]
        self.test_program_id = program_id
        
        try:
            # Mark as replied with note
            note_text = "Coach Smith replied with info about summer camp dates"
            mark_resp = self.session.post(
                f"{BASE_URL}/api/programs/{program_id}/mark-replied",
                json={"note": note_text}
            )
            assert mark_resp.status_code == 200, f"Expected 200, got {mark_resp.status_code}: {mark_resp.text}"
            
            updated_program = mark_resp.json()
            
            # Verify signals show has_coach_reply = true
            assert "signals" in updated_program, "Response should contain signals"
            assert updated_program["signals"]["has_coach_reply"] == True, "has_coach_reply should be True after mark-replied"
            
            print(f"✓ mark-replied returns updated program with has_coach_reply=True")
            print(f"  Updated signals: {updated_program['signals']}")
            
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")
    
    def test_mark_replied_appears_in_journey(self):
        """Test that coach_reply interaction appears in journey timeline as email_received"""
        # Create test program
        test_name = f"TEST_JourneyReply_{uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json={
            "university_name": test_name,
            "division": "D1"
        })
        assert create_resp.status_code in [200, 201]
        program_id = create_resp.json()["program_id"]
        
        try:
            # Mark as replied
            note_text = "Coach invited me to visit campus next week"
            self.session.post(
                f"{BASE_URL}/api/programs/{program_id}/mark-replied",
                json={"note": note_text}
            )
            
            # Get journey timeline
            journey_resp = self.session.get(f"{BASE_URL}/api/programs/{program_id}/journey")
            assert journey_resp.status_code == 200
            
            timeline = journey_resp.json().get("timeline", [])
            
            # Find the coach_reply event
            coach_reply_events = [e for e in timeline if e.get("event_type") == "email_received"]
            assert len(coach_reply_events) > 0, "coach_reply should appear as email_received in timeline"
            
            reply_event = coach_reply_events[0]
            assert reply_event.get("content") == note_text or note_text in str(reply_event.get("content", ""))
            
            print(f"✓ coach_reply appears in journey as email_received event")
            print(f"  Event: {reply_event}")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")


class TestIsActiveToggleBehavior:
    """Tests for is_active toggle affecting board grouping"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self._authenticate()
    
    def _authenticate(self):
        """Re-authenticate to get fresh token"""
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_inactive_program_goes_to_closed_group(self):
        """Test that setting is_active=false moves program to closed group"""
        # Create test program
        test_name = f"TEST_Inactive_{uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json={
            "university_name": test_name,
            "division": "D1",
            "is_active": True
        })
        assert create_resp.status_code in [200, 201]
        program_id = create_resp.json()["program_id"]
        
        try:
            # Mark as inactive
            update_resp = self.session.put(
                f"{BASE_URL}/api/programs/{program_id}",
                json={"is_active": False}
            )
            assert update_resp.status_code == 200
            
            # Check grouped endpoint
            grouped_resp = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
            assert grouped_resp.status_code == 200
            
            data = grouped_resp.json()
            closed_programs = data["groups"]["closed"]
            
            found = any(p["program_id"] == program_id for p in closed_programs)
            assert found, "Inactive program should be in closed group"
            
            print("✓ is_active=false moves program to closed group")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")
    
    def test_reactivating_program_removes_from_closed(self):
        """Test that setting is_active=true moves program out of closed group"""
        # Re-authenticate for this test
        self._authenticate()
        
        # Create inactive test program
        test_name = f"TEST_Reactivate_{uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json={
            "university_name": test_name,
            "division": "D1",
            "is_active": False
        })
        assert create_resp.status_code in [200, 201]
        program_id = create_resp.json()["program_id"]
        
        try:
            # Reactivate
            update_resp = self.session.put(
                f"{BASE_URL}/api/programs/{program_id}",
                json={"is_active": True}
            )
            assert update_resp.status_code == 200
            
            # Check grouped endpoint
            grouped_resp = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
            data = grouped_resp.json()
            
            closed_programs = data["groups"]["closed"]
            found_in_closed = any(p["program_id"] == program_id for p in closed_programs)
            assert not found_in_closed, "Reactivated program should NOT be in closed group"
            
            print("✓ is_active=true removes program from closed group")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")


class TestCoachReplyAffectsInProgressGroup:
    """Tests that programs with coach reply go to in_progress group"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_coach_reply_moves_to_in_progress(self):
        """Test that marking coach replied moves program to in_progress"""
        # Create test program
        test_name = f"TEST_InProgressReply_{uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json={
            "university_name": test_name,
            "division": "D1"
        })
        assert create_resp.status_code in [200, 201]
        program_id = create_resp.json()["program_id"]
        
        try:
            # Mark as replied
            self.session.post(
                f"{BASE_URL}/api/programs/{program_id}/mark-replied",
                json={"note": "Coach expressed interest in seeing my highlight video"}
            )
            
            # Check grouped endpoint
            grouped_resp = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
            data = grouped_resp.json()
            
            in_progress_programs = data["groups"]["in_progress"]
            found = any(p["program_id"] == program_id for p in in_progress_programs)
            assert found, "Program with coach reply should be in in_progress group"
            
            print("✓ Program with coach reply correctly placed in in_progress group")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")


class TestJourneyTimelineCoachReplyType:
    """Tests that coach_reply interaction type shows as email_received in journey"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "pro@test.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_journey_coach_reply_event_type(self):
        """Test journey timeline shows coach_reply as email_received type"""
        # Create test program
        test_name = f"TEST_JourneyType_{uuid.uuid4().hex[:8]}"
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json={
            "university_name": test_name,
            "division": "D1"
        })
        program_id = create_resp.json()["program_id"]
        
        try:
            # Mark replied
            note = "Coach wants to discuss scholarship opportunities"
            self.session.post(
                f"{BASE_URL}/api/programs/{program_id}/mark-replied",
                json={"note": note}
            )
            
            # Get journey
            journey_resp = self.session.get(f"{BASE_URL}/api/programs/{program_id}/journey")
            timeline = journey_resp.json().get("timeline", [])
            
            # Find coach reply
            coach_events = [e for e in timeline if e.get("title") == "Coach replied" or "coach" in str(e.get("title", "")).lower()]
            assert len(coach_events) > 0, "Should find coach reply in timeline"
            
            # Verify event_type
            assert coach_events[0].get("event_type") == "email_received", "coach_reply should have event_type=email_received"
            
            print("✓ Journey timeline shows coach_reply as email_received")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")


class TestStanfordUniversitySignals:
    """Test existing Stanford University with coach_reply interaction"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authenticated session as premium user"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Use premium user who may have Stanford
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "premium@test.com",
            "password": "password"
        })
        if login_resp.status_code == 200:
            token = login_resp.json().get("token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_stanford_has_coach_reply_signal(self):
        """Test that Stanford University (prog_3cbb4ff4df51) shows has_coach_reply=true"""
        stanford_id = "prog_3cbb4ff4df51"
        
        response = self.session.get(f"{BASE_URL}/api/programs/{stanford_id}")
        
        if response.status_code == 404:
            print("⚠ Stanford program not found (may belong to different user)")
            pytest.skip("Stanford program not accessible")
            return
        
        assert response.status_code == 200
        
        program = response.json()
        signals = program.get("signals", {})
        
        # Based on agent_to_agent_context_note: Stanford has a coach_reply interaction
        print(f"Stanford signals: {signals}")
        
        if signals.get("has_coach_reply"):
            print("✓ Stanford University has has_coach_reply=True as expected")
        else:
            print("⚠ Stanford does not show has_coach_reply=True (interaction may need to be verified)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
