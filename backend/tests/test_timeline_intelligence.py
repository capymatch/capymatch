"""
Test suite for Recruiting Timeline Intelligence feature.
Tests the timeline object in match-scores, suggested-schools, and risk-badges/{program_id} endpoints.

Timeline Status Logic:
- D1 with grad year <= 2 years out → 'filling_early' (amber)
- D2 with grad year <= 1 year out → 'filling_early' (amber)
- D1 with grad year <= 4 years out → 'standard' (blue)
- D2 with grad year <= 3 years out → 'standard' (blue)
- D3/NAIA/JUCO or early in cycle → 'late' (green)
- No graduation year → 'unknown' (gray)

Timeline object should contain: status, label, explanation, guidance, tooltip
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
# Current year is 2026, so years_out = 2027 - 2026 = 1

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


class TestMatchScoresTimeline:
    """Test GET /api/match-scores returns timeline object for each school score."""
    
    def test_match_scores_returns_timeline_object(self, authenticated_session):
        """Verify that match-scores endpoint returns timeline for each score."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "scores" in data, "Response should contain 'scores' key"
        assert "profile_exists" in data, "Response should contain 'profile_exists' key"
        
        if data["profile_exists"] and len(data["scores"]) > 0:
            # Check that every score has timeline object
            for score in data["scores"]:
                assert "timeline" in score, f"Score for {score.get('university_name')} missing timeline"
                assert isinstance(score["timeline"], dict), "timeline should be a dict"
                print(f"✓ {score.get('university_name')} has timeline: {score['timeline'].get('status')}")
    
    def test_timeline_object_has_required_fields(self, authenticated_session):
        """Verify each timeline object has required fields: status, label, explanation, guidance, tooltip."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        required_fields = ["status", "label", "explanation", "guidance", "tooltip"]
        
        for score in data["scores"]:
            timeline = score.get("timeline", {})
            for field in required_fields:
                assert field in timeline, f"Timeline for {score.get('university_name')} missing '{field}' field"
            print(f"✓ {score.get('university_name')} timeline has all required fields")
    
    def test_d1_school_with_grad_year_2027_gets_filling_early(self, authenticated_session):
        """D1 school with grad year 2027 (1 year out) should get 'filling_early' status."""
        # Current year is 2026, grad year 2027 → 1 year out
        # D1 with <=2 years out = filling_early
        
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        d1_schools = [s for s in data["scores"] if s.get("division", "").upper() == "D1"]
        
        if len(d1_schools) == 0:
            pytest.skip("No D1 schools in match scores")
        
        for school in d1_schools:
            timeline = school.get("timeline", {})
            status = timeline.get("status")
            # With grad year 2027 and current year 2026 (1 year out), D1 should be filling_early
            assert status == "filling_early", f"D1 {school.get('university_name')} should have 'filling_early' status, got '{status}'"
            assert timeline.get("label") == "Filling Early", f"D1 should have 'Filling Early' label, got '{timeline.get('label')}'"
            print(f"✓ D1 {school.get('university_name')} has 'filling_early' status")
    
    def test_d2_school_with_grad_year_2027_gets_filling_early(self, authenticated_session):
        """D2 school with grad year 2027 (1 year out) should get 'filling_early' status."""
        # Current year is 2026, grad year 2027 → 1 year out
        # D2 with <=1 year out = filling_early
        
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        d2_schools = [s for s in data["scores"] if s.get("division", "").upper() == "D2"]
        
        if len(d2_schools) == 0:
            pytest.skip("No D2 schools in match scores")
        
        for school in d2_schools:
            timeline = school.get("timeline", {})
            status = timeline.get("status")
            # With grad year 2027 and current year 2026 (1 year out), D2 should be filling_early
            assert status == "filling_early", f"D2 {school.get('university_name')} should have 'filling_early' status, got '{status}'"
            assert timeline.get("label") == "Filling Early", f"D2 should have 'Filling Early' label, got '{timeline.get('label')}'"
            print(f"✓ D2 {school.get('university_name')} has 'filling_early' status")


class TestRiskBadgesEndpointTimeline:
    """Test GET /api/risk-badges/{program_id} returns timeline alongside badges."""
    
    def test_risk_badges_endpoint_returns_timeline(self, authenticated_session):
        """Verify the /api/risk-badges/{program_id} endpoint returns timeline."""
        # Use the D1 Florida Gulf Coast program
        program_id = "prog_3fe70bce8e71"
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "badges" in data, "Response should contain 'badges' key"
        assert "timeline" in data, "Response should contain 'timeline' key"
        assert isinstance(data["timeline"], dict), "timeline should be a dict"
        print(f"✓ Risk badges endpoint returned timeline with status: {data.get('timeline', {}).get('status')}")
    
    def test_risk_badges_timeline_for_d1_program(self, authenticated_session):
        """D1 program should have 'filling_early' timeline status."""
        # D1 Florida Gulf Coast
        program_id = "prog_3fe70bce8e71"
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        timeline = data.get("timeline", {})
        status = timeline.get("status")
        
        # With graduation_year 2027 and current year 2026, D1 should be filling_early
        assert status == "filling_early", f"D1 program should have 'filling_early' status, got '{status}'"
        print(f"✓ D1 Florida Gulf Coast has timeline status: {status}")
    
    def test_risk_badges_timeline_for_d2_program(self, authenticated_session):
        """D2 program should have 'filling_early' timeline status."""
        # D2 Tampa University
        program_id = "prog_0a5dfa9c59d1"
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        timeline = data.get("timeline", {})
        status = timeline.get("status")
        
        # With graduation_year 2027 and current year 2026, D2 with 1 year out should be filling_early
        assert status == "filling_early", f"D2 program should have 'filling_early' status, got '{status}'"
        print(f"✓ D2 Tampa University has timeline status: {status}")


class TestSuggestedSchoolsTimeline:
    """Test GET /api/suggested-schools returns timeline for each suggestion."""
    
    def test_suggested_schools_returns_timeline(self, authenticated_session):
        """Verify that suggested-schools endpoint returns timeline for each suggestion."""
        response = authenticated_session.get(f"{BASE_URL}/api/suggested-schools")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "suggestions" in data, "Response should contain 'suggestions' key"
        
        suggestions = data.get("suggestions", [])
        if len(suggestions) == 0:
            pytest.skip("No suggestions available")
        
        # Check that every suggestion has timeline object
        for suggestion in suggestions:
            assert "timeline" in suggestion, f"Suggestion for {suggestion.get('university_name')} missing timeline"
            assert isinstance(suggestion["timeline"], dict), "timeline should be a dict"
        
        print(f"✓ All {len(suggestions)} suggestions have timeline objects")
    
    def test_suggested_schools_timeline_structure(self, authenticated_session):
        """Verify suggested schools timeline has all required fields."""
        response = authenticated_session.get(f"{BASE_URL}/api/suggested-schools")
        
        assert response.status_code == 200
        data = response.json()
        
        suggestions = data.get("suggestions", [])
        if len(suggestions) == 0:
            pytest.skip("No suggestions available")
        
        required_fields = ["status", "label", "explanation", "guidance", "tooltip"]
        
        for suggestion in suggestions:
            timeline = suggestion.get("timeline", {})
            for field in required_fields:
                assert field in timeline, f"Timeline for {suggestion.get('university_name')} missing '{field}' field"
        
        print(f"✓ All suggestions have timelines with required fields")
    
    def test_suggested_d1_schools_timeline_status(self, authenticated_session):
        """D1 schools in suggestions should have appropriate timeline status."""
        response = authenticated_session.get(f"{BASE_URL}/api/suggested-schools")
        
        assert response.status_code == 200
        data = response.json()
        
        suggestions = data.get("suggestions", [])
        d1_suggestions = [s for s in suggestions if s.get("division", "").upper() == "D1"]
        
        if len(d1_suggestions) == 0:
            pytest.skip("No D1 schools in suggestions")
        
        for school in d1_suggestions:
            timeline = school.get("timeline", {})
            status = timeline.get("status")
            # D1 with 1 year out should be filling_early
            assert status == "filling_early", f"D1 suggested school {school.get('university_name')} should have 'filling_early' status, got '{status}'"
            print(f"✓ D1 suggested {school.get('university_name')} has timeline status: {status}")


class TestTimelineStatusValues:
    """Test valid timeline status values and their labels."""
    
    def test_valid_timeline_statuses(self, authenticated_session):
        """Verify timeline statuses are one of the expected values."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        valid_statuses = ["filling_early", "standard", "late", "unknown"]
        valid_labels = ["Filling Early", "Standard", "Late Opportunities", "Timeline Pending"]
        
        for score in data["scores"]:
            timeline = score.get("timeline", {})
            status = timeline.get("status")
            label = timeline.get("label")
            
            assert status in valid_statuses, f"Invalid status '{status}' for {score.get('university_name')}"
            assert label in valid_labels, f"Invalid label '{label}' for {score.get('university_name')}"
            print(f"✓ {score.get('university_name')}: status='{status}', label='{label}'")


class TestTimelinePrivacySafeLanguage:
    """Test that timeline content uses parent-safe, privacy-safe language."""
    
    def test_timeline_uses_soft_language(self, authenticated_session):
        """Verify timeline content uses soft language (often, typically, may)."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        # Check for soft language in explanation field
        soft_words = ["often", "typically", "may", "can", "usually"]
        
        for score in data["scores"]:
            timeline = score.get("timeline", {})
            explanation = timeline.get("explanation", "").lower()
            
            # At least one soft word should be present
            has_soft_language = any(word in explanation for word in soft_words)
            assert has_soft_language, f"Timeline explanation for {score.get('university_name')} should use soft language: '{explanation}'"
            print(f"✓ {score.get('university_name')} explanation uses appropriate language")
    
    def test_timeline_tooltip_mentions_data_sources(self, authenticated_session):
        """Verify timeline tooltip mentions how data is determined."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        for score in data["scores"]:
            timeline = score.get("timeline", {})
            tooltip = timeline.get("tooltip", "").lower()
            
            # Tooltip should mention how timeline is determined
            assert len(tooltip) > 50, f"Tooltip should be descriptive, got: '{tooltip}'"
            print(f"✓ {score.get('university_name')} has informative tooltip")


class TestRiskBadgesAndTimelineCoexistence:
    """Test that risk badges and timeline work correctly together."""
    
    def test_match_scores_has_both_risk_badges_and_timeline(self, authenticated_session):
        """Verify match-scores returns both risk_badges and timeline."""
        response = authenticated_session.get(f"{BASE_URL}/api/match-scores")
        
        assert response.status_code == 200
        data = response.json()
        
        if not data.get("profile_exists") or len(data.get("scores", [])) == 0:
            pytest.skip("No match scores available")
        
        for score in data["scores"]:
            assert "risk_badges" in score, f"Score for {score.get('university_name')} missing risk_badges"
            assert "timeline" in score, f"Score for {score.get('university_name')} missing timeline"
            print(f"✓ {score.get('university_name')} has both risk_badges ({len(score['risk_badges'])}) and timeline ({score['timeline'].get('status')})")
    
    def test_risk_badges_endpoint_has_both_badges_and_timeline(self, authenticated_session):
        """Verify risk-badges/{program_id} returns both badges and timeline."""
        program_id = "prog_3fe70bce8e71"
        response = authenticated_session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "badges" in data, "Response should contain 'badges' key"
        assert "timeline" in data, "Response should contain 'timeline' key"
        print(f"✓ Risk badges endpoint returns both badges ({len(data['badges'])}) and timeline ({data['timeline'].get('status')})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
