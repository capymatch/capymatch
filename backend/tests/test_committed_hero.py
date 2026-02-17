"""
Test CommittedHero feature - Backend API tests for committed journey stage.

Tests the backend logic for:
1. Setting journey_stage to 'committed' via PUT /api/programs/{id}
2. Journey rail cascade fill - all prior stages marked complete
3. GET /api/programs/{id} returns correct journey_rail when committed
4. Toggling (clearing) committed state returns correct rail
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
TEST_PROGRAM_ID = "prog_pro_test1"

class TestCommittedHero:
    """Tests for CommittedHero backend journey_stage functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for authenticated requests"""
        self.session = requests.Session()
        # Login as pro user
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "pro@test.com", "password": "password"}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        # Cookie is set automatically
        yield
        
    def test_set_journey_stage_committed(self):
        """Test setting journey_stage to 'committed' via PUT"""
        # Set journey_stage to committed
        resp = self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": "committed"}
        )
        assert resp.status_code == 200, f"PUT failed: {resp.text}"
        data = resp.json()
        assert data.get("journey_stage") == "committed", "journey_stage not set to committed"
        
    def test_journey_rail_cascade_fill_all_stages(self):
        """Test that journey_rail fills all prior stages when committed"""
        # First ensure committed
        self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": "committed"}
        )
        
        # GET program to check journey_rail
        resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        assert resp.status_code == 200, f"GET failed: {resp.text}"
        data = resp.json()
        
        rail = data.get("journey_rail", {})
        stages = rail.get("stages", {})
        
        # All stages should be True when committed
        assert stages.get("added") == True, "added stage not filled"
        assert stages.get("outreach_sent") == True, "outreach_sent stage not filled"
        assert stages.get("coach_replied") == True, "coach_replied stage not filled"
        assert stages.get("campus_visit") == True, "campus_visit stage not filled"
        assert stages.get("offer") == True, "offer stage not filled"
        assert stages.get("committed") == True, "committed stage not filled"
        
    def test_journey_rail_active_is_committed(self):
        """Test that active stage is 'committed' when journey_stage is committed"""
        # Ensure committed
        self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": "committed"}
        )
        
        # GET program
        resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        assert resp.status_code == 200
        data = resp.json()
        
        rail = data.get("journey_rail", {})
        assert rail.get("active") == "committed", f"active should be 'committed', got: {rail.get('active')}"
        assert rail.get("line_fill") == "committed", f"line_fill should be 'committed', got: {rail.get('line_fill')}"
        
    def test_clear_committed_stage_returns_prior_state(self):
        """Test that clearing journey_stage reverts rail to data-driven state"""
        # First set committed
        self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": "committed"}
        )
        
        # Then clear it (empty string)
        resp = self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": ""}
        )
        assert resp.status_code == 200
        
        # GET program - rail should no longer show committed
        resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        data = resp.json()
        
        rail = data.get("journey_rail", {})
        stages = rail.get("stages", {})
        
        # committed should no longer be True (unless there's actual data)
        assert stages.get("committed") == False, "committed stage should be False after clearing"
        
    def test_get_program_includes_journey_rail(self):
        """Test that GET /api/programs/{id} includes journey_rail in response"""
        resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "journey_rail" in data, "journey_rail not in response"
        rail = data["journey_rail"]
        assert "stages" in rail, "stages not in journey_rail"
        assert "active" in rail, "active not in journey_rail"
        assert "line_fill" in rail, "line_fill not in journey_rail"
        assert "pulse" in rail, "pulse not in journey_rail"
        
    def test_journey_stage_campus_visit_partial_fill(self):
        """Test that campus_visit stage only fills up to campus_visit"""
        # Set to campus_visit
        resp = self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": "campus_visit"}
        )
        assert resp.status_code == 200
        
        # GET program
        resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        data = resp.json()
        
        rail = data.get("journey_rail", {})
        stages = rail.get("stages", {})
        
        # Stages up to campus_visit should be True
        assert stages.get("added") == True
        assert stages.get("outreach_sent") == True
        assert stages.get("coach_replied") == True
        assert stages.get("campus_visit") == True
        # Stages after should be False
        assert stages.get("offer") == False, "offer should not be filled for campus_visit"
        assert stages.get("committed") == False, "committed should not be filled for campus_visit"
        

class TestCommittedHeroEdgeCases:
    """Edge case tests for committed journey stage"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for authenticated requests"""
        self.session = requests.Session()
        login_resp = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "pro@test.com", "password": "password"}
        )
        assert login_resp.status_code == 200
        yield
        # Cleanup - reset to campus_visit
        self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": "campus_visit"}
        )
        
    def test_toggle_committed_on_off(self):
        """Test toggling committed stage on and off"""
        # Set committed
        self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": "committed"}
        )
        
        resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        data = resp.json()
        assert data["journey_rail"]["stages"]["committed"] == True
        
        # Clear committed
        self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": ""}
        )
        
        resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        data = resp.json()
        assert data["journey_rail"]["stages"]["committed"] == False
        
    def test_set_offer_stage_partial_cascade(self):
        """Test that offer stage fills up to offer but not committed"""
        # Set to offer
        self.session.put(
            f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}",
            json={"journey_stage": "offer"}
        )
        
        resp = self.session.get(f"{BASE_URL}/api/programs/{TEST_PROGRAM_ID}")
        data = resp.json()
        stages = data["journey_rail"]["stages"]
        
        assert stages["offer"] == True, "offer should be filled"
        assert stages["committed"] == False, "committed should not be filled for offer stage"
