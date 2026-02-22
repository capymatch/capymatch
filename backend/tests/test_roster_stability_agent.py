"""
Test suite for Roster Reality / Commitment Stability Micro-Agent (Stage 3 - Phase B)
Tests POST /api/intelligence/roster/{program_id} endpoint

Roster Reality / Commitment Stability Card:
- Produces deterministic 'Unknown' results when no roster_size data exists
- Produces deterministic 'Unknown' stability results when no roster_snapshots exist (<2)
- Openings must be ranges (never single numbers) when data exists
- No inference from division/conference - purely data-driven
- Includes ui_roster and ui_stability mappings for frontend components

Labels: Open | Limited | Tight | Unknown (roster)
Labels: High Stability | Moderate | Volatile | Unknown (stability)
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


class TestRosterStabilityEndpoint:
    """Test POST /api/intelligence/roster/{program_id} returns valid card JSON."""
    
    def test_fgcu_returns_valid_card_json(self, authenticated_session):
        """FGCU should return valid roster stability card JSON."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("card_type") == "roster_stability", f"Expected card_type 'roster_stability', got {data.get('card_type')}"
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        assert "school_id" in data, "Response should contain 'school_id'"
        assert "school_name" in data, "Response should contain 'school_name'"
        print(f"✓ FGCU roster stability card returned successfully")
    
    def test_tampa_returns_valid_card_json(self, authenticated_session):
        """Tampa University (no KB data) should also return valid roster card."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{TAMPA_PROGRAM_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("card_type") == "roster_stability", f"Expected card_type 'roster_stability', got {data.get('card_type')}"
        print(f"✓ Tampa University roster stability card returned successfully")
    
    def test_authentication_required(self, authenticated_session):
        """Unauthenticated request should return 401."""
        unauthenticated_session = requests.Session()
        response = unauthenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}")
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print(f"✓ Authentication required - returns 401 for unauthenticated requests")


class TestRosterLabelDeterministicBehavior:
    """Test that roster_label is 'Unknown' when no roster_size data exists."""
    
    def test_fgcu_roster_label_is_unknown(self, authenticated_session):
        """FGCU should have 'Unknown' roster_label since no roster_size data exists."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("roster_label") == "Unknown", f"Expected roster_label 'Unknown', got '{data.get('roster_label')}'"
        print(f"✓ FGCU roster_label is 'Unknown' (correct - no roster_size data)")
    
    def test_tampa_roster_label_is_unknown(self, authenticated_session):
        """Tampa should have 'Unknown' roster_label since no roster_size data exists."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{TAMPA_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("roster_label") == "Unknown", f"Expected roster_label 'Unknown', got '{data.get('roster_label')}'"
        print(f"✓ Tampa roster_label is 'Unknown' (correct - no roster_size data)")
    
    def test_no_hallucinated_roster_labels(self, authenticated_session):
        """roster_label should NEVER be Open/Limited/Tight without real roster_size data."""
        for program_id, name in [(FGCU_PROGRAM_ID, "FGCU"), (TAMPA_PROGRAM_ID, "Tampa")]:
            response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{program_id}?force=true")
            
            assert response.status_code == 200
            data = response.json()
            
            label = data.get("roster_label")
            # Should ONLY be Unknown since no roster_size data exists
            assert label == "Unknown", f"{name}: Label should be 'Unknown', not '{label}' (no roster_size data in DB)"
            assert label not in ["Open", "Limited", "Tight"], \
                f"{name}: Label '{label}' requires real roster_size data - this is a hallucination!"
        
        print(f"✓ No hallucinated roster labels - both schools correctly show 'Unknown'")


class TestStabilityLabelDeterministicBehavior:
    """Test that stability_label is 'Unknown' when no roster_snapshots exist."""
    
    def test_fgcu_stability_label_is_unknown(self, authenticated_session):
        """FGCU should have 'Unknown' stability_label since no roster_snapshots exist."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("stability_label") == "Unknown", f"Expected stability_label 'Unknown', got '{data.get('stability_label')}'"
        print(f"✓ FGCU stability_label is 'Unknown' (correct - no roster_snapshots)")
    
    def test_tampa_stability_label_is_unknown(self, authenticated_session):
        """Tampa should have 'Unknown' stability_label since no roster_snapshots exist."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{TAMPA_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("stability_label") == "Unknown", f"Expected stability_label 'Unknown', got '{data.get('stability_label')}'"
        print(f"✓ Tampa stability_label is 'Unknown' (correct - no roster_snapshots)")
    
    def test_no_hallucinated_stability_labels(self, authenticated_session):
        """stability_label should NEVER be High/Moderate/Volatile without >= 2 snapshots."""
        for program_id, name in [(FGCU_PROGRAM_ID, "FGCU"), (TAMPA_PROGRAM_ID, "Tampa")]:
            response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{program_id}?force=true")
            
            assert response.status_code == 200
            data = response.json()
            
            label = data.get("stability_label")
            # Should ONLY be Unknown since no roster_snapshots exist (< 2)
            assert label == "Unknown", f"{name}: stability_label should be 'Unknown', not '{label}' (no roster_snapshots in DB)"
            assert label not in ["High Stability", "Moderate", "Volatile"], \
                f"{name}: stability_label '{label}' requires >= 2 roster_snapshots - this is a hallucination!"
        
        print(f"✓ No hallucinated stability labels - both schools correctly show 'Unknown'")


class TestRosterEvidenceAndBasis:
    """Test roster_evidence and label_basis fields."""
    
    def test_roster_evidence_is_none_when_unknown(self, authenticated_session):
        """roster_evidence should be 'none' when roster_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("roster_evidence") == "none", f"Expected roster_evidence 'none', got '{data.get('roster_evidence')}'"
        print(f"✓ roster_evidence is 'none' when roster_label is Unknown")
    
    def test_stability_evidence_is_none_when_unknown(self, authenticated_session):
        """stability_evidence should be 'none' when stability_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("stability_evidence") == "none", f"Expected stability_evidence 'none', got '{data.get('stability_evidence')}'"
        print(f"✓ stability_evidence is 'none' when stability_label is Unknown")
    
    def test_label_basis_is_none_when_unknown(self, authenticated_session):
        """label_basis should be 'none' when all labels are Unknown (NOT inferred from division)."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("label_basis") == "none", f"Expected label_basis 'none', got '{data.get('label_basis')}'"
        assert "division" not in str(data.get("label_basis", "")).lower(), "label_basis should NOT reference division"
        print(f"✓ label_basis is 'none' when all labels are Unknown (not inferred from division)")


class TestGeneratedByField:
    """Test generated_by field indicates deterministic (no AI call)."""
    
    def test_generated_by_is_deterministic(self, authenticated_session):
        """generated_by should be 'deterministic' when no roster data exists."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("generated_by") == "deterministic", f"Expected generated_by 'deterministic', got '{data.get('generated_by')}'"
        print(f"✓ generated_by is 'deterministic' (no AI call made)")
    
    def test_tampa_generated_by_is_deterministic(self, authenticated_session):
        """Tampa should also have generated_by 'deterministic'."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{TAMPA_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("generated_by") == "deterministic", f"Expected generated_by 'deterministic', got '{data.get('generated_by')}'"
        print(f"✓ Tampa generated_by is 'deterministic'")


class TestMissingSections:
    """Test missing_sections contains 'roster' when labels are Unknown."""
    
    def test_missing_sections_contains_roster(self, authenticated_session):
        """missing_sections should contain 'roster' when labels are Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        missing_sections = data.get("missing_sections", [])
        assert "roster" in missing_sections, f"missing_sections should contain 'roster', got {missing_sections}"
        print(f"✓ missing_sections contains 'roster': {missing_sections}")


class TestInsightsArray:
    """Test insights array has exactly 2 items with correct structure."""
    
    def test_insights_has_exactly_2_items(self, authenticated_session):
        """insights array should have exactly 2 items: roster gap and stability gap."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get("insights", [])
        assert len(insights) == 2, f"Expected exactly 2 insights, got {len(insights)}"
        print(f"✓ insights array has exactly 2 items")
    
    def test_first_insight_roster_gap_evidence_none(self, authenticated_session):
        """First insight should be about roster gap with evidence 'none'."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get("insights", [])
        assert len(insights) >= 1, "Need at least 1 insight"
        
        first_insight = insights[0]
        assert first_insight.get("evidence") == "none", f"First insight evidence should be 'none', got '{first_insight.get('evidence')}'"
        assert "roster" in first_insight.get("based_on", []), "First insight should be based on 'roster'"
        # Should mention roster data not available
        assert "roster" in first_insight.get("text", "").lower(), "First insight should mention roster"
        print(f"✓ First insight is roster gap with evidence='none': {first_insight.get('text')[:60]}...")
    
    def test_second_insight_stability_gap_evidence_none(self, authenticated_session):
        """Second insight should be about stability gap with evidence 'none'."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        insights = data.get("insights", [])
        assert len(insights) >= 2, "Need at least 2 insights"
        
        second_insight = insights[1]
        assert second_insight.get("evidence") == "none", f"Second insight evidence should be 'none', got '{second_insight.get('evidence')}'"
        # Should mention snapshots or stability
        text_lower = second_insight.get("text", "").lower()
        assert "snapshot" in text_lower or "stability" in text_lower, f"Second insight should mention snapshots/stability: {second_insight.get('text')}"
        print(f"✓ Second insight is stability gap with evidence='none': {second_insight.get('text')[:60]}...")


class TestUnknownsArray:
    """Test unknowns include roster.roster_size and roster.roster_snapshots as missing_data."""
    
    def test_unknowns_contains_roster_size(self, authenticated_session):
        """unknowns should include roster.roster_size as missing_data."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        unknowns = data.get("unknowns", [])
        assert len(unknowns) > 0, "Should have at least 1 unknown"
        
        # Check for roster.roster_size in missing_data
        has_roster_size_unknown = any(
            u.get("missing_data") == "roster.roster_size" 
            for u in unknowns
        )
        assert has_roster_size_unknown, f"unknowns should include 'roster.roster_size', got {[u.get('missing_data') for u in unknowns]}"
        print(f"✓ unknowns includes roster.roster_size")
    
    def test_unknowns_contains_roster_snapshots(self, authenticated_session):
        """unknowns should include roster.roster_snapshots as missing_data."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        unknowns = data.get("unknowns", [])
        
        # Check for roster.roster_snapshots in missing_data
        has_snapshots_unknown = any(
            u.get("missing_data") == "roster.roster_snapshots" 
            for u in unknowns
        )
        assert has_snapshots_unknown, f"unknowns should include 'roster.roster_snapshots', got {[u.get('missing_data') for u in unknowns]}"
        print(f"✓ unknowns includes roster.roster_snapshots")


class TestNextAction:
    """Test next_action recommendation based on status."""
    
    def test_next_action_for_not_contacted_status(self, authenticated_session):
        """next_action should be 'Send an introductory email to the coaching staff.' when status is Not Contacted."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
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


class TestUIRosterObject:
    """Test ui_roster object contains required fields for RosterRealityCard."""
    
    def test_ui_roster_has_required_fields(self, authenticated_session):
        """ui_roster should contain status, label, openings, explanation, guidance, tooltip."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui_roster = data.get("ui_roster", {})
        required_fields = ["status", "label", "openings", "explanation", "guidance", "tooltip"]
        
        for field in required_fields:
            assert field in ui_roster, f"ui_roster missing '{field}'"
        
        print(f"✓ ui_roster contains all required fields: {list(ui_roster.keys())}")
    
    def test_ui_roster_openings_is_null_when_unknown(self, authenticated_session):
        """ui_roster.openings should be null (not a number) when roster_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui_roster = data.get("ui_roster", {})
        openings = ui_roster.get("openings")
        
        # openings must be None/null when Unknown, NOT a number
        assert openings is None, f"ui_roster.openings should be null when Unknown, got '{openings}' (type: {type(openings)})"
        print(f"✓ ui_roster.openings is null when roster_label is Unknown")
    
    def test_ui_roster_status_is_unknown(self, authenticated_session):
        """ui_roster.status should be 'unknown' when roster_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui_roster = data.get("ui_roster", {})
        assert ui_roster.get("status") == "unknown", f"ui_roster.status should be 'unknown', got '{ui_roster.get('status')}'"
        print(f"✓ ui_roster.status is 'unknown'")
    
    def test_ui_roster_label_is_unknown(self, authenticated_session):
        """ui_roster.label should be 'Unknown' when roster_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui_roster = data.get("ui_roster", {})
        assert ui_roster.get("label") == "Unknown", f"ui_roster.label should be 'Unknown', got '{ui_roster.get('label')}'"
        print(f"✓ ui_roster.label is 'Unknown'")


class TestUIStabilityObject:
    """Test ui_stability object contains required fields for CommitmentStabilityCard."""
    
    def test_ui_stability_has_required_fields(self, authenticated_session):
        """ui_stability should contain status, retention_rate, signals, meaning, trend, history, context_tags."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui_stability = data.get("ui_stability", {})
        required_fields = ["status", "retention_rate", "signals", "meaning", "trend", "history", "context_tags"]
        
        for field in required_fields:
            assert field in ui_stability, f"ui_stability missing '{field}'"
        
        print(f"✓ ui_stability contains all required fields: {list(ui_stability.keys())}")
    
    def test_ui_stability_status_is_unknown(self, authenticated_session):
        """ui_stability.status should be 'unknown' when stability_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui_stability = data.get("ui_stability", {})
        assert ui_stability.get("status") == "unknown", f"ui_stability.status should be 'unknown', got '{ui_stability.get('status')}'"
        print(f"✓ ui_stability.status is 'unknown'")
    
    def test_ui_stability_retention_rate_is_null_when_unknown(self, authenticated_session):
        """ui_stability.retention_rate should be null when stability_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui_stability = data.get("ui_stability", {})
        retention_rate = ui_stability.get("retention_rate")
        
        # retention_rate must be None/null when Unknown
        assert retention_rate is None, f"ui_stability.retention_rate should be null when Unknown, got '{retention_rate}'"
        print(f"✓ ui_stability.retention_rate is null when stability_label is Unknown")
    
    def test_ui_stability_signals_is_empty_when_unknown(self, authenticated_session):
        """ui_stability.signals should be empty array when stability_label is Unknown."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        ui_stability = data.get("ui_stability", {})
        signals = ui_stability.get("signals", [])
        
        assert isinstance(signals, list), f"ui_stability.signals should be a list, got {type(signals)}"
        assert len(signals) == 0, f"ui_stability.signals should be empty when Unknown, got {signals}"
        print(f"✓ ui_stability.signals is empty array when stability_label is Unknown")


class TestTampaUniversityCorrectStructure:
    """Test Tampa University (no KB data) returns Unknown with correct structure."""
    
    def test_tampa_has_complete_card_structure(self, authenticated_session):
        """Tampa University should return complete card structure even without KB data."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{TAMPA_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all top-level fields exist
        required_fields = [
            "card_type", "status", "school_id", "roster_label", "roster_evidence",
            "stability_label", "stability_evidence", "label_basis", 
            "recruiting_position", "insights", "unknowns",
            "next_action", "ui_roster", "ui_stability", "generated_at", "generated_by",
            "missing_sections"
        ]
        
        for field in required_fields:
            assert field in data, f"Tampa card missing '{field}'"
        
        # Verify Unknown state for all labels
        assert data.get("roster_label") == "Unknown", f"Tampa roster_label should be 'Unknown', got '{data.get('roster_label')}'"
        assert data.get("stability_label") == "Unknown", f"Tampa stability_label should be 'Unknown', got '{data.get('stability_label')}'"
        assert data.get("roster_evidence") == "none"
        assert data.get("stability_evidence") == "none"
        assert data.get("label_basis") == "none"
        assert data.get("generated_by") == "deterministic"
        
        print(f"✓ Tampa University has complete card structure with Unknown state")


class TestCaching:
    """Test caching behavior."""
    
    def test_cached_response_under_1_second(self, authenticated_session):
        """Second call should return cached response in under 1 second."""
        # First call - may take longer
        response1 = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}")
        assert response1.status_code == 200
        
        # Second call - should be cached
        start_time = time.time()
        response2 = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}")
        elapsed = time.time() - start_time
        
        assert response2.status_code == 200
        assert elapsed < 1.0, f"Cached response should be under 1 second, took {elapsed:.2f}s"
        print(f"✓ Cached response returned in {elapsed:.3f}s (< 1s)")
    
    def test_force_true_bypasses_cache(self, authenticated_session):
        """force=true should bypass cache and generate fresh response."""
        # First call to ensure cache exists
        response1 = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}")
        assert response1.status_code == 200
        data1 = response1.json()
        timestamp1 = data1.get("generated_at")
        
        # Small delay to ensure timestamp difference
        time.sleep(0.5)
        
        # Force refresh
        response2 = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        assert response2.status_code == 200
        data2 = response2.json()
        timestamp2 = data2.get("generated_at")
        
        # Timestamps should be different
        assert timestamp1 != timestamp2, f"force=true should generate new timestamp, both are {timestamp1}"
        print(f"✓ force=true bypasses cache: {timestamp1} → {timestamp2}")


class TestNoHallucination:
    """Test that division/conference info does NOT influence roster_label or stability_label."""
    
    def test_division_does_not_influence_roster_label(self, authenticated_session):
        """D1 FGCU and D2 Tampa should both have 'Unknown' roster_label regardless of division."""
        # Test FGCU (D1)
        fgcu_response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        assert fgcu_response.status_code == 200
        fgcu_data = fgcu_response.json()
        
        # Test Tampa (D2)
        tampa_response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{TAMPA_PROGRAM_ID}?force=true")
        assert tampa_response.status_code == 200
        tampa_data = tampa_response.json()
        
        # Both should have Unknown roster_label
        assert fgcu_data.get("roster_label") == "Unknown", f"D1 FGCU roster_label should be 'Unknown', got '{fgcu_data.get('roster_label')}'"
        assert tampa_data.get("roster_label") == "Unknown", f"D2 Tampa roster_label should be 'Unknown', got '{tampa_data.get('roster_label')}'"
        
        # Verify they have different divisions but same label
        fgcu_division = fgcu_data.get("division", "")
        tampa_division = tampa_data.get("division", "")
        
        print(f"✓ No hallucination: D1 FGCU (div: {fgcu_division}) roster_label='Unknown', D2 Tampa (div: {tampa_division}) roster_label='Unknown'")
    
    def test_division_does_not_influence_stability_label(self, authenticated_session):
        """D1 FGCU and D2 Tampa should both have 'Unknown' stability_label regardless of division."""
        # Test FGCU (D1)
        fgcu_response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        assert fgcu_response.status_code == 200
        fgcu_data = fgcu_response.json()
        
        # Test Tampa (D2)
        tampa_response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{TAMPA_PROGRAM_ID}?force=true")
        assert tampa_response.status_code == 200
        tampa_data = tampa_response.json()
        
        # Both should have Unknown stability_label
        assert fgcu_data.get("stability_label") == "Unknown", f"D1 FGCU stability_label should be 'Unknown', got '{fgcu_data.get('stability_label')}'"
        assert tampa_data.get("stability_label") == "Unknown", f"D2 Tampa stability_label should be 'Unknown', got '{tampa_data.get('stability_label')}'"
        
        print(f"✓ No hallucination: Both D1 FGCU and D2 Tampa have stability_label='Unknown'")


class TestRecruitingPosition:
    """Test recruiting_position contains required fields."""
    
    def test_recruiting_position_has_required_fields(self, authenticated_session):
        """recruiting_position should contain current_status, interaction_count, last_interaction, days_on_board."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
        assert response.status_code == 200
        data = response.json()
        
        recruiting_position = data.get("recruiting_position", {})
        required_fields = ["current_status", "interaction_count", "last_interaction", "days_on_board"]
        
        for field in required_fields:
            assert field in recruiting_position, f"recruiting_position missing '{field}'"
        
        print(f"✓ recruiting_position contains all required fields: {list(recruiting_position.keys())}")
    
    def test_recruiting_position_values(self, authenticated_session):
        """Verify recruiting_position values are correct types."""
        response = authenticated_session.post(f"{BASE_URL}/api/intelligence/roster/{FGCU_PROGRAM_ID}?force=true")
        
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


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
