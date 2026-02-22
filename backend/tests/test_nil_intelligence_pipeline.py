"""
NIL Readiness Intelligence Pipeline Tests - Phase D
Tests the NIL readiness micro-agent in the intelligence pipeline.

Test coverage:
- POST /api/intelligence/nil/{program_id} response shape and exact copy
- Deterministic path for schools without nil_signals
- Context tags include division information
- No dollar amounts or financial outcomes in response
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://athlete-profile-5.preview.emergentagent.com').rstrip('/')
FGCU_PROGRAM_ID = "prog_3fe70bce8e71"  # Florida Gulf Coast University - D1, no nil_signals


class TestNilIntelligenceEndpoint:
    """Tests for POST /api/intelligence/nil/{program_id}"""
    
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
    
    def test_nil_endpoint_returns_correct_response_shape(self):
        """Test POST /api/intelligence/nil/{program_id} returns correct response shape with card_type='nil_readiness', status='ok'"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Core response shape
        assert data.get("card_type") == "nil_readiness", f"Expected card_type='nil_readiness', got {data.get('card_type')}"
        assert data.get("status") == "ok", f"Expected status='ok', got {data.get('status')}"
        assert "school_id" in data
        assert "school_name" in data
        assert "division" in data
        assert "nil_label" in data
        assert "nil_evidence" in data
        assert "label_basis" in data
        assert "insights" in data
        assert "ui" in data
        assert "generated_at" in data
        assert "generated_by" in data
        print(f"PASS: Response shape correct with card_type='nil_readiness', status='ok'")
    
    def test_fgcu_returns_nil_information_limited(self):
        """Test FGCU (no stored nil_signals) returns 'NIL Information Limited' label"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        assert data.get("nil_label") == "NIL Information Limited", \
            f"Expected nil_label='NIL Information Limited', got {data.get('nil_label')}"
        
        ui = data.get("ui", {})
        assert ui.get("label") == "NIL Information Limited", \
            f"Expected ui.label='NIL Information Limited', got {ui.get('label')}"
        
        print(f"PASS: FGCU returns 'NIL Information Limited' label")
    
    def test_ui_explanation_exact_copy(self):
        """Test UI object contains exact explanation: 'NIL activity for this program isn't available in our stored data...'"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        expected = "NIL activity for this program isn't available in our stored data. We can't determine what support structures or opportunities exist."
        
        assert ui.get("explanation") == expected, \
            f"Expected explanation='{expected}', got '{ui.get('explanation')}'"
        
        print(f"PASS: UI explanation matches exact copy")
    
    def test_ui_guidance_exact_copy(self):
        """Test UI object contains exact guidance: 'Ask the coaching staff what NIL resources are available...'"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        expected = "Ask the coaching staff what NIL resources are available to athletes and how the program approaches NIL education."
        
        assert ui.get("guidance") == expected, \
            f"Expected guidance='{expected}', got '{ui.get('guidance')}'"
        
        print(f"PASS: UI guidance matches exact copy")
    
    def test_ui_tooltip_exact_copy(self):
        """Test UI object contains exact tooltip: 'NIL opportunities vary and are not guaranteed.'"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        expected = "NIL opportunities vary and are not guaranteed."
        
        assert ui.get("tooltip") == expected, \
            f"Expected tooltip='{expected}', got '{ui.get('tooltip')}'"
        
        print(f"PASS: UI tooltip matches exact copy")
    
    def test_context_tags_include_ncaa_d1(self):
        """Test context_tags include 'NCAA D1' for D1 schools"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        context_tags = ui.get("context_tags", [])
        
        assert "NCAA D1" in context_tags, \
            f"Expected 'NCAA D1' in context_tags, got {context_tags}"
        
        print(f"PASS: Context tags include 'NCAA D1'")
    
    def test_context_tags_include_current_nil_era(self):
        """Test context_tags include 'Current NIL Era' for D1/D2 schools"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        context_tags = ui.get("context_tags", [])
        
        assert "Current NIL Era" in context_tags, \
            f"Expected 'Current NIL Era' in context_tags, got {context_tags}"
        
        print(f"PASS: Context tags include 'Current NIL Era'")
    
    def test_generated_by_is_deterministic_when_no_nil_signals(self):
        """Test generated_by is 'deterministic' when no nil_signals"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        
        assert data.get("generated_by") == "deterministic", \
            f"Expected generated_by='deterministic', got {data.get('generated_by')}"
        
        print(f"PASS: generated_by='deterministic' when no nil_signals")
    
    def test_no_dollar_amounts_in_response(self):
        """Test no dollar amounts or financial outcomes in any NIL response fields"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        response_text = json.dumps(response.json())
        
        # Check for dollar signs
        assert "$" not in response_text, \
            f"Response should not contain dollar amounts, found '$' in response"
        
        # Check for common money-related terms
        forbidden_terms = ["dollar", "earnings", "compensation", "payment", "paid", "income"]
        for term in forbidden_terms:
            assert term.lower() not in response_text.lower(), \
                f"Response should not contain financial term '{term}'"
        
        print(f"PASS: No dollar amounts or financial outcomes in response")
    
    def test_nil_endpoint_requires_auth(self):
        """Test NIL endpoint returns 401 without authentication"""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        
        assert response.status_code == 401, \
            f"Expected 401 without auth, got {response.status_code}"
        
        print(f"PASS: NIL endpoint returns 401 without auth")
    
    def test_force_refresh_bypasses_cache(self):
        """Test ?force=true bypasses cache and regenerates data"""
        # First call - may hit cache
        response1 = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response1.status_code == 200
        
        # Force refresh
        response2 = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}?force=true")
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        # Both should have same structure
        assert data1.get("card_type") == data2.get("card_type") == "nil_readiness"
        assert data1.get("nil_label") == data2.get("nil_label") == "NIL Information Limited"
        
        # generated_at should be different or same (depending on cache)
        print(f"First generated_at: {data1.get('generated_at')}")
        print(f"Force refresh generated_at: {data2.get('generated_at')}")
        print(f"PASS: Force refresh request completed successfully")
    
    def test_ui_status_is_info_limited(self):
        """Test ui.status is 'info_limited' for Information Limited label"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        
        assert ui.get("status") == "info_limited", \
            f"Expected ui.status='info_limited', got {ui.get('status')}"
        
        print(f"PASS: ui.status='info_limited'")
    
    def test_ui_status_label_is_information_limited(self):
        """Test ui.status_label is 'Information limited'"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        
        assert ui.get("status_label") == "Information limited", \
            f"Expected ui.status_label='Information limited', got {ui.get('status_label')}"
        
        print(f"PASS: ui.status_label='Information limited'")
    
    def test_involves_is_empty_for_info_limited(self):
        """Test ui.involves is empty array for info_limited status"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        
        assert ui.get("involves") == [], \
            f"Expected ui.involves=[], got {ui.get('involves')}"
        
        print(f"PASS: ui.involves is empty for info_limited")
    
    def test_meaning_is_empty_for_info_limited(self):
        """Test ui.meaning is empty string for info_limited status"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        
        assert ui.get("meaning") == "", \
            f"Expected ui.meaning='', got {ui.get('meaning')}"
        
        print(f"PASS: ui.meaning is empty for info_limited")
    
    def test_ui_contains_is_vague_field(self):
        """Test ui object contains is_vague field (false for FGCU - deterministic path)"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        ui = response.json().get("ui", {})
        
        assert "is_vague" in ui, \
            f"Expected 'is_vague' field in ui object, got keys: {list(ui.keys())}"
        assert ui.get("is_vague") == False, \
            f"Expected ui.is_vague=False for FGCU, got {ui.get('is_vague')}"
        
        print(f"PASS: ui.is_vague=False for FGCU (deterministic path)")


class TestNilReadinessAllowedLabels:
    """Tests for NIL Readiness allowed labels"""
    
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
    
    def test_nil_label_is_one_of_allowed_labels(self):
        """Test nil_label is one of: Established NIL Support | Emerging NIL Support | NIL Information Limited"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/nil/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        allowed_labels = {
            "Established NIL Support",
            "Emerging NIL Support",
            "NIL Information Limited",
        }
        
        assert data.get("nil_label") in allowed_labels, \
            f"nil_label '{data.get('nil_label')}' not in allowed labels: {allowed_labels}"
        
        print(f"PASS: nil_label is in allowed labels")


class TestOtherCardsStillWork:
    """Regression tests for other intelligence cards"""
    
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
    
    def test_timeline_endpoint_works(self):
        """Test Timeline Intelligence endpoint still works"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("card_type") == "timeline_intelligence"
        print(f"PASS: Timeline endpoint works")
    
    def test_roster_endpoint_works(self):
        """Test Roster Stability endpoint still works"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("card_type") == "roster_stability"
        print(f"PASS: Roster endpoint works")
    
    def test_scholarship_endpoint_works(self):
        """Test Scholarship Structure endpoint still works"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/scholarship/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("card_type") == "scholarship_structure"
        print(f"PASS: Scholarship endpoint works")
    
    def test_school_insight_endpoint_works(self):
        """Test School Insight endpoint still works"""
        response = self.session.post(f"{BASE_URL}/api/intelligence/school-insight/{FGCU_PROGRAM_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("card_type") == "school_insight"
        print(f"PASS: School Insight endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
