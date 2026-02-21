"""
Test suite for NCAA-aware Match Risk Badges feature.
Tests the risk_badges array in match-scores, risk-badges/{program_id}, and suggested-schools endpoints.

Risk Badge Logic:
- D1 schools → 'Roster Tight' badge
- D2/NAIA/D3 schools → 'Funding Dependent' badge  
- D1/D2 schools with athlete grad year <= 2 years out → 'Timeline Risk' badge
- Schools with 'Reach' or 'High Reach' in match_reasons → 'Academic Reach' badge
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
TEST_USER_EMAIL = "douglas@yeslms.com"
TEST_USER_PASSWORD = "password"

# User has 2 programs:
# - prog_3fe70bce8e71 (D1 Florida Gulf Coast)
# - prog_0a5dfa9c59d1 (D2 Tampa University)
# User profile: GPA 3.2, SAT 1100, ACT 24, graduation_year 2027

@pytest.fixture(scope="module")
def authenticated_session():
    """Create authenticated session with cookies."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    
    if login_response.status_code != 200:
        pytest.skip(f"Failed to authenticate - status {login_response.status_code}")
    
    return session


class TestMatchScoresRiskBadges:
    """Test GET /api/match-scores returns risk_badges array for each school score."""
    
    def test_match_scores_returns_risk_badges_array(self, authenticated_session):
        """Verify that match-scores endpoint returns risk_badges for each score."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "scores" in data, "Response should contain 'scores' key"
        assert "profile_exists" in data, "Response should contain 'profile_exists' key"
        
        if data["profile_exists"] and len(data["scores"]) > 0:
            # Check that every score has risk_badges array
            for score in data["scores"]:
                assert "risk_badges" in score, f"Score for {score.get('university_name')} missing risk_badges"
                assert isinstance(score["risk_badges"], list), "risk_badges should be a list"
                print(f"✓ {score.get('university_name')} has {len(score['risk_badges'])} risk badges")
    
    def test_d1_school_has_roster_tight_badge(self, authenticated_session):
        """D1 schools should get 'Roster Tight' badge."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        d1_schools = [s for s in data["scores"] if s.get("division", "").upper() == "D1"]
        
        if len(d1_schools) == 0:
            pytest.skip("No D1 schools in match scores")
        
        for school in d1_schools:
            badge_keys = [b.get("key") for b in school.get("risk_badges", [])]
            assert "roster_tight" in badge_keys, f"D1 school {school.get('university_name')} should have 'roster_tight' badge, got {badge_keys}"
            print(f"✓ D1 {school.get('university_name')} has 'Roster Tight' badge")
    
    def test_d2_naia_d3_schools_have_funding_dependent_badge(self, authenticated_session):
        """D2/NAIA/D3 schools should get 'Funding Dependent' badge."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        funding_divisions = ["D2", "D3", "NAIA"]
        funding_schools = [s for s in data["scores"] if s.get("division", "").upper() in funding_divisions]
        
        if len(funding_schools) == 0:
            pytest.skip("No D2/D3/NAIA schools in match scores")
        
        for school in funding_schools:
            badge_keys = [b.get("key") for b in school.get("risk_badges", [])]
            assert "funding_dependent" in badge_keys, f"{school.get('division')} school {school.get('university_name')} should have 'funding_dependent' badge, got {badge_keys}"
            print(f"✓ {school.get('division')} {school.get('university_name')} has 'Funding Dependent' badge")
    
    def test_risk_badge_structure(self, authenticated_session):
        """Verify each risk badge has required fields: key, label, severity, summary."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        for score in data["scores"]:
            for badge in score.get("risk_badges", []):
                assert "key" in badge, f"Badge missing 'key' field: {badge}"
                assert "label" in badge, f"Badge missing 'label' field: {badge}"
                assert "severity" in badge, f"Badge missing 'severity' field: {badge}"
                assert "summary" in badge, f"Badge missing 'summary' field: {badge}"
                print(f"✓ Badge '{badge['label']}' has all required fields")


class TestRiskBadgesEndpoint:
    """Test GET /api/risk-badges/{program_id} returns badges for a specific program."""
    
    def test_risk_badges_endpoint_exists(self, authenticated_session):
        """Verify the /api/risk-badges/{program_id} endpoint exists."""
        # Use the D1 Florida Gulf Coast program
        program_id = "prog_3fe70bce8e71"
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "badges" in data, "Response should contain 'badges' key"
        assert "empty_state" in data, "Response should contain 'empty_state' key"
        print(f"✓ Risk badges endpoint returned {len(data.get('badges', []))} badges")
    
    def test_risk_badges_for_d1_program(self, authenticated_session):
        """D1 program should have 'Roster Tight' badge."""
        # D1 Florida Gulf Coast
        program_id = "prog_3fe70bce8e71"
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        badge_keys = [b.get("key") for b in data.get("badges", [])]
        assert "roster_tight" in badge_keys, f"D1 program should have 'roster_tight' badge, got {badge_keys}"
        print(f"✓ D1 Florida Gulf Coast has 'Roster Tight' badge")
    
    def test_risk_badges_for_d2_program(self, authenticated_session):
        """D2 program should have 'Funding Dependent' badge."""
        # D2 Tampa University
        program_id = "prog_0a5dfa9c59d1"
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        badge_keys = [b.get("key") for b in data.get("badges", [])]
        assert "funding_dependent" in badge_keys, f"D2 program should have 'funding_dependent' badge, got {badge_keys}"
        print(f"✓ D2 Tampa University has 'Funding Dependent' badge")
    
    def test_nonexistent_program_returns_empty(self, authenticated_session):
        """Non-existent program should return empty badges."""
        program_id = "nonexistent_program_id_123"
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("badges") == [], "Non-existent program should return empty badges"
        assert data.get("empty_state") == True, "Non-existent program should have empty_state=True"
        print("✓ Non-existent program returns empty badges with empty_state=True")


class TestSuggestedSchoolsRiskBadges:
    """Test GET /api/suggested-schools returns risk_badges for each suggestion."""
    
    def test_suggested_schools_returns_risk_badges(self, authenticated_session):
        """Verify that suggested-schools endpoint returns risk_badges for each suggestion."""
        response = authenticated_session.get(f"{BASE_URL}/api/suggested-schools")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "suggestions" in data, "Response should contain 'suggestions' key"
        
        suggestions = data.get("suggestions", [])
        if len(suggestions) == 0:
            pytest.skip("No suggestions available")
        
        # Check that every suggestion has risk_badges array
        for suggestion in suggestions:
            assert "risk_badges" in suggestion, f"Suggestion for {suggestion.get('university_name')} missing risk_badges"
            assert isinstance(suggestion["risk_badges"], list), "risk_badges should be a list"
        
        print(f"✓ All {len(suggestions)} suggestions have risk_badges arrays")
    
    def test_suggested_d1_schools_have_roster_tight(self, authenticated_session):
        """D1 schools in suggestions should have 'Roster Tight' badge."""
        response = authenticated_session.get(f"{BASE_URL}/api/suggested-schools")
        
        assert response.status_code == 200
        data = response.json()
        
        suggestions = data.get("suggestions", [])
        d1_suggestions = [s for s in suggestions if s.get("division", "").upper() == "D1"]
        
        if len(d1_suggestions) == 0:
            pytest.skip("No D1 schools in suggestions")
        
        for school in d1_suggestions:
            badge_keys = [b.get("key") for b in school.get("risk_badges", [])]
            assert "roster_tight" in badge_keys, f"D1 suggested school {school.get('university_name')} should have 'roster_tight' badge"
            print(f"✓ D1 suggested {school.get('university_name')} has 'Roster Tight' badge")
    
    def test_suggested_d2_d3_naia_have_funding_dependent(self, authenticated_session):
        """D2/D3/NAIA schools in suggestions should have 'Funding Dependent' badge."""
        response = authenticated_session.get(f"{BASE_URL}/api/suggested-schools")
        
        assert response.status_code == 200
        data = response.json()
        
        suggestions = data.get("suggestions", [])
        funding_divisions = ["D2", "D3", "NAIA"]
        funding_suggestions = [s for s in suggestions if s.get("division", "").upper() in funding_divisions]
        
        if len(funding_suggestions) == 0:
            pytest.skip("No D2/D3/NAIA schools in suggestions")
        
        for school in funding_suggestions:
            badge_keys = [b.get("key") for b in school.get("risk_badges", [])]
            assert "funding_dependent" in badge_keys, f"{school.get('division')} suggested school {school.get('university_name')} should have 'funding_dependent' badge"
            print(f"✓ {school.get('division')} suggested {school.get('university_name')} has 'Funding Dependent' badge")
    
    def test_academic_reach_badge_logic(self, authenticated_session):
        """Schools with 'Reach' or 'High Reach' in match_reasons should have 'Academic Reach' badge."""
        response = authenticated_session.get(f"{BASE_URL}/api/suggested-schools")
        
        assert response.status_code == 200
        data = response.json()
        
        suggestions = data.get("suggestions", [])
        reach_schools = [s for s in suggestions if any(r in s.get("match_reasons", []) for r in ["Reach", "High Reach"])]
        
        if len(reach_schools) == 0:
            # This is expected if user's academics match well with all suggested schools
            print("✓ No schools with 'Reach'/'High Reach' in match_reasons (all academic fits)")
            return
        
        for school in reach_schools:
            badge_keys = [b.get("key") for b in school.get("risk_badges", [])]
            assert "academic_reach" in badge_keys, f"School {school.get('university_name')} with Reach/High Reach should have 'academic_reach' badge"
            print(f"✓ {school.get('university_name')} with academic reach has 'Academic Reach' badge")


class TestTimelineRiskBadge:
    """Test timeline risk badge logic for D1/D2 schools with athlete grad year within 2 years."""
    
    def test_timeline_risk_for_d1_d2_with_close_grad_year(self, authenticated_session):
        """D1/D2 schools should have 'Timeline Risk' badge if athlete graduation is <= 2 years out."""
        # Current year is 2026, user graduation_year is 2027
        # 2027 - 2026 = 1 year out, which is <= 2, so Timeline Risk should apply
        
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        d1_d2_schools = [s for s in data["scores"] if s.get("division", "").upper() in ["D1", "D2"]]
        
        if len(d1_d2_schools) == 0:
            pytest.skip("No D1/D2 schools in match scores")
        
        # Check if any D1/D2 school has timeline_risk badge
        timeline_found = False
        for school in d1_d2_schools:
            badge_keys = [b.get("key") for b in school.get("risk_badges", [])]
            if "timeline_risk" in badge_keys:
                timeline_found = True
                print(f"✓ {school.get('division')} {school.get('university_name')} has 'Timeline Risk' badge (expected for grad year 2027)")
        
        # With graduation_year 2027 and current year 2026, timeline risk should be present
        assert timeline_found, "At least one D1/D2 school should have 'timeline_risk' badge for graduation year within 2 years"


class TestEmptyStateBadge:
    """Test empty state when no risks identified."""
    
    def test_empty_state_when_no_badges(self, authenticated_session):
        """Programs with no risk badges should have empty_state=True."""
        # This test uses the risk-badges endpoint to check empty_state handling
        # If a program has badges, empty_state should be False
        
        program_id = "prog_3fe70bce8e71"  # D1 Florida Gulf Coast
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        badges = data.get("badges", [])
        empty_state = data.get("empty_state", True)
        
        if len(badges) > 0:
            assert empty_state == False, "empty_state should be False when badges exist"
            print(f"✓ Program with {len(badges)} badges has empty_state=False")
        else:
            assert empty_state == True, "empty_state should be True when no badges"
            print("✓ Program with no badges has empty_state=True")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
