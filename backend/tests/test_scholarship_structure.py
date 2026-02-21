"""
Tests for Scholarship Structure feature.
Tests scholarship computation based on division and conference.
- D1 Power Conferences (BIG 12, SEC, ACC, BIG TEN, BIG EAST, PAC-12) → status: "mix", with NIL context
- D1 Non-Power Conferences → status: "partial"
- D2 → status: "partial"
- D3 → status: "walkon"
- NAIA/JUCO → status: "partial"
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


class TestMatchScoresScholarship:
    """Tests for scholarship object in GET /api/match-scores"""
    
    def test_match_scores_returns_scholarship_object(self, session):
        """GET /api/match-scores returns scholarship object for each score"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "scores" in data, "Response should have 'scores'"
        assert len(data["scores"]) > 0, "Should have at least one score"
        
        # Check first score has scholarship
        score = data["scores"][0]
        assert "scholarship" in score, "Score should have 'scholarship' field"
        
    def test_scholarship_has_required_fields(self, session):
        """Scholarship object has status, label, explanation, tooltip"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        for score in data["scores"]:
            scholarship = score.get("scholarship")
            assert scholarship is not None, f"Score {score.get('program_id')} missing scholarship"
            
            # Check required fields
            assert "status" in scholarship, "Scholarship should have 'status'"
            assert "label" in scholarship, "Scholarship should have 'label'"
            assert "explanation" in scholarship, "Scholarship should have 'explanation'"
            assert "tooltip" in scholarship, "Scholarship should have 'tooltip'"
            # nil_context and nil_tooltip are optional (only for power conf D1)
            
    def test_scholarship_status_values(self, session):
        """Scholarship status should be one of: mix, partial, walkon, unknown"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        valid_statuses = {"mix", "partial", "walkon", "unknown"}
        for score in data["scores"]:
            scholarship = score.get("scholarship", {})
            status = scholarship.get("status")
            assert status in valid_statuses, f"Invalid status '{status}' for {score.get('program_id')}"
            
    def test_scholarship_label_values(self, session):
        """Scholarship label should match expected values"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        valid_labels = {
            "Mix of Partial and Full Scholarships",
            "Typically Partial Scholarships",
            "Walk-On Pathways Common",
            "Unknown"
        }
        for score in data["scores"]:
            scholarship = score.get("scholarship", {})
            label = scholarship.get("label")
            assert label in valid_labels, f"Invalid label '{label}' for {score.get('program_id')}"


class TestSuggestedSchoolsScholarship:
    """Tests for scholarship in GET /api/suggested-schools"""
    
    def test_suggested_schools_returns_scholarship(self, session):
        """GET /api/suggested-schools returns scholarship for each suggestion"""
        res = session.get(f"{BASE_URL}/api/suggested-schools")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        if data.get("suggestions") and len(data["suggestions"]) > 0:
            for suggestion in data["suggestions"]:
                assert "scholarship" in suggestion, f"Suggestion {suggestion.get('university_name')} missing scholarship"
                scholarship = suggestion["scholarship"]
                assert "status" in scholarship, "Scholarship should have status"
                assert "label" in scholarship, "Scholarship should have label"
                assert "explanation" in scholarship, "Scholarship should have explanation"
                assert "tooltip" in scholarship, "Scholarship should have tooltip"


class TestRiskBadgesScholarship:
    """Tests for scholarship in GET /api/risk-badges/{program_id}"""
    
    def test_risk_badges_returns_scholarship(self, session):
        """GET /api/risk-badges/{program_id} returns scholarship alongside badges"""
        # Use D1 program
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        
        assert "scholarship" in data, "Response should have 'scholarship' field"
        assert "badges" in data, "Response should still have 'badges' field"
        assert "timeline" in data, "Response should still have 'timeline' field"
        assert "roster" in data, "Response should still have 'roster' field"
        
    def test_risk_badges_scholarship_has_fields(self, session):
        """Scholarship from risk-badges endpoint has all required fields"""
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        scholarship = data.get("scholarship")
        assert scholarship is not None, "Scholarship should not be None"
        assert "status" in scholarship
        assert "label" in scholarship
        assert "explanation" in scholarship
        assert "tooltip" in scholarship


class TestScholarshipDivisionLogic:
    """Tests for scholarship computation logic based on division + conference"""
    
    def test_d1_non_power_gets_partial(self, session):
        """D1 non-power conference school gets 'partial' status"""
        # D1 Florida Gulf Coast - ASUN conf (non-power)
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        scholarship = data.get("scholarship", {})
        status = scholarship.get("status")
        label = scholarship.get("label")
        # D1 non-power should be 'partial'
        assert status == "partial", f"D1 ASUN (non-power) should be 'partial', got '{status}'"
        assert "Partial" in label, f"Label should mention 'Partial', got '{label}'"
        # Should NOT have NIL context
        assert scholarship.get("nil_context") is None, "D1 non-power should NOT have nil_context"
        
    def test_d2_school_gets_partial(self, session):
        """D2 school gets 'partial' status"""
        # D2 Tampa University - SSC conf
        program_id = "prog_0a5dfa9c59d1"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        scholarship = data.get("scholarship", {})
        status = scholarship.get("status")
        label = scholarship.get("label")
        # D2 should be 'partial'
        assert status == "partial", f"D2 should be 'partial', got '{status}'"
        assert "Partial" in label, f"Label should mention 'Partial', got '{label}'"
        # Should NOT have NIL context
        assert scholarship.get("nil_context") is None, "D2 should NOT have nil_context"
        
    def test_d3_school_gets_walkon(self, session):
        """D3 school should get 'walkon' status (check suggested-schools for D3)"""
        res = session.get(f"{BASE_URL}/api/suggested-schools")
        assert res.status_code == 200
        data = res.json()
        
        # Find a D3 school in suggestions
        d3_found = False
        for suggestion in data.get("suggestions", []):
            division = (suggestion.get("division") or "").upper()
            if division == "D3":
                d3_found = True
                scholarship = suggestion.get("scholarship", {})
                status = scholarship.get("status")
                label = scholarship.get("label")
                assert status == "walkon", f"D3 should be 'walkon', got '{status}'"
                assert "Walk-On" in label, f"Label should mention 'Walk-On', got '{label}'"
                # Should NOT have NIL context
                assert scholarship.get("nil_context") is None, "D3 should NOT have nil_context"
                break
        
        # If no D3 in suggestions, check match-scores
        if not d3_found:
            res2 = session.get(f"{BASE_URL}/api/match-scores")
            assert res2.status_code == 200
            data2 = res2.json()
            for score in data2.get("scores", []):
                division = (score.get("division") or "").upper()
                if division == "D3":
                    scholarship = score.get("scholarship", {})
                    status = scholarship.get("status")
                    assert status == "walkon", f"D3 should be 'walkon', got '{status}'"
                    d3_found = True
                    break
        
        # If still no D3 found, just print info (not a test failure)
        if not d3_found:
            print("INFO: No D3 schools found in suggestions or match-scores to verify walkon status")


class TestScholarshipNILContext:
    """Tests for NIL context in power conference D1 programs"""
    
    def test_power_conference_d1_has_nil_context(self, session):
        """D1 power conference programs should have nil_context"""
        res = session.get(f"{BASE_URL}/api/suggested-schools")
        assert res.status_code == 200
        data = res.json()
        
        power_confs = {"BIG 12", "SEC", "ACC", "BIG TEN", "BIG EAST", "PAC-12"}
        
        # Look for power conference D1 in suggestions
        power_d1_found = False
        for suggestion in data.get("suggestions", []):
            division = (suggestion.get("division") or "").upper()
            conference = (suggestion.get("conference") or "").upper()
            
            # Check if this is a power conference D1
            if division == "D1" and any(pc in conference for pc in power_confs):
                power_d1_found = True
                scholarship = suggestion.get("scholarship", {})
                status = scholarship.get("status")
                nil_context = scholarship.get("nil_context")
                nil_tooltip = scholarship.get("nil_tooltip")
                
                assert status == "mix", f"D1 power conf should be 'mix', got '{status}'"
                assert nil_context is not None, f"D1 power conf should have nil_context"
                assert nil_tooltip is not None, f"D1 power conf should have nil_tooltip"
                break
        
        # If no power D1 in suggestions, this is OK - just log it
        if not power_d1_found:
            print("INFO: No D1 power conference schools found in suggestions - skipping NIL context verification")


class TestScholarshipLabelMapping:
    """Tests for scholarship status-to-label mapping"""
    
    def test_scholarship_label_mapping(self, session):
        """Verify status-to-label mapping"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        label_map = {
            "mix": "Mix of Partial and Full Scholarships",
            "partial": "Typically Partial Scholarships",
            "walkon": "Walk-On Pathways Common",
            "unknown": "Unknown"
        }
        
        for score in data["scores"]:
            scholarship = score.get("scholarship", {})
            status = scholarship.get("status")
            label = scholarship.get("label")
            expected_label = label_map.get(status)
            if expected_label:
                assert label == expected_label, f"Status '{status}' should have label '{expected_label}', got '{label}'"


class TestScholarshipExplanation:
    """Tests for scholarship explanation/tooltip text"""
    
    def test_scholarship_explanation_is_parent_safe(self, session):
        """Explanation should not contain dollar amounts"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        for score in data["scores"]:
            scholarship = score.get("scholarship", {})
            explanation = scholarship.get("explanation", "")
            # Should NOT contain dollar amounts
            assert "$" not in explanation, f"Explanation should not contain $ amounts: '{explanation}'"
            assert "dollar" not in explanation.lower(), f"Explanation should not mention dollars: '{explanation}'"
            
    def test_scholarship_tooltip_is_helpful(self, session):
        """Tooltip should mention that structures reflect typical practices"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        for score in data["scores"]:
            scholarship = score.get("scholarship", {})
            tooltip = scholarship.get("tooltip", "")
            # Should mention typical/practices/estimates
            has_context = (
                "typical" in tooltip.lower() or 
                "practices" in tooltip.lower() or 
                "estimate" in tooltip.lower() or
                "reflect" in tooltip.lower()
            )
            assert has_context, f"Tooltip should provide context: '{tooltip}'"


class TestScholarshipWithAllFeatures:
    """Tests that scholarship works alongside risk badges, timeline, roster"""
    
    def test_match_scores_has_all_four_features(self, session):
        """Match scores should have risk_badges, timeline, roster, AND scholarship"""
        res = session.get(f"{BASE_URL}/api/match-scores")
        assert res.status_code == 200
        data = res.json()
        
        for score in data["scores"]:
            assert "risk_badges" in score, f"Score {score.get('program_id')} missing risk_badges"
            assert "timeline" in score, f"Score {score.get('program_id')} missing timeline"
            assert "roster" in score, f"Score {score.get('program_id')} missing roster"
            assert "scholarship" in score, f"Score {score.get('program_id')} missing scholarship"
            
    def test_risk_badges_endpoint_has_all_four(self, session):
        """Risk badges endpoint should return badges, timeline, roster, AND scholarship"""
        program_id = "prog_3fe70bce8e71"
        res = session.get(f"{BASE_URL}/api/risk-badges/{program_id}")
        assert res.status_code == 200
        data = res.json()
        
        assert "badges" in data, "Should have badges"
        assert "timeline" in data, "Should have timeline"
        assert "roster" in data, "Should have roster"
        assert "scholarship" in data, "Should have scholarship"
