"""
NIL Readiness Feature Tests
Tests the new NIL readiness intelligence feature including:
- GET /api/match-scores returns nil object with status/label/explanation/guidance/tooltip
- GET /api/suggested-schools returns nil for each suggestion
- GET /api/risk-badges/{program_id} returns nil alongside other data
- NIL status logic: D1 power conf = friendly, D1 non-power/D2/NAIA = limited, D3 = info_limited
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
TEST_EMAIL = "douglas@yeslms.com"
TEST_PASSWORD = "password"
# D1 non-power (ASUN)
D1_ASUN_PROGRAM_ID = "prog_3fe70bce8e71"
# D2 (SSC)
D2_PROGRAM_ID = "prog_0a5dfa9c59d1"

VALID_NIL_STATUSES = ["friendly", "limited", "info_limited", "unknown"]


@pytest.fixture(scope="module")
def session():
    """Create authenticated session for API tests"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    return s


class TestMatchScoresNIL:
    """Tests for NIL object in /api/match-scores response"""
    
    def test_match_scores_returns_nil_object(self, session):
        """GET /api/match-scores returns nil object with required fields"""
        resp = session.get(f"{BASE_URL}/api/match-scores")
        assert resp.status_code == 200, f"API call failed: {resp.text}"
        data = resp.json()
        
        assert "scores" in data, "Response missing 'scores' field"
        assert len(data["scores"]) > 0, "No scores returned"
        
        # Check first score has nil object
        first_score = data["scores"][0]
        assert "nil" in first_score, "Score missing 'nil' field"
        
        nil = first_score["nil"]
        assert nil is not None, "nil object is None"
        
    def test_nil_has_required_fields(self, session):
        """NIL object has status, label, explanation, guidance, tooltip"""
        resp = session.get(f"{BASE_URL}/api/match-scores")
        assert resp.status_code == 200
        data = resp.json()
        
        for score in data["scores"][:5]:  # Check first 5
            nil = score.get("nil")
            assert nil is not None, f"nil missing for {score.get('university_name')}"
            
            assert "status" in nil, f"nil.status missing for {score.get('university_name')}"
            assert "label" in nil, f"nil.label missing for {score.get('university_name')}"
            assert "explanation" in nil, f"nil.explanation missing for {score.get('university_name')}"
            assert "guidance" in nil, f"nil.guidance missing for {score.get('university_name')}"
            assert "tooltip" in nil, f"nil.tooltip missing for {score.get('university_name')}"
            
    def test_nil_status_is_valid(self, session):
        """NIL status is one of: friendly, limited, info_limited, unknown"""
        resp = session.get(f"{BASE_URL}/api/match-scores")
        assert resp.status_code == 200
        data = resp.json()
        
        for score in data["scores"]:
            nil = score.get("nil")
            if nil:
                assert nil["status"] in VALID_NIL_STATUSES, \
                    f"Invalid NIL status '{nil['status']}' for {score.get('university_name')}"
                    
    def test_nil_guidance_is_list(self, session):
        """NIL guidance is a list of bullet points"""
        resp = session.get(f"{BASE_URL}/api/match-scores")
        assert resp.status_code == 200
        data = resp.json()
        
        for score in data["scores"][:5]:
            nil = score.get("nil")
            if nil:
                assert isinstance(nil["guidance"], list), \
                    f"nil.guidance should be list for {score.get('university_name')}"
                assert len(nil["guidance"]) > 0, \
                    f"nil.guidance should have items for {score.get('university_name')}"
                    
    def test_nil_label_is_parent_safe(self, session):
        """NIL label contains no dollar amounts (parent-safe)"""
        resp = session.get(f"{BASE_URL}/api/match-scores")
        assert resp.status_code == 200
        data = resp.json()
        
        for score in data["scores"]:
            nil = score.get("nil")
            if nil:
                label = nil.get("label", "")
                assert "$" not in label, f"Dollar sign in NIL label for {score.get('university_name')}"
                assert "dollar" not in label.lower(), f"'dollar' in NIL label for {score.get('university_name')}"


class TestSuggestedSchoolsNIL:
    """Tests for NIL in /api/suggested-schools response"""
    
    def test_suggested_schools_returns_nil(self, session):
        """GET /api/suggested-schools returns nil for each suggestion"""
        resp = session.get(f"{BASE_URL}/api/suggested-schools")
        assert resp.status_code == 200, f"API call failed: {resp.text}"
        data = resp.json()
        
        if data.get("suggestions"):
            for suggestion in data["suggestions"][:5]:
                assert "nil" in suggestion, f"Suggestion missing 'nil' for {suggestion.get('university_name')}"
                nil = suggestion["nil"]
                assert nil is not None
                assert "status" in nil
                assert "label" in nil


class TestRiskBadgesNIL:
    """Tests for NIL in /api/risk-badges/{program_id} response"""
    
    def test_risk_badges_returns_nil(self, session):
        """GET /api/risk-badges/{program_id} returns nil alongside other data"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D1_ASUN_PROGRAM_ID}")
        assert resp.status_code == 200, f"API call failed: {resp.text}"
        data = resp.json()
        
        assert "nil" in data, "Response missing 'nil' field"
        nil = data["nil"]
        assert nil is not None, "nil is None"
        
    def test_risk_badges_nil_has_all_fields(self, session):
        """NIL object from risk-badges has all required fields"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D1_ASUN_PROGRAM_ID}")
        assert resp.status_code == 200
        data = resp.json()
        
        nil = data.get("nil")
        assert nil is not None
        
        required_fields = ["status", "label", "explanation", "guidance", "tooltip"]
        for field in required_fields:
            assert field in nil, f"nil missing '{field}' field"
            
    def test_risk_badges_also_returns_other_intelligence(self, session):
        """risk-badges returns badges, timeline, roster, scholarship, nil together"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D1_ASUN_PROGRAM_ID}")
        assert resp.status_code == 200
        data = resp.json()
        
        # All 5 intelligence features should be present
        assert "badges" in data, "Missing badges"
        assert "timeline" in data, "Missing timeline"
        assert "roster" in data, "Missing roster"
        assert "scholarship" in data, "Missing scholarship"
        assert "nil" in data, "Missing nil"


class TestNILStatusLogic:
    """Tests for NIL status computation logic based on division/conference"""
    
    def test_d1_non_power_asun_gets_limited(self, session):
        """D1 non-power conference (ASUN) gets 'limited' NIL status"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D1_ASUN_PROGRAM_ID}")
        assert resp.status_code == 200, f"API call failed: {resp.text}"
        data = resp.json()
        
        nil = data.get("nil")
        assert nil is not None, "nil is None"
        assert nil["status"] == "limited", \
            f"Expected 'limited' for D1 ASUN, got '{nil['status']}'"
        assert nil["label"] == "NIL-Limited Environment", \
            f"Expected 'NIL-Limited Environment', got '{nil['label']}'"
            
    def test_d2_gets_limited(self, session):
        """D2 school gets 'limited' NIL status"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D2_PROGRAM_ID}")
        assert resp.status_code == 200, f"API call failed: {resp.text}"
        data = resp.json()
        
        nil = data.get("nil")
        assert nil is not None, "nil is None"
        assert nil["status"] == "limited", \
            f"Expected 'limited' for D2, got '{nil['status']}'"
        assert nil["label"] == "NIL-Limited Environment", \
            f"Expected 'NIL-Limited Environment', got '{nil['label']}'"
            
    def test_nil_explanation_is_informative(self, session):
        """NIL explanation provides helpful context"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D1_ASUN_PROGRAM_ID}")
        assert resp.status_code == 200
        data = resp.json()
        
        nil = data.get("nil")
        assert nil is not None
        
        explanation = nil.get("explanation", "")
        assert len(explanation) > 20, "Explanation too short"
        assert "$" not in explanation, "Dollar sign in explanation (not parent-safe)"
        
    def test_nil_tooltip_explains_determination(self, session):
        """NIL tooltip explains 'How this is determined'"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D1_ASUN_PROGRAM_ID}")
        assert resp.status_code == 200
        data = resp.json()
        
        nil = data.get("nil")
        assert nil is not None
        
        tooltip = nil.get("tooltip", "")
        assert len(tooltip) > 20, "Tooltip too short"
        # Should mention it's estimated based on public info
        assert "estimate" in tooltip.lower() or "public" in tooltip.lower(), \
            "Tooltip should mention it's estimated from public info"


class TestNILGuidanceBullets:
    """Tests for NIL guidance bullet points"""
    
    def test_limited_has_appropriate_guidance(self, session):
        """'limited' status has guidance about NIL not being major factor"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D1_ASUN_PROGRAM_ID}")
        assert resp.status_code == 200
        data = resp.json()
        
        nil = data.get("nil")
        assert nil is not None
        assert nil["status"] == "limited"
        
        guidance = nil.get("guidance", [])
        assert len(guidance) >= 1, "Should have at least 1 guidance bullet"
        
        guidance_text = " ".join(guidance).lower()
        # Should mention NIL may not be major factor or athletics/academic fit
        assert "nil" in guidance_text or "athletic" in guidance_text or "academic" in guidance_text
        
    def test_guidance_bullets_are_strings(self, session):
        """Each guidance bullet is a non-empty string"""
        resp = session.get(f"{BASE_URL}/api/risk-badges/{D1_ASUN_PROGRAM_ID}")
        assert resp.status_code == 200
        data = resp.json()
        
        nil = data.get("nil")
        assert nil is not None
        
        for i, bullet in enumerate(nil.get("guidance", [])):
            assert isinstance(bullet, str), f"Guidance bullet {i} is not a string"
            assert len(bullet.strip()) > 0, f"Guidance bullet {i} is empty"


class TestMatchScoresWithNIL:
    """Tests that match-scores contains program-specific NIL data"""
    
    def test_match_scores_contains_d1_asun_with_limited_nil(self, session):
        """Match scores for D1 ASUN program has 'limited' NIL status"""
        resp = session.get(f"{BASE_URL}/api/match-scores")
        assert resp.status_code == 200
        data = resp.json()
        
        # Find the D1 ASUN program
        asun_program = None
        for score in data["scores"]:
            if score.get("program_id") == D1_ASUN_PROGRAM_ID:
                asun_program = score
                break
        
        if asun_program:
            nil = asun_program.get("nil")
            assert nil is not None, "nil missing for ASUN program"
            assert nil["status"] == "limited", f"Expected 'limited', got '{nil['status']}'"
