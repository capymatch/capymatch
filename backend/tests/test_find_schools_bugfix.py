"""
Test Find Schools page bug fixes:
1. BUG FIX: GET /api/suggested-schools - division field handled as list (not string .upper())
2. BUG FIX: ProgressRail stage keys match frontend (outreach, in_conversation, NOT outreach_sent, coach_replied)
3. REGRESSION: GET /api/knowledge-base returns 1053 schools
4. REGRESSION: GET /api/recruiting-profile returns profile with questionnaire_completed=true
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "douglas@yeslms.com"
TEST_PASSWORD = "password"


class TestFindSchoolsBugFix:
    """Test the bug fixes for Find Schools page"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth session (uses cookies, not token)"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        # Session cookies are automatically stored in self.session
        yield
    
    def test_suggested_schools_returns_suggestions_with_scores(self):
        """
        BUG FIX 1: GET /api/suggested-schools should return suggestions with non-zero match_score.
        The bug was: division stored as list, but code called .upper() on it causing crash.
        Fix: Now handles both list and string for division field.
        """
        resp = self.session.get(f"{BASE_URL}/api/suggested-schools")
        assert resp.status_code == 200, f"Failed: {resp.status_code} - {resp.text}"
        
        data = resp.json()
        assert "suggestions" in data, f"Missing 'suggestions' key: {data.keys()}"
        assert "profile_exists" in data, f"Missing 'profile_exists' key: {data.keys()}"
        
        # Profile should exist for douglas@yeslms.com (completed questionnaire)
        assert data["profile_exists"] == True, "profile_exists should be True for user with completed questionnaire"
        
        suggestions = data["suggestions"]
        # Should have suggestions since profile is completed
        assert len(suggestions) > 0, f"Expected suggestions but got {len(suggestions)}"
        
        # Each suggestion should have required fields
        for suggestion in suggestions[:5]:  # Check first 5
            assert "university_name" in suggestion, f"Missing university_name: {suggestion}"
            assert "match_score" in suggestion, f"Missing match_score: {suggestion}"
            assert suggestion["match_score"] > 0, f"Expected non-zero match_score: {suggestion}"
            assert "division" in suggestion, f"Missing division: {suggestion}"
            
        print(f"✓ Returned {len(suggestions)} suggestions with non-zero match scores")
        print(f"  Top match: {suggestions[0]['university_name']} - {suggestions[0]['match_score']}%")
    
    def test_recruiting_profile_questionnaire_completed(self):
        """
        REGRESSION: GET /api/recruiting-profile returns profile with questionnaire_completed=true.
        The user douglas@yeslms.com has completed the questionnaire with division=['D1', 'D2'].
        """
        resp = self.session.get(f"{BASE_URL}/api/recruiting-profile")
        assert resp.status_code == 200, f"Failed: {resp.status_code} - {resp.text}"
        
        data = resp.json()
        assert data.get("exists") == True, f"Profile should exist: {data}"
        assert data.get("questionnaire_completed") == True, f"questionnaire_completed should be True: {data}"
        
        # Division should be a list (this was the root cause of the bug)
        division = data.get("division")
        assert division is not None, f"Division should exist: {data}"
        
        # Division can be list or string - verify we have value(s)
        if isinstance(division, list):
            assert len(division) > 0, f"Division list should not be empty: {division}"
            print(f"✓ Division stored as list: {division}")
        else:
            assert division, f"Division should have value: {division}"
            print(f"✓ Division stored as string: {division}")
        
        # Check regions
        regions = data.get("regions")
        assert regions is not None, f"Regions should exist: {data}"
        print(f"✓ Regions: {regions}")
    
    def test_knowledge_base_returns_schools(self):
        """
        REGRESSION: GET /api/knowledge-base should return 1053 schools.
        """
        resp = self.session.get(f"{BASE_URL}/api/knowledge-base")
        assert resp.status_code == 200, f"Failed: {resp.status_code} - {resp.text}"
        
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
        # Should have approximately 1053 schools (allow some variance)
        school_count = len(data)
        assert school_count >= 1000, f"Expected ~1053 schools, got {school_count}"
        assert school_count <= 1200, f"Expected ~1053 schools, got {school_count}"
        
        print(f"✓ Knowledge base returned {school_count} schools")
        
        # Verify school structure
        if data:
            school = data[0]
            assert "university_name" in school, f"Missing university_name: {school.keys()}"
            assert "division" in school, f"Missing division: {school.keys()}"
    
    def test_programs_journey_rail_has_correct_stage_keys(self):
        """
        BUG FIX 2: GET /api/programs/{program_id} journey_rail.stages should have keys:
        added, outreach, in_conversation, campus_visit, offer, committed
        
        NOT: outreach_sent, coach_replied (old keys)
        """
        # First, add a school to the board to test journey_rail
        add_resp = self.session.post(f"{BASE_URL}/api/knowledge-base/add-to-board", json={
            "university_name": "University of Georgia"
        })
        
        if add_resp.status_code == 400 and "already on" in add_resp.text.lower():
            # School already on board, get it from programs list
            programs_resp = self.session.get(f"{BASE_URL}/api/programs")
            assert programs_resp.status_code == 200
            programs = programs_resp.json()
            if isinstance(programs, list) and len(programs) > 0:
                program_id = programs[0].get("program_id")
            else:
                pytest.skip("No programs found for user - cannot test journey_rail")
        else:
            assert add_resp.status_code == 200, f"Failed to add school: {add_resp.text}"
            program_id = add_resp.json().get("program_id")
        
        assert program_id, "Program ID not found"
        
        # Get details for the program
        detail_resp = self.session.get(f"{BASE_URL}/api/programs/{program_id}")
        assert detail_resp.status_code == 200, f"Failed to get program details: {detail_resp.text}"
        
        program = detail_resp.json()
        
        # Check journey_rail exists
        journey_rail = program.get("journey_rail")
        assert journey_rail, f"Missing journey_rail: {program.keys()}"
        
        # Check stages
        stages = journey_rail.get("stages")
        assert stages, f"Missing stages in journey_rail: {journey_rail.keys()}"
        
        # EXPECTED KEYS (frontend uses these)
        expected_keys = ["added", "outreach", "in_conversation", "campus_visit", "offer", "committed"]
        
        # OLD KEYS (should NOT exist)
        old_keys = ["outreach_sent", "coach_replied"]
        
        for key in expected_keys:
            assert key in stages, f"Missing expected key '{key}' in stages: {stages.keys()}"
        
        for key in old_keys:
            assert key not in stages, f"Found old key '{key}' that should be removed: {stages.keys()}"
        
        # Check active stage is one of the expected keys
        active = journey_rail.get("active")
        assert active in expected_keys, f"Active stage '{active}' not in expected keys: {expected_keys}"
        
        print(f"✓ journey_rail.stages has correct keys: {list(stages.keys())}")
        print(f"  Active stage: {active}")
        print(f"  Stages: {stages}")
        
        # Clean up: delete the test program
        self.session.delete(f"{BASE_URL}/api/programs/{program_id}")
    
    def test_programs_list_has_signals(self):
        """
        Verify programs list includes interaction signals for board grouping.
        """
        # First, add a school to ensure user has programs
        add_resp = self.session.post(f"{BASE_URL}/api/knowledge-base/add-to-board", json={
            "university_name": "University of Florida"
        })
        
        # Get programs list
        resp = self.session.get(f"{BASE_URL}/api/programs")
        assert resp.status_code == 200, f"Failed: {resp.status_code} - {resp.text}"
        
        programs = resp.json()
        if isinstance(programs, dict):
            programs = programs.get("programs", programs.get("groups", {}).get("needs_outreach", []))
        
        if not programs or len(programs) == 0:
            pytest.skip("No programs found for user")
        
        # Check first program has required fields
        program = programs[0] if isinstance(programs, list) else list(programs.values())[0][0] if programs else None
        if not program:
            pytest.skip("No program data available")
        
        assert "signals" in program, f"Missing signals: {program.keys()}"
        assert "board_group" in program, f"Missing board_group: {program.keys()}"
        
        print(f"✓ Programs have signals and board_group fields")
        
        # Clean up: delete the test program
        if add_resp.status_code == 200:
            program_id = add_resp.json().get("program_id")
            if program_id:
                self.session.delete(f"{BASE_URL}/api/programs/{program_id}")


class TestProgressRailStageKeyMigration:
    """Test that stage keys were properly migrated in the database"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        yield
    
    def test_update_journey_stage_uses_new_keys(self):
        """
        Test that updating journey_stage uses new keys (outreach, in_conversation)
        not old keys (outreach_sent, coach_replied)
        """
        # First add a school to test with
        add_resp = self.session.post(f"{BASE_URL}/api/knowledge-base/add-to-board", json={
            "university_name": "Clemson University"
        })
        
        if add_resp.status_code == 400:
            # If already exists, get program from list
            programs_resp = self.session.get(f"{BASE_URL}/api/programs")
            programs = programs_resp.json()
            if isinstance(programs, list) and len(programs) > 0:
                program_id = programs[0].get("program_id")
            else:
                pytest.skip("No programs found")
        else:
            assert add_resp.status_code == 200, f"Failed to add school: {add_resp.text}"
            program_id = add_resp.json().get("program_id")
        
        # Update to 'outreach' stage (new key)
        update_resp = self.session.put(f"{BASE_URL}/api/programs/{program_id}", 
            json={"journey_stage": "outreach"}
        )
        assert update_resp.status_code == 200, f"Failed to update: {update_resp.text}"
        
        # Verify the program detail shows correct stages
        detail_resp = self.session.get(f"{BASE_URL}/api/programs/{program_id}")
        assert detail_resp.status_code == 200
        
        program = detail_resp.json()
        journey_rail = program.get("journey_rail", {})
        stages = journey_rail.get("stages", {})
        
        # 'outreach' should be True (either by cascade or direct set)
        assert stages.get("outreach") == True, f"'outreach' stage should be True: {stages}"
        assert stages.get("added") == True, f"'added' stage should be True (cascade): {stages}"
        
        print(f"✓ journey_stage 'outreach' correctly fills stages: {stages}")
        
        # Clean up
        self.session.delete(f"{BASE_URL}/api/programs/{program_id}")


class TestHealthCheck:
    """Basic health check to ensure backend is running"""
    
    def test_backend_root_endpoint(self):
        """Verify backend API is responsive"""
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        # Should return 401 without auth, not 404
        assert resp.status_code in [401, 200], f"Unexpected status code: {resp.status_code}"
        print("✓ Backend API is responsive")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
