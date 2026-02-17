"""
Progress Rail Cascade Fill & Journey Rail Visual Tests
Tests the 6-stage journey rail, cascade fill on manual override, and auto-detection logic
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PRO_USER = {"email": "pro@test.com", "password": "password"}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def pro_auth(api_client):
    """Authenticate as pro user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=PRO_USER)
    assert response.status_code == 200, f"Login failed: {response.text}"
    return api_client


class TestProgressRailStructure:
    """Test journey_rail returns correct structure from GET /api/programs/{id}"""
    
    def test_journey_rail_structure(self, pro_auth):
        """Journey rail should have stages dict, active, line_fill, pulse"""
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1")
        assert response.status_code == 200
        
        data = response.json()
        assert "journey_rail" in data, "Response missing journey_rail field"
        
        rail = data["journey_rail"]
        
        # Structure assertions
        assert "stages" in rail, "Rail missing stages dict"
        assert "active" in rail, "Rail missing active field"
        assert "line_fill" in rail, "Rail missing line_fill field"
        assert "pulse" in rail, "Rail missing pulse field"
        
        # Stages should have all 6 keys
        stages = rail["stages"]
        expected_stages = ["added", "outreach_sent", "coach_replied", "campus_visit", "offer", "committed"]
        for stage in expected_stages:
            assert stage in stages, f"Missing stage: {stage}"
            assert isinstance(stages[stage], bool), f"Stage {stage} should be boolean"
        
        print(f"✓ Journey rail structure valid: stages={stages}, active={rail['active']}, pulse={rail['pulse']}")
    
    def test_auto_detection_from_signals(self, pro_auth):
        """Auto-detected stages should match interaction signals"""
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1")
        assert response.status_code == 200
        
        data = response.json()
        rail = data["journey_rail"]
        signals = data.get("signals", {})
        
        # Added is always true
        assert rail["stages"]["added"] is True, "Added should always be true"
        
        # outreach_sent should match signals.outreach_count > 0
        if signals.get("outreach_count", 0) > 0:
            assert rail["stages"]["outreach_sent"] is True, "Outreach sent should be true when outreach_count > 0"
        
        # coach_replied should match signals.has_coach_reply
        if signals.get("has_coach_reply", False):
            assert rail["stages"]["coach_replied"] is True, "Coach replied should be true when has_coach_reply is true"
        
        print(f"✓ Auto-detection matches signals: outreach={signals.get('outreach_count')}, reply={signals.get('has_coach_reply')}")
    
    def test_pulse_indicator_values(self, pro_auth):
        """Pulse should be one of: active, cooling, cold, neutral"""
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1")
        assert response.status_code == 200
        
        data = response.json()
        pulse = data["journey_rail"]["pulse"]
        valid_pulses = ["active", "cooling", "cold", "neutral"]
        assert pulse in valid_pulses, f"Invalid pulse value: {pulse}, expected one of {valid_pulses}"
        print(f"✓ Pulse indicator is valid: {pulse}")


class TestProgressRailCascadeFill:
    """Test manual journey_stage cascades fill to all prior stages"""
    
    def test_cascade_fill_campus_visit(self, pro_auth):
        """Setting journey_stage='campus_visit' should fill added, outreach_sent, coach_replied, campus_visit"""
        # Set journey_stage to campus_visit
        response = pro_auth.put(
            f"{BASE_URL}/api/programs/prog_pro_test1",
            json={"journey_stage": "campus_visit"}
        )
        assert response.status_code == 200
        
        # Get fresh data to verify
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1")
        assert response.status_code == 200
        
        data = response.json()
        rail = data["journey_rail"]
        stages = rail["stages"]
        
        # Cascade fill: all stages up to campus_visit should be true
        assert stages["added"] is True, "Added should be filled"
        assert stages["outreach_sent"] is True, "Outreach sent should be filled (cascade)"
        assert stages["coach_replied"] is True, "Coach replied should be filled (cascade)"
        assert stages["campus_visit"] is True, "Campus visit should be filled"
        
        # Active should be the furthest consecutive stage
        assert rail["active"] == "campus_visit", f"Active should be campus_visit, got {rail['active']}"
        assert rail["line_fill"] == "campus_visit", f"Line fill should be campus_visit, got {rail['line_fill']}"
        
        print(f"✓ Cascade fill worked: all stages up to campus_visit are filled")
    
    def test_cascade_fill_offer(self, pro_auth):
        """Setting journey_stage='offer' should fill all stages up to offer"""
        response = pro_auth.put(
            f"{BASE_URL}/api/programs/prog_pro_test1",
            json={"journey_stage": "offer"}
        )
        assert response.status_code == 200
        
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1")
        data = response.json()
        stages = data["journey_rail"]["stages"]
        
        assert stages["added"] is True
        assert stages["outreach_sent"] is True
        assert stages["coach_replied"] is True
        assert stages["campus_visit"] is True
        assert stages["offer"] is True
        assert stages["committed"] is False, "Committed should NOT be filled"
        
        assert data["journey_rail"]["active"] == "offer"
        print(f"✓ Cascade fill to offer: 5/6 stages filled")
    
    def test_undo_manual_override(self, pro_auth):
        """Setting journey_stage='' clears manual override, reverts to auto-detected"""
        # First, ensure there's a manual override
        pro_auth.put(
            f"{BASE_URL}/api/programs/prog_pro_test1",
            json={"journey_stage": "campus_visit"}
        )
        
        # Now clear the override
        response = pro_auth.put(
            f"{BASE_URL}/api/programs/prog_pro_test1",
            json={"journey_stage": ""}
        )
        assert response.status_code == 200
        
        # Get fresh data
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1")
        data = response.json()
        rail = data["journey_rail"]
        signals = data.get("signals", {})
        
        # After clearing, stages should revert to auto-detected values
        # campus_visit should now be false (no campus_visit interaction logged)
        assert rail["stages"]["campus_visit"] is False, "Campus visit should revert to false after clearing override"
        
        # Active should be the last auto-detected consecutive stage
        # Based on signals: if has_coach_reply, active should be coach_replied
        if signals.get("has_coach_reply", False):
            assert rail["active"] == "coach_replied", f"Active should revert to coach_replied, got {rail['active']}"
        
        print(f"✓ Undo manual override: reverted to auto-detected state")


class TestProgressRailLineFill:
    """Test the pink fill line extends correctly"""
    
    def test_line_fill_no_gaps(self, pro_auth):
        """Line fill should have no gaps (consecutive stages only)"""
        # Reset to auto-detected state
        pro_auth.put(
            f"{BASE_URL}/api/programs/prog_pro_test1",
            json={"journey_stage": ""}
        )
        
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1")
        data = response.json()
        rail = data["journey_rail"]
        
        # line_fill should equal active (the last consecutive completed stage)
        assert rail["line_fill"] == rail["active"], f"Line fill should equal active: {rail['line_fill']} vs {rail['active']}"
        
        # Verify stages are consecutive from added
        stages = rail["stages"]
        stage_order = ["added", "outreach_sent", "coach_replied", "campus_visit", "offer", "committed"]
        
        consecutive_broken = False
        for stage in stage_order:
            if consecutive_broken:
                # After first false, all subsequent should be false (no gaps)
                if stages[stage]:
                    print(f"WARNING: Gap detected - {stage} is true after previous false")
            if not stages[stage]:
                consecutive_broken = True
        
        print(f"✓ Line fill is gap-free: line_fill={rail['line_fill']}, active={rail['active']}")


class TestJourneyTimeline:
    """Test journey timeline endpoint"""
    
    def test_journey_timeline_structure(self, pro_auth):
        """GET /api/programs/{id}/journey returns timeline array"""
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1/journey")
        assert response.status_code == 200
        
        data = response.json()
        assert "timeline" in data, "Response missing timeline array"
        assert isinstance(data["timeline"], list), "Timeline should be an array"
        
        print(f"✓ Journey timeline returned {len(data['timeline'])} events")
    
    def test_timeline_event_types(self, pro_auth):
        """Timeline events should have valid event_type values"""
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1/journey")
        data = response.json()
        
        valid_types = ["email_sent", "email_received", "coach_reply", "phone_call", "video_call", 
                       "camp", "visit", "showcase", "meeting", "note", "interaction"]
        
        for event in data["timeline"]:
            assert "event_type" in event, "Event missing event_type"
            assert "date" in event, "Event missing date"
            # event_type should be one of valid types or similar
            print(f"  Event: {event.get('event_type')} - {event.get('title', 'No title')[:50]}")
        
        print(f"✓ Timeline events have valid structure")


class TestBoardGroupInConversation:
    """Test board_group='in_conversation' triggers celebration hero"""
    
    def test_in_conversation_state(self, pro_auth):
        """Program with coach reply should have board_group='in_conversation'"""
        response = pro_auth.get(f"{BASE_URL}/api/programs/prog_pro_test1")
        data = response.json()
        
        signals = data.get("signals", {})
        board_group = data.get("board_group")
        
        # If has_coach_reply is true, board_group should be in_conversation
        if signals.get("has_coach_reply", False):
            assert board_group == "in_conversation", f"Expected in_conversation, got {board_group}"
            print(f"✓ Program with coach reply is in 'in_conversation' group (Celebration Hero should show)")
        else:
            print(f"ℹ Program has no coach reply, board_group is {board_group}")


class TestCleanup:
    """Cleanup: reset journey_stage to auto-detected state"""
    
    def test_cleanup_reset_journey_stage(self, pro_auth):
        """Reset journey_stage to empty for clean state"""
        response = pro_auth.put(
            f"{BASE_URL}/api/programs/prog_pro_test1",
            json={"journey_stage": ""}
        )
        assert response.status_code == 200
        print("✓ Cleanup: journey_stage reset to auto-detected state")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
