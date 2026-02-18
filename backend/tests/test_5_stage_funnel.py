"""
Test 5-Stage Recruiting Funnel Scenarios
Tests the NEW 5-stage pipeline that replaced the OLD 4-stage system.

NEW 5 Stages:
1. overdue          - follow-up date has passed (highest priority)
2. needs_outreach   - no interactions logged yet (default)
3. waiting_on_reply - outreach sent, no coach reply
4. in_conversation  - coach has replied (via mark-as-replied)
5. archived         - is_active = false

Priority order: archived > overdue > in_conversation > waiting_on_reply > needs_outreach

Test Scenarios:
- SCENARIO 1: New school, no interactions -> needs_outreach
- SCENARIO 2: Outreach logged but NO coach reply -> waiting_on_reply
- SCENARIO 3: Coach_reply (mark-replied) -> in_conversation
- SCENARIO 4: Overdue follow-up date (yesterday) -> overdue
- SCENARIO 5: is_active=false -> archived
- SCENARIO 6: coach_reply AND overdue -> overdue (overdue wins)
- SCENARIO 7: Outreach AND future follow-up date (not overdue) -> waiting_on_reply
- SCENARIO 8: No interactions but has future follow-up date -> needs_outreach
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://recruiting-crm-2.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def auth_session():
    """Authenticate as premium user and return session with auth cookie."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login as premium user
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "premium@test.com",
        "password": "password"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    print(f"✓ Logged in as premium@test.com")
    return session


@pytest.fixture(scope="module")
def test_programs(auth_session):
    """Create 8 test programs (one for each scenario) and clean up after tests."""
    created_programs = []
    
    for i in range(1, 9):
        prog_data = {
            "university_name": f"TEST_5Stage_Scenario{i}_{uuid.uuid4().hex[:6]}",
            "division": "D1",
            "conference": "Test Conference",
            "region": "Southeast",
            "is_active": True
        }
        res = auth_session.post(f"{BASE_URL}/api/programs", json=prog_data)
        assert res.status_code == 200, f"Failed to create test program {i}: {res.text}"
        created_programs.append(res.json())
        print(f"  Created program {i}: {prog_data['university_name']}")
    
    yield created_programs
    
    # Cleanup: Delete all test programs
    print("\n--- Cleaning up test programs ---")
    for prog in created_programs:
        try:
            auth_session.delete(f"{BASE_URL}/api/programs/{prog['program_id']}")
            print(f"  Deleted: {prog['university_name']}")
        except Exception as e:
            print(f"  Cleanup warning for {prog['university_name']}: {e}")


class TestScenario1_NeedsOutreach:
    """SCENARIO 1: New school with NO interactions -> needs_outreach (default stage)."""
    
    def test_new_school_needs_outreach(self, auth_session, test_programs):
        program = test_programs[0]
        
        # Fetch program details
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        # Verify signals
        assert "signals" in data, "Response should include signals object"
        assert "board_group" in data, "Response should include board_group field"
        
        signals = data["signals"]
        assert signals.get("outreach_count", 0) == 0, "New school should have 0 outreach"
        assert signals.get("total_interactions", 0) == 0, "New school should have 0 interactions"
        assert signals.get("has_coach_reply", False) == False, "New school should have no coach reply"
        
        # Verify board_group is needs_outreach
        assert data["board_group"] == "needs_outreach", f"Expected 'needs_outreach', got '{data['board_group']}'"
        print(f"✓ SCENARIO 1 PASSED: New school with no interactions is in 'needs_outreach'")


class TestScenario2_WaitingOnReply:
    """SCENARIO 2: School with outreach logged but NO coach reply -> waiting_on_reply."""
    
    def test_outreach_no_reply_waiting(self, auth_session, test_programs):
        program = test_programs[1]
        
        # Log an outreach interaction (Email)
        interaction_data = {
            "program_id": program["program_id"],
            "type": "Email",
            "date_time": datetime.now().isoformat(),
            "outcome": "No Response",
            "notes": "TEST: Initial outreach email sent"
        }
        res = auth_session.post(f"{BASE_URL}/api/interactions", json=interaction_data)
        assert res.status_code == 200, f"Failed to create interaction: {res.text}"
        
        # Fetch program details
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        signals = data["signals"]
        assert signals.get("outreach_count", 0) >= 1, "Should have at least 1 outreach"
        assert signals.get("has_coach_reply", False) == False, "Should have no coach reply"
        
        # Verify board_group is waiting_on_reply
        assert data["board_group"] == "waiting_on_reply", f"Expected 'waiting_on_reply', got '{data['board_group']}'"
        print(f"✓ SCENARIO 2 PASSED: School with outreach but no reply is in 'waiting_on_reply'")


class TestScenario3_InConversation:
    """SCENARIO 3: School with coach_reply (mark-replied) -> in_conversation."""
    
    def test_coach_reply_in_conversation(self, auth_session, test_programs):
        program = test_programs[2]
        
        # Mark as replied using the API endpoint
        res = auth_session.post(
            f"{BASE_URL}/api/programs/{program['program_id']}/mark-replied",
            json={"note": "TEST: Coach expressed interest in my profile"}
        )
        assert res.status_code == 200, f"Mark-replied failed: {res.text}"
        
        # Fetch program details
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        signals = data["signals"]
        assert signals.get("has_coach_reply", False) == True, "Should have coach reply"
        
        # Verify board_group is in_conversation
        assert data["board_group"] == "in_conversation", f"Expected 'in_conversation', got '{data['board_group']}'"
        print(f"✓ SCENARIO 3 PASSED: School with coach reply is in 'in_conversation'")


class TestScenario4_Overdue:
    """SCENARIO 4: School with overdue follow-up date (yesterday) -> overdue."""
    
    def test_overdue_followup(self, auth_session, test_programs):
        program = test_programs[3]
        
        # Set next_action_due to yesterday (overdue)
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        res = auth_session.put(
            f"{BASE_URL}/api/programs/{program['program_id']}",
            json={"next_action_due": yesterday, "next_action": "Overdue follow-up test"}
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Fetch program details
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        assert data.get("next_action_due") == yesterday, "next_action_due should be yesterday"
        
        # Verify board_group is overdue
        assert data["board_group"] == "overdue", f"Expected 'overdue', got '{data['board_group']}'"
        print(f"✓ SCENARIO 4 PASSED: School with overdue follow-up is in 'overdue'")


class TestScenario5_Archived:
    """SCENARIO 5: School marked inactive (is_active=false) -> archived."""
    
    def test_inactive_archived(self, auth_session, test_programs):
        program = test_programs[4]
        
        # Set is_active = false
        res = auth_session.put(
            f"{BASE_URL}/api/programs/{program['program_id']}",
            json={"is_active": False}
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Fetch program details
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        assert data.get("is_active") == False, "is_active should be False"
        
        # Verify board_group is archived
        assert data["board_group"] == "archived", f"Expected 'archived', got '{data['board_group']}'"
        print(f"✓ SCENARIO 5 PASSED: Inactive school is in 'archived'")


class TestScenario6_OverdueWinsOverConversation:
    """SCENARIO 6: School with coach_reply AND overdue follow-up -> overdue (overdue wins)."""
    
    def test_overdue_priority_over_conversation(self, auth_session, test_programs):
        program = test_programs[5]
        
        # First, log a coach reply
        res = auth_session.post(
            f"{BASE_URL}/api/programs/{program['program_id']}/mark-replied",
            json={"note": "TEST: Coach replied for priority test"}
        )
        assert res.status_code == 200, f"Mark-replied failed: {res.text}"
        
        # Verify it's initially in_conversation
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        assert data["board_group"] == "in_conversation", "Should be in_conversation after coach reply"
        
        # Then set an overdue follow-up date
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        res = auth_session.put(
            f"{BASE_URL}/api/programs/{program['program_id']}",
            json={"next_action_due": yesterday}
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Fetch program details
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        signals = data["signals"]
        assert signals.get("has_coach_reply") == True, "Should have coach reply"
        assert data.get("next_action_due") == yesterday, "Should have overdue date"
        
        # Even with coach reply, overdue should win
        assert data["board_group"] == "overdue", f"Expected 'overdue' (priority over in_conversation), got '{data['board_group']}'"
        print(f"✓ SCENARIO 6 PASSED: Overdue wins over in_conversation (coach reply)")


class TestScenario7_WaitingWithFutureFollowUp:
    """SCENARIO 7: School with outreach AND future follow-up date (not overdue) -> waiting_on_reply."""
    
    def test_outreach_with_future_followup(self, auth_session, test_programs):
        program = test_programs[6]
        
        # Log an outreach interaction
        interaction_data = {
            "program_id": program["program_id"],
            "type": "Email",
            "date_time": datetime.now().isoformat(),
            "outcome": "Sent",
            "notes": "TEST: Outreach with future follow-up"
        }
        res = auth_session.post(f"{BASE_URL}/api/interactions", json=interaction_data)
        assert res.status_code == 200, f"Failed to create interaction: {res.text}"
        
        # Set future follow-up date (5 days from now)
        future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        res = auth_session.put(
            f"{BASE_URL}/api/programs/{program['program_id']}",
            json={"next_action_due": future_date, "next_action": "Follow up on initial outreach"}
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Fetch program details
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        signals = data["signals"]
        assert signals.get("outreach_count", 0) >= 1, "Should have outreach"
        assert signals.get("has_coach_reply", False) == False, "Should have no coach reply"
        assert data.get("next_action_due") == future_date, "Should have future follow-up date"
        
        # Should be waiting_on_reply (not overdue since date is in future)
        assert data["board_group"] == "waiting_on_reply", f"Expected 'waiting_on_reply', got '{data['board_group']}'"
        print(f"✓ SCENARIO 7 PASSED: Outreach with future follow-up is in 'waiting_on_reply'")


class TestScenario8_NeedsOutreachWithFutureFollowUp:
    """SCENARIO 8: School with no interactions but has future follow-up date -> needs_outreach."""
    
    def test_no_interactions_with_future_followup(self, auth_session, test_programs):
        program = test_programs[7]
        
        # Set future follow-up date (7 days from now) WITHOUT any interactions
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        res = auth_session.put(
            f"{BASE_URL}/api/programs/{program['program_id']}",
            json={"next_action_due": future_date, "next_action": "Plan first outreach"}
        )
        assert res.status_code == 200, f"Update failed: {res.text}"
        
        # Fetch program details
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        signals = data["signals"]
        assert signals.get("outreach_count", 0) == 0, "Should have no outreach"
        assert signals.get("total_interactions", 0) == 0, "Should have no interactions"
        assert data.get("next_action_due") == future_date, "Should have future follow-up date"
        
        # Should still be needs_outreach (default stage)
        assert data["board_group"] == "needs_outreach", f"Expected 'needs_outreach', got '{data['board_group']}'"
        print(f"✓ SCENARIO 8 PASSED: No interactions with future follow-up is in 'needs_outreach'")


class TestGroupedAPIReturns5Groups:
    """Test GET /api/programs?grouped=true returns ALL 5 groups."""
    
    def test_grouped_api_has_5_groups(self, auth_session):
        res = auth_session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert res.status_code == 200
        data = res.json()
        
        # Should have groups, counts, and total
        assert "groups" in data, "Response should have 'groups'"
        assert "counts" in data, "Response should have 'counts'"
        assert "total" in data, "Response should have 'total'"
        
        # ALL 5 groups should be present
        groups = data["groups"]
        expected_groups = ["overdue", "needs_outreach", "waiting_on_reply", "in_conversation", "archived"]
        for g in expected_groups:
            assert g in groups, f"Group '{g}' should exist in response"
        
        # Verify counts match group lengths
        counts = data["counts"]
        for g in expected_groups:
            assert g in counts, f"Count for '{g}' should exist"
            assert counts[g] == len(groups[g]), f"Count for '{g}' should match group length"
        
        # Verify OLD groups are NOT present
        old_groups = ["action_required", "upcoming", "in_progress", "closed"]
        for g in old_groups:
            assert g not in groups, f"OLD group '{g}' should NOT exist (replaced by new 5-stage funnel)"
        
        print(f"✓ Grouped API returns all 5 new groups: {list(groups.keys())}")
        print(f"  Counts: {counts}")
        print(f"  Total: {data['total']}")


class TestBoardGroupField:
    """Test that GET /api/programs/{id} returns correct board_group field."""
    
    def test_single_program_has_board_group(self, auth_session, test_programs):
        program = test_programs[0]
        
        res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert res.status_code == 200
        data = res.json()
        
        assert "board_group" in data, "Single program should have board_group field"
        
        # Verify it's one of the 5 valid groups
        valid_groups = ["overdue", "needs_outreach", "waiting_on_reply", "in_conversation", "archived"]
        assert data["board_group"] in valid_groups, \
            f"board_group should be one of {valid_groups}, got '{data['board_group']}'"
        
        print(f"✓ Single program has valid board_group: {data['board_group']}")


class TestMarkRepliedEndpoint:
    """Test POST /api/programs/{id}/mark-replied endpoint."""
    
    def test_mark_replied_requires_note(self, auth_session, test_programs):
        program = test_programs[0]
        
        # Try with empty note - should fail
        res = auth_session.post(
            f"{BASE_URL}/api/programs/{program['program_id']}/mark-replied",
            json={"note": ""}
        )
        assert res.status_code == 400, f"Empty note should return 400, got {res.status_code}"
        print("✓ mark-replied correctly requires non-empty note")
    
    def test_mark_replied_creates_coach_reply_interaction(self, auth_session):
        # Create a fresh program
        prog_data = {
            "university_name": f"TEST_MarkReplied_{uuid.uuid4().hex[:6]}",
            "division": "D2"
        }
        create_res = auth_session.post(f"{BASE_URL}/api/programs", json=prog_data)
        assert create_res.status_code == 200
        program = create_res.json()
        
        try:
            # Mark as replied
            res = auth_session.post(
                f"{BASE_URL}/api/programs/{program['program_id']}/mark-replied",
                json={"note": "Test coach reply note"}
            )
            assert res.status_code == 200
            data = res.json()
            
            # Should return updated program with signals showing has_coach_reply=True
            assert "signals" in data, "Response should include signals"
            assert data["signals"].get("has_coach_reply") == True, \
                "signals should show has_coach_reply=True"
            
            # Verify board_group changed to in_conversation
            assert data.get("board_group") == "in_conversation" or \
                   auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}").json()["board_group"] == "in_conversation", \
                "Board group should be 'in_conversation' after mark-replied"
            
            print("✓ mark-replied creates coach_reply interaction and updates signals")
        finally:
            auth_session.delete(f"{BASE_URL}/api/programs/{program['program_id']}")


class TestArchivedToggle:
    """Test that is_active=false correctly moves school to archived group."""
    
    def test_archive_and_unarchive(self, auth_session):
        # Create a fresh program
        prog_data = {
            "university_name": f"TEST_ArchiveToggle_{uuid.uuid4().hex[:6]}",
            "division": "D3"
        }
        create_res = auth_session.post(f"{BASE_URL}/api/programs", json=prog_data)
        assert create_res.status_code == 200
        program = create_res.json()
        
        try:
            # Initially should be in needs_outreach (new, no interactions)
            res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
            assert res.status_code == 200
            data = res.json()
            assert data["board_group"] == "needs_outreach", \
                f"New program should be in needs_outreach, got {data['board_group']}"
            
            # Archive (set is_active=false)
            res = auth_session.put(
                f"{BASE_URL}/api/programs/{program['program_id']}",
                json={"is_active": False}
            )
            assert res.status_code == 200
            
            # Verify now in archived
            res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
            assert res.status_code == 200
            data = res.json()
            assert data.get("is_active") == False, "is_active should be False"
            assert data["board_group"] == "archived", \
                f"Inactive should be in 'archived', got {data['board_group']}"
            
            # Unarchive (set is_active=true)
            res = auth_session.put(
                f"{BASE_URL}/api/programs/{program['program_id']}",
                json={"is_active": True}
            )
            assert res.status_code == 200
            
            # Verify no longer in archived
            res = auth_session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
            assert res.status_code == 200
            data = res.json()
            assert data.get("is_active") == True, "is_active should be True"
            assert data["board_group"] != "archived", \
                f"Active should not be in 'archived', got {data['board_group']}"
            
            print("✓ is_active toggle correctly moves school to/from 'archived' group")
        finally:
            auth_session.delete(f"{BASE_URL}/api/programs/{program['program_id']}")


class TestExistingSchoolsData:
    """Test existing schools (Stanford, UCLA) have correct board_group based on their data."""
    
    def test_check_existing_schools(self, auth_session):
        # Get all programs
        res = auth_session.get(f"{BASE_URL}/api/programs")
        assert res.status_code == 200
        programs = res.json()
        
        stanford = None
        ucla = None
        for p in programs:
            name = p.get("university_name", "").lower()
            if "stanford" in name:
                stanford = p
            elif "ucla" in name:
                ucla = p
        
        if stanford:
            print(f"\nStanford:")
            print(f"  - board_group: {stanford.get('board_group')}")
            print(f"  - has_coach_reply: {stanford.get('signals', {}).get('has_coach_reply')}")
            print(f"  - outreach_count: {stanford.get('signals', {}).get('outreach_count')}")
            # According to context: Stanford has coach_reply -> should be in_conversation
            if stanford.get('signals', {}).get('has_coach_reply'):
                assert stanford["board_group"] == "in_conversation" or stanford["board_group"] == "overdue", \
                    f"Stanford with coach_reply should be 'in_conversation' or 'overdue' (if overdue date), got {stanford['board_group']}"
        
        if ucla:
            print(f"\nUCLA:")
            print(f"  - board_group: {ucla.get('board_group')}")
            print(f"  - has_coach_reply: {ucla.get('signals', {}).get('has_coach_reply')}")
            print(f"  - outreach_count: {ucla.get('signals', {}).get('outreach_count')}")
            # According to context: UCLA has no interactions -> should be needs_outreach
            if ucla.get('signals', {}).get('outreach_count', 0) == 0 and \
               ucla.get('signals', {}).get('total_interactions', 0) == 0:
                # Check if overdue or archived first
                if ucla.get('is_active', True) and not ucla.get('next_action_due'):
                    assert ucla["board_group"] == "needs_outreach", \
                        f"UCLA with no interactions should be 'needs_outreach', got {ucla['board_group']}"
        
        print("\n✓ Existing schools have correct board_group based on data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
