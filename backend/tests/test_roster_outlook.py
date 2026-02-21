"""
Tests for Roster Spot Reality feature.
Tests roster outlook computation based on division + graduation year distance.
D1: <=1yr=tight, <=2yr=limited, else=open
D2: <=1yr=limited, <=2yr=limited, else=open
D3/NAIA/JUCO: always open
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def session():
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    # Login with test user
    login_res = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "douglas@yeslms.com",
        "password": "password"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    return s


class TestMatchScoresRoster:
    """Tests for roster object in GET /api/match-scores"""
    
    def test_match_scores_returns_roster_object(self, session):
        """GET /api/match-scores returns roster object for each score"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "scores" in data, "Response should have 'scores'"
        assert len(data["scores"]) > 0, "Should have at least one score"
        
        # Check first score has roster
        score = data["scores"][0]
        assert "roster" in score, "Score should have 'roster' field"
        
    def test_roster_has_required_fields(self, session):
        """Roster object has status, label, openings, explanation, guidance, tooltip"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        for score in data["scores"]:
            roster = score.get("roster")
            assert roster is not None, f"Score {score.get('program_id')} missing roster"
            
            # Check required fields
            assert "status" in roster, "Roster should have 'status'"
            assert "label" in roster, "Roster should have 'label'"
            assert "explanation" in roster, "Roster should have 'explanation'"
            assert "guidance" in roster, "Roster should have 'guidance'"
            assert "tooltip" in roster, "Roster should have 'tooltip'"
            
    def test_roster_status_values(self, session):
        """Roster status should be one of: open, limited, tight, unknown"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        valid_statuses = {"open", "limited", "tight", "unknown"}
        for score in data["scores"]:
            roster = score.get("roster", {})
            status = roster.get("status")
            assert status in valid_statuses, f"Invalid status '{status}' for {score.get('program_id')}"
            
    def test_roster_label_values(self, session):
        """Roster label should match status: Open, Limited, Tight, Pending"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        valid_labels = {"Open", "Limited", "Tight", "Pending"}
        for score in data["scores"]:
            roster = score.get("roster", {})
            label = roster.get("label")
            assert label in valid_labels, f"Invalid label '{label}' for {score.get('program_id')}"


class TestSuggestedSchoolsRoster:
    """Tests for roster in GET /api/suggested-schools"""
    
    def test_suggested_schools_returns_roster(self, session):
        """GET /api/suggested-schools returns roster for each suggestion"""
        res = session.get(f"{BASE_URL}/api/suggested-schools")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        if data.get("suggestions") and len(data["suggestions"]) > 0:
            for suggestion in data["suggestions"]:
                assert "roster" in suggestion, f"Suggestion {suggestion.get('university_name')} missing roster"
                roster = suggestion["roster"]
                assert "status" in roster, "Roster should have status"
                assert "label" in roster, "Roster should have label"
                
    def test_suggested_schools_roster_has_openings(self, session):
        """Roster should have estimated openings range"""
        res = session.get(f"{BASE_URL}/api/suggested-schools")
        assert res.status_code == 200
        data = res.json()
        
        if data.get("suggestions") and len(data["suggestions"]) > 0:
            for suggestion in data["suggestions"]:
                roster = suggestion.get("roster", {})
                if roster.get("status") != "unknown":
                    openings = roster.get("openings")
                    assert openings is not None, f"Roster for {suggestion.get('university_name')} should have openings"
                    # Should be in format like "1-3 spots" or "2-4 spots"
                    assert "spots" in openings.lower() or "–" in openings or "-" in openings, \
                        f"Openings '{openings}' should contain range format"


class TestRiskBadgesRoster:
    """Tests for roster in GET /api/risk-badges/{program_id}"""
    
    def test_risk_badges_returns_roster(self, session):
        """GET /api/risk-badges/{program_id} returns roster alongside badges"""
        # Use D1 program
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert "roster" in data, "Response should have 'roster' field"
        assert "badges" in data, "Response should still have 'badges' field"
        assert "timeline" in data, "Response should still have 'timeline' field"
        
    def test_risk_badges_roster_has_fields(self, session):
        """Roster from risk-badges endpoint has all required fields"""
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        roster = data.get("roster")
        assert roster is not None, "Roster should not be None"
        assert "status" in roster
        assert "label" in roster
        assert "explanation" in roster
        assert "guidance" in roster
        assert "tooltip" in roster


class TestRosterDivisionLogic:
    """Tests for roster computation logic based on division + graduation year"""
    
    def test_d1_school_2027_grad_gets_tight(self, session):
        """D1 school with grad year 2027 (1 year out from 2026) gets 'tight' status"""
        # D1 Florida Gulf Coast - prog_3fe70bce8e71
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        roster = data.get("roster", {})
        status = roster.get("status")
        # D1 with <=1 year out should be 'tight'
        assert status == "tight", f"D1 with 2027 grad should be 'tight', got '{status}'"
        
    def test_d1_school_tight_openings_range(self, session):
        """D1 tight status should have '1-3 spots' openings"""
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        roster = data.get("roster", {})
        openings = roster.get("openings", "")
        # Should be "1–3 spots" (with en-dash or hyphen)
        assert "1" in openings and "3" in openings, f"Tight D1 should have 1-3 spots, got '{openings}'"
        
    def test_d2_school_2027_grad_gets_limited(self, session):
        """D2 school with grad year 2027 (1 year out from 2026) gets 'limited' status"""
        # D2 Tampa University - prog_0a5dfa9c59d1
        program_id = "prog_0a5dfa9c59d1"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        roster = data.get("roster", {})
        status = roster.get("status")
        # D2 with <=1 year out should be 'limited'
        assert status == "limited", f"D2 with 2027 grad should be 'limited', got '{status}'"
        
    def test_d2_school_limited_openings_range(self, session):
        """D2 limited status should have '2-4 spots' openings"""
        program_id = "prog_0a5dfa9c59d1"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        roster = data.get("roster", {})
        openings = roster.get("openings", "")
        # Should be "2–4 spots" (with en-dash or hyphen)
        assert "2" in openings and "4" in openings, f"Limited D2 should have 2-4 spots, got '{openings}'"


class TestRosterStatusColors:
    """Tests for roster status-to-label mapping"""
    
    def test_roster_label_mapping(self, session):
        """Verify status-to-label mapping: open->Open, limited->Limited, tight->Tight"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        label_map = {
            "open": "Open",
            "limited": "Limited",
            "tight": "Tight",
            "unknown": "Pending"
        }
        
        for score in data["scores"]:
            roster = score.get("roster", {})
            status = roster.get("status")
            label = roster.get("label")
            expected_label = label_map.get(status)
            if expected_label:
                assert label == expected_label, f"Status '{status}' should have label '{expected_label}', got '{label}'"


class TestRosterGuidanceText:
    """Tests for roster guidance/explanation text"""
    
    def test_roster_explanation_mentions_data_source(self, session):
        """Explanation should mention public roster data"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        for score in data["scores"]:
            roster = score.get("roster", {})
            explanation = roster.get("explanation", "")
            if roster.get("status") != "unknown":
                assert "roster" in explanation.lower() or "data" in explanation.lower(), \
                    f"Explanation should mention roster/data: '{explanation}'"
                    
    def test_roster_tooltip_is_privacy_safe(self, session):
        """Tooltip should be privacy-safe, mentioning estimates"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        for score in data["scores"]:
            roster = score.get("roster", {})
            tooltip = roster.get("tooltip", "")
            # Should mention estimates and sources
            assert "estimate" in tooltip.lower() or "public" in tooltip.lower() or "roster" in tooltip.lower(), \
                f"Tooltip should be privacy-safe: '{tooltip}'"
                
    def test_tight_guidance_mentions_timing(self, session):
        """Tight status guidance should mention timing/fit"""
        program_id = "prog_3fe70bce8e71"  # D1 - should be tight
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        roster = data.get("roster", {})
        if roster.get("status") == "tight":
            guidance = roster.get("guidance", "")
            assert "timing" in guidance.lower() or "fit" in guidance.lower() or "limited" in guidance.lower(), \
                f"Tight guidance should mention timing/fit: '{guidance}'"


class TestRosterWithExistingFeatures:
    """Tests that roster works alongside risk badges and timeline"""
    
    def test_match_scores_has_all_three_features(self, session):
        """Match scores should have risk_badges, timeline, AND roster"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        for score in data["scores"]:
            assert "risk_badges" in score, f"Score {score.get('program_id')} missing risk_badges"
            assert "timeline" in score, f"Score {score.get('program_id')} missing timeline"
            assert "roster" in score, f"Score {score.get('program_id')} missing roster"
            
    def test_risk_badges_endpoint_has_all_three(self, session):
        """Risk badges endpoint should return badges, timeline, AND roster"""
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        assert "badges" in data, "Should have badges"
        assert "timeline" in data, "Should have timeline"
        assert "roster" in data, "Should have roster"
