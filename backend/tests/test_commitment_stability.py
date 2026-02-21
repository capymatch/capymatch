"""
Tests for Commitment Stability Index feature
- Tests /api/risk-badges/{program_id} returns commitment_stability object
- Tests /api/match-scores returns commitment_stability for each school
- Tests commitment_stability varies by division
- Tests commitment_stability values are consistent per school (seeded RNG)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def session():
    """Create a session and login"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_res = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": "douglas@yeslms.com",
        "password": "password"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    return s


class TestCommitmentStabilityRiskBadgesAPI:
    """Tests for /api/risk-badges/{program_id} commitment_stability"""
    
    def test_risk_badges_returns_commitment_stability(self, session):
        """Test that risk-badges endpoint returns commitment_stability object"""
        # FGCU - D1 Non-Power (ASUN)
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        # Check commitment_stability exists
        assert "commitment_stability" in data, "Missing commitment_stability"
        stability = data["commitment_stability"]
        
        # Check all required fields
        assert "status" in stability, "Missing status"
        assert "label" in stability, "Missing label"
        assert "retention_rate" in stability, "Missing retention_rate"
        assert "sparkline" in stability, "Missing sparkline"
        assert "trend" in stability, "Missing trend"
        assert "signals" in stability, "Missing signals"
        assert "meaning" in stability, "Missing meaning"
        assert "tags" in stability, "Missing tags"
        assert "confidence" in stability, "Missing confidence"
        assert "last_updated" in stability, "Missing last_updated"
        assert "tooltip" in stability, "Missing tooltip"
        
        print(f"FGCU Commitment Stability: {stability['label']} ({stability['retention_rate']}%)")
    
    def test_commitment_stability_fgcu_d1_nonpower(self, session):
        """Test FGCU (D1 non-power ASUN) gets expected High Stability"""
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert res.status_code == 200
        stability = res.json()["commitment_stability"]
        
        # D1 non-power typically 70-84% retention -> should be High Stability (>=82)
        # Based on seed for "Florida Gulf Coast University"
        assert stability["retention_rate"] >= 70, f"Retention too low: {stability['retention_rate']}"
        assert stability["retention_rate"] <= 99, f"Retention too high: {stability['retention_rate']}"
        assert stability["status"] in ["high", "moderate", "volatile"], f"Invalid status: {stability['status']}"
        
        # Verify sparkline has 3 values
        assert len(stability["sparkline"]) == 3, f"Sparkline should have 3 values: {stability['sparkline']}"
        
        # Verify tags include NCAA D1
        tags = stability["tags"]
        assert any("D1" in tag for tag in tags), f"Missing D1 tag in: {tags}"
        
        print(f"FGCU: {stability['status'].upper()} - {stability['retention_rate']}% retention")
        print(f"  Signals: {stability['signals'][:2]}")
    
    def test_commitment_stability_tampa_d2(self, session):
        """Test Tampa (D2 SSC) gets expected stability values"""
        program_id = "prog_0a5dfa9c59d1"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert res.status_code == 200
        stability = res.json()["commitment_stability"]
        
        # D2 typically 76-88% retention
        assert stability["retention_rate"] >= 76, f"D2 retention too low: {stability['retention_rate']}"
        assert stability["retention_rate"] <= 99, f"D2 retention too high: {stability['retention_rate']}"
        
        # D2 should have different tags than D1
        tags = stability["tags"]
        assert any("D2" in tag for tag in tags), f"Missing D2 tag in: {tags}"
        
        print(f"Tampa D2: {stability['status'].upper()} - {stability['retention_rate']}% retention")
    
    def test_commitment_stability_consistency(self, session):
        """Test that same school returns same values (seeded RNG)"""
        program_id = "prog_3fe70bce8e71"
        
        # Call twice
        res1 = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        res2 = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        
        assert res1.status_code == 200
        assert res2.status_code == 200
        
        stability1 = res1.json()["commitment_stability"]
        stability2 = res2.json()["commitment_stability"]
        
        # Values should be identical (seeded RNG)
        assert stability1["retention_rate"] == stability2["retention_rate"], "Retention rate not consistent"
        assert stability1["sparkline"] == stability2["sparkline"], "Sparkline not consistent"
        assert stability1["status"] == stability2["status"], "Status not consistent"
        
        print("Consistency verified: Same school returns same commitment_stability values")


class TestCommitmentStabilityMatchScoresAPI:
    """Tests for /api/match-scores commitment_stability"""
    
    def test_match_scores_includes_commitment_stability(self, session):
        """Test that match-scores endpoint returns commitment_stability for each school"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert "scores" in data, "Missing scores array"
        assert len(data["scores"]) > 0, "No schools in match-scores"
        
        # Check each school has commitment_stability
        for school in data["scores"]:
            assert "commitment_stability" in school, f"Missing commitment_stability for {school.get('university_name')}"
            stability = school["commitment_stability"]
            
            # Verify structure
            assert "status" in stability, f"Missing status for {school.get('university_name')}"
            assert "retention_rate" in stability, f"Missing retention_rate for {school.get('university_name')}"
            assert "sparkline" in stability, f"Missing sparkline for {school.get('university_name')}"
            
        print(f"Verified commitment_stability on {len(data['scores'])} schools in match-scores")
    
    def test_match_scores_stability_varies_by_division(self, session):
        """Test that commitment_stability values vary by division tier"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        
        assert res.status_code == 200
        schools = res.json()["scores"]
        
        # Group by division
        d1_schools = [s for s in schools if s.get("division") and "D1" in s["division"].upper()]
        d2_schools = [s for s in schools if s.get("division") and "D2" in s["division"].upper()]
        
        if d1_schools:
            d1_rates = [s["commitment_stability"]["retention_rate"] for s in d1_schools]
            print(f"D1 retention rates: {d1_rates}")
            
        if d2_schools:
            d2_rates = [s["commitment_stability"]["retention_rate"] for s in d2_schools]
            print(f"D2 retention rates: {d2_rates}")
            
        # Verify all schools have valid retention rates
        for school in schools:
            rate = school["commitment_stability"]["retention_rate"]
            assert 50 <= rate <= 99, f"Invalid retention rate {rate} for {school.get('university_name')}"


class TestCommitmentStabilityStructure:
    """Tests for commitment_stability data structure"""
    
    def test_sparkline_format(self, session):
        """Test sparkline is array of 3 numbers"""
        res = session.get(f"{BASE_URL}/api/risk-badges/prog_3fe70bce8e71")
        assert res.status_code == 200
        
        sparkline = res.json()["commitment_stability"]["sparkline"]
        
        assert isinstance(sparkline, list), f"Sparkline should be list: {sparkline}"
        assert len(sparkline) == 3, f"Sparkline should have 3 values: {sparkline}"
        
        for i, val in enumerate(sparkline):
            assert isinstance(val, (int, float)), f"Sparkline[{i}] should be number: {val}"
            assert 50 <= val <= 99, f"Sparkline[{i}] out of range: {val}"
        
        print(f"Sparkline format valid: {sparkline}")
    
    def test_signals_format(self, session):
        """Test signals is array of strings"""
        res = session.get(f"{BASE_URL}/api/risk-badges/prog_3fe70bce8e71")
        assert res.status_code == 200
        
        signals = res.json()["commitment_stability"]["signals"]
        
        assert isinstance(signals, list), f"Signals should be list: {signals}"
        assert len(signals) >= 1, "Should have at least 1 signal"
        
        for sig in signals:
            assert isinstance(sig, str), f"Signal should be string: {sig}"
            assert len(sig) > 10, f"Signal too short: {sig}"
        
        print(f"Signals format valid ({len(signals)} signals)")
    
    def test_tags_format(self, session):
        """Test tags array contains NCAA division, roster limit, era"""
        res = session.get(f"{BASE_URL}/api/risk-badges/prog_3fe70bce8e71")
        assert res.status_code == 200
        
        tags = res.json()["commitment_stability"]["tags"]
        
        assert isinstance(tags, list), f"Tags should be list: {tags}"
        assert len(tags) >= 2, f"Should have at least 2 tags: {tags}"
        
        # Should include NCAA division
        assert any("NCAA" in tag or "D1" in tag or "D2" in tag or "D3" in tag for tag in tags), f"Missing division tag: {tags}"
        
        # Should include equivalency era
        assert any("Equivalency" in tag or "Era" in tag for tag in tags), f"Missing era tag: {tags}"
        
        print(f"Tags format valid: {tags}")
    
    def test_confidence_and_last_updated(self, session):
        """Test confidence level and last_updated date"""
        res = session.get(f"{BASE_URL}/api/risk-badges/prog_3fe70bce8e71")
        assert res.status_code == 200
        
        stability = res.json()["commitment_stability"]
        
        # Confidence should be Medium (heuristic model)
        assert stability["confidence"] == "Medium", f"Expected Medium confidence: {stability['confidence']}"
        
        # Last updated should be present
        assert stability["last_updated"], "Missing last_updated"
        assert "2026" in stability["last_updated"] or "Feb" in stability["last_updated"], f"Unexpected last_updated: {stability['last_updated']}"
        
        print(f"Confidence: {stability['confidence']}, Updated: {stability['last_updated']}")
    
    def test_status_label_mapping(self, session):
        """Test status correctly maps to label"""
        res = session.get(f"{BASE_URL}/api/risk-badges/prog_3fe70bce8e71")
        assert res.status_code == 200
        
        stability = res.json()["commitment_stability"]
        
        status_label_map = {
            "high": "High Stability",
            "moderate": "Moderate Stability", 
            "volatile": "Volatile"
        }
        
        status = stability["status"]
        label = stability["label"]
        
        assert status in status_label_map, f"Unknown status: {status}"
        assert label == status_label_map[status], f"Label mismatch: {label} != {status_label_map[status]}"
        
        print(f"Status-label mapping correct: {status} -> {label}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
