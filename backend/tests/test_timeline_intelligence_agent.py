"""
Test suite for Timeline Intelligence Micro-Agent (Stage 3)
Tests POST /api/intelligence/timeline/{program_id} endpoint

Timeline Intelligence Card:
- Produces deterministic 'Unknown' results when no commit timing data exists
- Surfaces user's recruiting position (status, interactions, days on board)
- Provides safe next_action recommendations
- Includes 'ui' mapping object for TimelineStatusCard frontend component

Labels: Fills Early | Standard Timeline | Late Opportunities | Unknown
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
TEST_USER_EMAIL = "douglas@yeslms.com"
TEST_USER_PASSWORD = "password"

# Program IDs for testing
FGCU_PROGRAM_ID = "prog_3fe70bce8e71"  # D1 Florida Gulf Coast University
TAMPA_PROGRAM_ID = "prog_0a5dfa9c59d1"  # D2 Tampa University (no KB data)


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


class TestTimelineIntelligenceEndpoint:
    """Test POST /api/intelligence/timeline/{program_id} returns valid card JSON."""
    
    def test_fgcu_returns_valid_card_json(self, authenticated_session):
        """FGCU should return valid timeline intelligence card JSON."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("card_type") == "timeline_intelligence", f"Expected card_type 'timeline_intelligence', got {data.get('card_type')}"
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        assert "school_id" in data, "Response should contain 'school_id'"
        assert "school_name" in data, "Response should contain 'school_name'"
        print(f"✓ FGCU timeline intelligence card returned successfully")
    
    def test_tampa_returns_valid_card_json(self, authenticated_session):
        """Tampa University (no KB data) should also return valid timeline card."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{TAMPA_PROGRAM_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("card_type") == "timeline_intelligence", f"Expected card_type 'timeline_intelligence', got {data.get('card_type')}"
        print(f"✓ Tampa University timeline intelligence card returned successfully")
    
    def test_authentication_required(self, authenticated_session):
        """Unauthenticated request should return 401."""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print(f"✓ Authentication required - returns 401 for unauthenticated requests")


class TestTimelineLabelDeterministicBehavior:
    """Test that timeline_label is 'Unknown' when no commit timing data exists."""
    
    def test_fgcu_timeline_label_is_unknown(self, authenticated_session):
        """FGCU should have 'Unknown' timeline_label since no commit timing data exists."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("timeline_label") == "Unknown", f"Expected timeline_label 'Unknown', got '{data.get('timeline_label')}'"
        print(f"✓ FGCU timeline_label is 'Unknown' (correct - no commit timing data)")
    
    def test_tampa_timeline_label_is_unknown(self, authenticated_session):
        """Tampa should have 'Unknown' timeline_label since no commit timing data exists."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{TAMPA_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("timeline_label") == "Unknown", f"Expected timeline_label 'Unknown', got '{data.get('timeline_label')}'"
        print(f"✓ Tampa timeline_label is 'Unknown' (correct - no commit timing data)")
    
    def test_no_hallucinated_timeline_labels(self, authenticated_session):
        """Timeline label should NEVER be Fills Early/Standard/Late without real data."""
        for program_id, name in [(FGCU_PROGRAM_ID, "FGCU"), (TAMPA_PROGRAM_ID, "Tampa")]:
            response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{program_id}?force=true")
            
            assert response.status_code == 200
            data = response.json()
            
            label = data.get("timeline_label")
            # Should ONLY be Unknown since no commit timing signals exist
            assert label == "Unknown", f"{name}: Label should be 'Unknown', not '{label}' (no commit timing data in DB)"
            assert label not in ["Fills Early", "Standard Timeline", "Late Opportunities"], \
                f"{name}: Label '{label}' requires real commit timing data - this is a hallucination!"
        
        print(f"✓ No hallucinated timeline labels - both schools correctly show 'Unknown'")


class TestTimelineEvidenceAndBasis:
    """Test timeline_evidence and label_basis fields."""
    
    def test_timeline_evidence_is_none_when_unknown(self, authenticated_session):
        """timeline_evidence should be 'none' when label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("timeline_evidence") == "none", f"Expected timeline_evidence 'none', got '{data.get('timeline_evidence')}'"
        print(f"✓ timeline_evidence is 'none' when label is Unknown")
    
    def test_label_basis_is_none_when_unknown(self, authenticated_session):
        """label_basis should be 'none' when label is Unknown (NOT 'interaction_derived')."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("label_basis") == "none", f"Expected label_basis 'none', got '{data.get('label_basis')}'"
        assert data.get("label_basis") != "interaction_derived", "label_basis should NOT be 'interaction_derived' when no real data"
        print(f"✓ label_basis is 'none' when label is Unknown")


class TestGeneratedByField:
    """Test generated_by field indicates deterministic (no AI call)."""
    
    def test_generated_by_is_deterministic(self, authenticated_session):
        """generated_by should be 'deterministic' when no commit timing data exists."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("generated_by") == "deterministic", f"Expected generated_by 'deterministic', got '{data.get('generated_by')}'"
        print(f"✓ generated_by is 'deterministic' (no AI call made)")
    
    def test_tampa_generated_by_is_deterministic(self, authenticated_session):
        """Tampa should also have generated_by 'deterministic'."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{TAMPA_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("generated_by") == "deterministic", f"Expected generated_by 'deterministic', got '{data.get('generated_by')}'"
        print(f"✓ Tampa generated_by is 'deterministic'")


class TestMissingSections:
    """Test missing_sections contains 'timeline' when label is Unknown."""
    
    def test_missing_sections_contains_timeline(self, authenticated_session):
        """missing_sections should contain 'timeline' when label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        missing_sections = data.get("missing_sections", [])
        assert "timeline" in missing_sections, f"missing_sections should contain 'timeline', got {missing_sections}"
        print(f"✓ missing_sections contains 'timeline': {missing_sections}")


class TestRecruitingPosition:
    """Test recruiting_position contains required fields."""
    
    def test_recruiting_position_has_required_fields(self, authenticated_session):
        """recruiting_position should contain current_status, interaction_count, last_interaction, days_on_board."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        recruiting_position = data.get("recruiting_position", {})
        required_fields = ["current_status", "interaction_count", "last_interaction", "days_on_board"]
        
        for field in required_fields:
            assert field in recruiting_position, f"recruiting_position missing '{field}'"
        
        print(f"✓ recruiting_position contains all required fields: {list(recruiting_position.keys())}")
    
    def test_recruiting_position_values(self, authenticated_session):
        """Verify recruiting_position values are correct types."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        rp = data.get("recruiting_position", {})
        
        # current_status should be a string
        assert isinstance(rp.get("current_status"), str), f"current_status should be string, got {type(rp.get('current_status'))}"
        
        # interaction_count should be an integer
        assert isinstance(rp.get("interaction_count"), int), f"interaction_count should be int, got {type(rp.get('interaction_count'))}"
        
        # days_on_board should be an integer
        assert isinstance(rp.get("days_on_board"), int), f"days_on_board should be int, got {type(rp.get('days_on_board'))}"
        
        print(f"✓ recruiting_position values: status='{rp.get('current_status')}', interactions={rp.get('interaction_count')}, days_on_board={rp.get('days_on_board')}")


class TestInsightsArray:
    """Test insights array has exactly 2 items with correct structure."""
    
    def test_insights_has_exactly_2_items(self, authenticated_session):
        """insights array should have exactly 2 items."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get("insights", [])
        assert len(insights) == 2, f"Expected exactly 2 insights, got {len(insights)}"
        print(f"✓ insights array has exactly 2 items")
    
    def test_first_insight_about_data_gap(self, authenticated_session):
        """First insight should be about data gap with evidence 'none'."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get("insights", [])
        assert len(insights) >= 1, "Need at least 1 insight"
        
        first_insight = insights[0]
        assert first_insight.get("evidence") == "none", f"First insight evidence should be 'none', got '{first_insight.get('evidence')}'"
        assert "timeline" in first_insight.get("based_on", []), "First insight should be based on 'timeline'"
        print(f"✓ First insight is about data gap with evidence='none': {first_insight.get('text')[:60]}...")
    
    def test_second_insight_about_recruiting_position(self, authenticated_session):
        """Second insight should be about recruiting position with evidence 'strong'."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get("insights", [])
        assert len(insights) >= 2, "Need at least 2 insights"
        
        second_insight = insights[1]
        assert second_insight.get("evidence") == "strong", f"Second insight evidence should be 'strong', got '{second_insight.get('evidence')}'"
        
        based_on = second_insight.get("based_on", [])
        # Should reference recruiting fields
        recruiting_refs = [ref for ref in based_on if "recruiting" in ref]
        assert len(recruiting_refs) > 0, f"Second insight should reference recruiting fields, got {based_on}"
        
        print(f"✓ Second insight is about recruiting position with evidence='strong': {second_insight.get('text')[:60]}...")


class TestUnknownsArray:
    """Test unknowns include timeline.commit_timing_signals as missing_data."""
    
    def test_unknowns_contains_timeline_commit_timing_signals(self, authenticated_session):
        """unknowns should include timeline.commit_timing_signals as missing_data."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        unknowns = data.get("unknowns", [])
        assert len(unknowns) > 0, "Should have at least 1 unknown"
        
        # Check for timeline.commit_timing_signals in missing_data
        has_timeline_unknown = any(
            u.get("missing_data") == "timeline.commit_timing_signals" 
            for u in unknowns
        )
        assert has_timeline_unknown, f"unknowns should include 'timeline.commit_timing_signals', got {[u.get('missing_data') for u in unknowns]}"
        print(f"✓ unknowns includes timeline.commit_timing_signals: {[u.get('missing_data') for u in unknowns]}")


class TestNextAction:
    """Test next_action recommendation based on status."""
    
    def test_next_action_for_not_contacted_status(self, authenticated_session):
        """next_action should be 'Send an introductory email to the coaching staff.' when status is Not Contacted."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        recruiting_position = data.get("recruiting_position", {})
        current_status = recruiting_position.get("current_status", "")
        next_action = data.get("next_action", "")
        
        # If status is "Not Contacted", expect the introductory email action
        if current_status == "Not Contacted":
            expected_action = "Send an introductory email to the coaching staff."
            assert next_action == expected_action, f"Expected '{expected_action}', got '{next_action}'"
            print(f"✓ next_action is '{expected_action}' for status 'Not Contacted'")
        else:
            # Just verify next_action is a non-empty string
            assert len(next_action) > 0, "next_action should not be empty"
            print(f"✓ next_action for status '{current_status}': {next_action}")


class TestUIObject:
    """Test ui object contains required fields for TimelineStatusCard."""
    
    def test_ui_object_has_required_fields(self, authenticated_session):
        """ui object should contain status, label, explanation, guidance, tooltip."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui = data.get("ui", {})
        required_fields = ["status", "label", "explanation", "guidance", "tooltip"]
        
        for field in required_fields:
            assert field in ui, f"ui object missing '{field}'"
        
        print(f"✓ ui object contains all required fields: {list(ui.keys())}")
    
    def test_ui_status_is_unknown(self, authenticated_session):
        """ui.status should be 'unknown' when timeline_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui = data.get("ui", {})
        assert ui.get("status") == "unknown", f"ui.status should be 'unknown', got '{ui.get('status')}'"
        print(f"✓ ui.status is 'unknown'")
    
    def test_ui_label_is_unknown(self, authenticated_session):
        """ui.label should be 'Unknown' when timeline_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui = data.get("ui", {})
        assert ui.get("label") == "Unknown", f"ui.label should be 'Unknown', got '{ui.get('label')}'"
        print(f"✓ ui.label is 'Unknown'")
    
    def test_ui_values_are_strings(self, authenticated_session):
        """All ui values should be non-empty strings."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui = data.get("ui", {})
        for key, value in ui.items():
            assert isinstance(value, str), f"ui.{key} should be string, got {type(value)}"
            assert len(value) > 0, f"ui.{key} should not be empty"
        
        print(f"✓ All ui values are non-empty strings")


class TestTampaUniversityCorrectStructure:
    """Test Tampa University (no KB data) returns Unknown with correct structure."""
    
    def test_tampa_has_complete_card_structure(self, authenticated_session):
        """Tampa University should return complete card structure even without KB data."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{TAMPA_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all top-level fields exist
        required_fields = [
            "card_type", "status", "school_id", "timeline_label", "timeline_evidence",
            "label_basis", "recruiting_position", "insights", "unknowns",
            "next_action", "ui", "generated_at", "generated_by"
        ]
        
        for field in required_fields:
            assert field in data, f"Tampa card missing '{field}'"
        
        # Verify Unknown state
        assert data.get("timeline_label") == "Unknown"
        assert data.get("timeline_evidence") == "none"
        assert data.get("label_basis") == "none"
        assert data.get("generated_by") == "deterministic"
        
        print(f"✓ Tampa University has complete card structure with Unknown state")


class TestCaching:
    """Test caching behavior."""
    
    def test_cached_response_under_1_second(self, authenticated_session):
        """Second call should return cached response in under 1 second."""
        # First call - may take longer
        response1 = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}")
        assert response1.status_code == 200
        
        # Second call - should be cached
        start_time = time.time()
        response2 = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}")
        elapsed = time.time() - start_time
        
        assert response2.status_code == 200
        assert elapsed < 1.0, f"Cached response should be under 1 second, took {elapsed:.2f}s"
        print(f"✓ Cached response returned in {elapsed:.3f}s (< 1s)")
    
    def test_force_true_bypasses_cache(self, authenticated_session):
        """force=true should bypass cache and generate fresh response."""
        # First call to ensure cache exists
        response1 = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}")
        assert response1.status_code == 200
        data1 = response1.json()
        timestamp1 = data1.get("generated_at")
        
        # Small delay to ensure timestamp difference
        time.sleep(0.5)
        
        # Force refresh
        response2 = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        assert response2.status_code == 200
        data2 = response2.json()
        timestamp2 = data2.get("generated_at")
        
        # Timestamps should be different
        assert timestamp1 != timestamp2, f"force=true should generate new timestamp, both are {timestamp1}"
        print(f"✓ force=true bypasses cache: {timestamp1} → {timestamp2}")


class TestNoHallucination:
    """Test that division/conference info does NOT influence timeline_label."""
    
    def test_division_does_not_influence_label(self, authenticated_session):
        """D1 FGCU and D2 Tampa should both have 'Unknown' label regardless of division."""
        # Test FGCU (D1)
        fgcu_response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{FGCU_PROGRAM_ID}?force=true")
        assert fgcu_response.status_code == 200
        fgcu_data = fgcu_response.json()
        
        # Test Tampa (D2)
        tampa_response = authenticated_session.post(f"{BASE_URL}/api/intelligence/timeline/{TAMPA_PROGRAM_ID}?force=true")
        assert tampa_response.status_code == 200
        tampa_data = tampa_response.json()
        
        # Both should be Unknown
        assert fgcu_data.get("timeline_label") == "Unknown", f"D1 FGCU should be 'Unknown', got '{fgcu_data.get('timeline_label')}'"
        assert tampa_data.get("timeline_label") == "Unknown", f"D2 Tampa should be 'Unknown', got '{tampa_data.get('timeline_label')}'"
        
        # Verify they have different divisions but same label
        fgcu_division = fgcu_data.get("division", "")
        tampa_division = tampa_data.get("division", "")
        
        print(f"✓ No hallucination: D1 FGCU (div: {fgcu_division}) = 'Unknown', D2 Tampa (div: {tampa_division}) = 'Unknown'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
