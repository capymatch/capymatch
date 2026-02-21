"""
NIL Readiness Card Redesign Tests
Tests the new NIL fields: status_label, involves, meaning, context_tags
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNilReadinessAPI:
    """Tests for NIL Readiness data in match-scores API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "douglas@yeslms.com", "password": "password"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        yield
        self.session.close()
    
    def test_match_scores_returns_nil_data(self):
        """Test that match-scores endpoint returns nil data with new fields"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        data = response.json()
        assert "scores" in data
        assert len(data["scores"]) > 0
        
        # Check first school has nil field
        first_score = data["scores"][0]
        assert "nil" in first_score, "Match score missing 'nil' field"
        
        nil = first_score["nil"]
        print(f"School: {first_score['university_name']}")
        print(f"NIL data: {nil}")
    
    def test_nil_has_status_label(self):
        """Test that NIL data includes status_label field"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        for score in response.json()["scores"]:
            nil = score.get("nil", {})
            assert "status_label" in nil, f"NIL for {score['university_name']} missing status_label"
            assert nil["status_label"], f"status_label is empty for {score['university_name']}"
            print(f"{score['university_name']}: status_label = '{nil['status_label']}'")
    
    def test_nil_has_involves_array(self):
        """Test that NIL data includes 'involves' array for What This Involves section"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        for score in response.json()["scores"]:
            nil = score.get("nil", {})
            assert "involves" in nil, f"NIL for {score['university_name']} missing 'involves'"
            assert isinstance(nil["involves"], list), f"involves should be a list"
            assert len(nil["involves"]) > 0, f"involves should not be empty"
            print(f"{score['university_name']}: involves = {nil['involves']}")
    
    def test_nil_has_meaning_text(self):
        """Test that NIL data includes 'meaning' text for What This Means section"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        for score in response.json()["scores"]:
            nil = score.get("nil", {})
            assert "meaning" in nil, f"NIL for {score['university_name']} missing 'meaning'"
            assert nil["meaning"], f"meaning should not be empty"
            assert isinstance(nil["meaning"], str), f"meaning should be a string"
            print(f"{score['university_name']}: meaning = '{nil['meaning'][:50]}...'")
    
    def test_nil_has_context_tags(self):
        """Test that NIL data includes context_tags array"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        for score in response.json()["scores"]:
            nil = score.get("nil", {})
            assert "context_tags" in nil, f"NIL for {score['university_name']} missing 'context_tags'"
            assert isinstance(nil["context_tags"], list), f"context_tags should be a list"
            
            tags = nil["context_tags"]
            print(f"{score['university_name']}: context_tags = {tags}")
            
            # Context tags should include NCAA division
            tag_text = " ".join(tags)
            assert "NCAA" in tag_text, f"context_tags should include NCAA level"
    
    def test_d1_school_status_is_emerging_support(self):
        """Test that D1 non-power school shows 'Emerging support' status"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        d1_schools = [s for s in response.json()["scores"] if s.get("division", "").upper() == "D1"]
        
        for school in d1_schools:
            nil = school.get("nil", {})
            status_label = nil.get("status_label", "")
            print(f"D1 School {school['university_name']}: status_label = '{status_label}'")
            
            # D1 non-power schools should show "Emerging support"
            # D1 power schools would show "Program-backed"
            assert status_label in ["Emerging support", "Program-backed"], \
                f"D1 school should have 'Emerging support' or 'Program-backed', got '{status_label}'"
    
    def test_d2_school_status_is_limited_availability(self):
        """Test that D2 school shows 'Limited availability' status"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        d2_schools = [s for s in response.json()["scores"] if s.get("division", "").upper() == "D2"]
        
        for school in d2_schools:
            nil = school.get("nil", {})
            status_label = nil.get("status_label", "")
            print(f"D2 School {school['university_name']}: status_label = '{status_label}'")
            
            assert status_label == "Limited availability", \
                f"D2 school should have 'Limited availability', got '{status_label}'"
    
    def test_nil_has_all_required_fields(self):
        """Test that NIL data structure has all required fields for card redesign"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        required_fields = [
            "status",       # Status key (friendly, limited, etc)
            "label",        # Main label
            "status_label", # NEW: Display label for status banner
            "explanation",  # Description text
            "involves",     # NEW: Array for What This Involves
            "meaning",      # NEW: Text for What This Means
            "guidance",     # Guidance array
            "tooltip",      # Tooltip text
            "context_tags", # NEW: Context tags array
        ]
        
        for score in response.json()["scores"]:
            nil = score.get("nil", {})
            
            for field in required_fields:
                assert field in nil, \
                    f"NIL for {score['university_name']} missing required field: {field}"
            
            print(f"✓ {score['university_name']} has all required NIL fields")
    
    def test_context_tags_include_roster_limit(self):
        """Test that context_tags include roster limit"""
        response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert response.status_code == 200
        
        for score in response.json()["scores"]:
            nil = score.get("nil", {})
            tags = nil.get("context_tags", [])
            tag_text = " ".join(tags)
            
            # D1 and D2 should have roster limit
            division = score.get("division", "").upper()
            if division in ["D1", "D2"]:
                assert "Roster Limit" in tag_text, \
                    f"{score['university_name']} ({division}) should have 'Roster Limit' in context_tags"
                print(f"✓ {score['university_name']} has Roster Limit tag")


class TestNilReadinessRiskBadges:
    """Test NIL data is also returned in risk-badges endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "douglas@yeslms.com", "password": "password"}
        )
        assert login_response.status_code == 200
        yield
        self.session.close()
    
    def test_risk_badges_includes_nil_data(self):
        """Test that risk-badges endpoint also returns nil data"""
        # First get a program ID
        ms_response = self.session.get(f"{BASE_URL}/api/match-scores")
        assert ms_response.status_code == 200
        
        scores = ms_response.json().get("scores", [])
        if not scores:
            pytest.skip("No programs found for testing")
        
        program_id = scores[0].get("program_id")
        
        # Get risk badges for this program
        rb_response = self.session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert rb_response.status_code == 200
        
        data = rb_response.json()
        assert "nil" in data, "risk-badges response should include nil field"
        
        nil = data["nil"]
        assert "status_label" in nil, "nil should have status_label"
        assert "involves" in nil, "nil should have involves"
        assert "meaning" in nil, "nil should have meaning"
        assert "context_tags" in nil, "nil should have context_tags"
        
        print(f"✓ risk-badges endpoint returns NIL data with new fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
