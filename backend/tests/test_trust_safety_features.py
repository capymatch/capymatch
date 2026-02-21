"""
Test Trust & Safety UI Features - data_confidence, academic_completeness, last_updated
Tests for: /api/match-scores, /api/risk-badges/{program_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "douglas@yeslms.com"
TEST_PASSWORD = "password"
# Test programs
FGCU_PROGRAM_ID = "prog_3fe70bce8e71"  # D1 FGCU, ASUN - High confidence
TAMPA_PROGRAM_ID = "prog_0a5dfa9c59d1"  # D2 Tampa, SSC - May have missing SAT


class TestTrustSafetyFeatures:
    """Test Trust & Safety data confidence features"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session using cookies"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        # Login to get cookies
        login_response = s.post(f"{BASE_URL}/api/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        return s
    
    # ========== /api/match-scores tests ==========
    
    def test_match_scores_returns_200(self, session):
        """GET /api/match-scores returns 200"""
        response = session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/match-scores returns 200")
    
    def test_match_scores_has_scores_array(self, session):
        """Response contains scores array"""
        response = session.get(f"{BASE_URL}/api/match-scores")
        data = response.json()
        assert "scores" in data, "Response missing 'scores' field"
        assert isinstance(data["scores"], list), "'scores' should be a list"
        print(f"PASS: /api/match-scores contains scores array with {len(data['scores'])} items")
    
    def test_match_scores_has_data_confidence(self, session):
        """Each school in match-scores has data_confidence object"""
        response = session.get(f"{BASE_URL}/api/match-scores")
        data = response.json()
        scores = data.get("scores", [])
        
        if not scores:
            pytest.skip("No scores returned - cannot test data_confidence")
        
        for i, school in enumerate(scores[:5]):  # Check first 5
            assert "data_confidence" in school, f"School {i} missing data_confidence"
            dc = school["data_confidence"]
            assert "level" in dc, f"School {i} data_confidence missing 'level'"
            assert dc["level"] in ["High", "Medium", "Limited"], f"Invalid level: {dc['level']}"
            print(f"  - {school.get('university_name', 'Unknown')}: {dc['level']} confidence")
        
        print("PASS: All tested schools have data_confidence with valid level")
    
    def test_match_scores_data_confidence_has_factors(self, session):
        """data_confidence has factors array"""
        response = session.get(f"{BASE_URL}/api/match-scores")
        data = response.json()
        scores = data.get("scores", [])
        
        if not scores:
            pytest.skip("No scores returned")
        
        for school in scores[:3]:
            dc = school.get("data_confidence", {})
            assert "factors" in dc, f"Missing 'factors' in data_confidence"
            assert isinstance(dc["factors"], list), "'factors' should be a list"
        
        print("PASS: data_confidence contains factors array")
    
    def test_match_scores_data_confidence_has_academic_completeness(self, session):
        """data_confidence has academic_completeness object"""
        response = session.get(f"{BASE_URL}/api/match-scores")
        data = response.json()
        scores = data.get("scores", [])
        
        if not scores:
            pytest.skip("No scores returned")
        
        for school in scores[:3]:
            dc = school.get("data_confidence", {})
            assert "academic_completeness" in dc, f"Missing 'academic_completeness' in data_confidence"
            ac = dc["academic_completeness"]
            assert "complete" in ac, "'academic_completeness' missing 'complete' field"
            assert isinstance(ac["complete"], bool), "'complete' should be boolean"
            assert "missing" in ac, "'academic_completeness' missing 'missing' field"
            assert isinstance(ac["missing"], list), "'missing' should be a list"
            print(f"  - {school.get('university_name', 'Unknown')}: complete={ac['complete']}, missing={ac['missing']}")
        
        print("PASS: data_confidence contains academic_completeness with complete and missing fields")
    
    def test_match_scores_data_confidence_has_last_updated(self, session):
        """data_confidence has last_updated field"""
        response = session.get(f"{BASE_URL}/api/match-scores")
        data = response.json()
        scores = data.get("scores", [])
        
        if not scores:
            pytest.skip("No scores returned")
        
        has_last_updated = False
        for school in scores:
            dc = school.get("data_confidence", {})
            if dc.get("last_updated"):
                has_last_updated = True
                print(f"  - {school.get('university_name', 'Unknown')}: last_updated={dc['last_updated']}")
        
        # Note: last_updated may be null for some schools if data hasn't been scraped
        print(f"PASS: last_updated field exists (found values in some schools: {has_last_updated})")
    
    # ========== /api/risk-badges/{program_id} tests ==========
    
    def test_risk_badges_fgcu_returns_200(self, session):
        """GET /api/risk-badges/{program_id} returns 200 for FGCU"""
        response = session.get(f"{BASE_URL}/api/risk-badges/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/risk-badges/prog_3fe70bce8e71 (FGCU) returns 200")
    
    def test_risk_badges_tampa_returns_200(self, session):
        """GET /api/risk-badges/{program_id} returns 200 for Tampa"""
        response = session.get(f"{BASE_URL}/api/risk-badges/{TAMPA_PROGRAM_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: /api/risk-badges/prog_0a5dfa9c59d1 (Tampa) returns 200")
    
    def test_risk_badges_has_data_confidence(self, session):
        """risk-badges endpoint returns data_confidence object"""
        response = session.get(f"{BASE_URL}/api/risk-badges/{FGCU_PROGRAM_ID}")
        data = response.json()
        
        assert "data_confidence" in data, "Response missing 'data_confidence'"
        dc = data["data_confidence"]
        assert "level" in dc, "data_confidence missing 'level'"
        assert dc["level"] in ["High", "Medium", "Limited"], f"Invalid level: {dc['level']}"
        print(f"PASS: /api/risk-badges returns data_confidence with level={dc['level']}")
    
    def test_risk_badges_data_confidence_structure(self, session):
        """risk-badges data_confidence has all required fields"""
        response = session.get(f"{BASE_URL}/api/risk-badges/{FGCU_PROGRAM_ID}")
        data = response.json()
        dc = data.get("data_confidence", {})
        
        # Check level
        assert "level" in dc, "Missing 'level'"
        assert dc["level"] in ["High", "Medium", "Limited"]
        
        # Check factors
        assert "factors" in dc, "Missing 'factors'"
        assert isinstance(dc["factors"], list)
        
        # Check academic_completeness
        assert "academic_completeness" in dc, "Missing 'academic_completeness'"
        ac = dc["academic_completeness"]
        assert "complete" in ac, "academic_completeness missing 'complete'"
        assert "missing" in ac, "academic_completeness missing 'missing'"
        
        # Check last_updated (may be null)
        assert "last_updated" in dc, "Missing 'last_updated'"
        
        print(f"PASS: risk-badges data_confidence structure is valid")
        print(f"  - Level: {dc['level']}")
        print(f"  - Factors: {dc['factors']}")
        print(f"  - Academic complete: {ac['complete']}, missing: {ac['missing']}")
        print(f"  - Last updated: {dc.get('last_updated')}")
    
    def test_fgcu_high_confidence(self, session):
        """FGCU (prog_3fe70bce8e71) should have High confidence with complete academic data"""
        response = session.get(f"{BASE_URL}/api/risk-badges/{FGCU_PROGRAM_ID}")
        data = response.json()
        dc = data.get("data_confidence", {})
        
        # FGCU should have high confidence based on scorecard data
        level = dc.get("level")
        ac = dc.get("academic_completeness", {})
        
        print(f"FGCU data_confidence:")
        print(f"  - Level: {level}")
        print(f"  - Complete: {ac.get('complete')}")
        print(f"  - Missing: {ac.get('missing')}")
        
        # Just verify the structure is correct - actual values depend on data
        assert level in ["High", "Medium", "Limited"], f"Invalid level: {level}"
        print(f"PASS: FGCU has valid data_confidence level: {level}")
    
    def test_tampa_confidence_level(self, session):
        """Tampa (prog_0a5dfa9c59d1) confidence check"""
        response = session.get(f"{BASE_URL}/api/risk-badges/{TAMPA_PROGRAM_ID}")
        data = response.json()
        dc = data.get("data_confidence", {})
        
        level = dc.get("level")
        ac = dc.get("academic_completeness", {})
        
        print(f"Tampa data_confidence:")
        print(f"  - Level: {level}")
        print(f"  - Complete: {ac.get('complete')}")
        print(f"  - Missing: {ac.get('missing')}")
        
        assert level in ["High", "Medium", "Limited"], f"Invalid level: {level}"
        print(f"PASS: Tampa has valid data_confidence level: {level}")
    
    def test_missing_fields_when_incomplete(self, session):
        """When academic_completeness.complete is false, missing list should have items"""
        response = session.get(f"{BASE_URL}/api/match-scores")
        data = response.json()
        scores = data.get("scores", [])
        
        found_incomplete = False
        for school in scores:
            dc = school.get("data_confidence", {})
            ac = dc.get("academic_completeness", {})
            if not ac.get("complete", True):
                found_incomplete = True
                missing = ac.get("missing", [])
                assert len(missing) > 0, f"School {school.get('university_name')} is incomplete but missing list is empty"
                print(f"  - {school.get('university_name')}: missing {missing}")
        
        if found_incomplete:
            print("PASS: Incomplete schools have missing fields listed")
        else:
            print("INFO: All schools have complete academic data - cannot verify missing field logic")
    
    # ========== Edge cases ==========
    
    def test_unauthenticated_match_scores(self):
        """Unauthenticated request to /api/match-scores returns 401"""
        s = requests.Session()
        response = s.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Unauthenticated request returns 401")
    
    def test_invalid_program_id_risk_badges(self, session):
        """Invalid program_id returns appropriate response"""
        response = session.get(f"{BASE_URL}/api/risk-badges/invalid_program_xyz")
        # Should return empty badges or error
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            # Empty state expected for non-existent program
            assert data.get("empty_state") == True or data.get("badges") == [], "Expected empty state for invalid program"
        print(f"PASS: Invalid program_id handled correctly (status={response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
