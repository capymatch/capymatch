"""
Test suite for Board Redesign (Apple-inspired UX)
Tests: Progress Ring, Focus Card, Filter Chips, Smart List, Mark as Replied
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBoardRedesign:
    """Tests for the redesigned recruiting board"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session cookie"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "premium@test.com", "password": "password"}
        )
        assert login_response.status_code == 200
        # Store test programs to clean up
        self.test_programs = []
        yield
        # Cleanup
        for program_id in self.test_programs:
            try:
                self.session.delete(f"{BASE_URL}/api/programs/{program_id}")
            except:
                pass
    
    def test_grouped_programs_returns_5_groups(self):
        """GET /api/programs?grouped=true returns 5 groups with counts"""
        response = self.session.get(f"{BASE_URL}/api/programs", params={"grouped": "true"})
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "groups" in data
        assert "counts" in data
        assert "total" in data
        
        # Verify all 5 groups exist
        expected_groups = ["overdue", "needs_outreach", "waiting_on_reply", "in_conversation", "archived"]
        for group in expected_groups:
            assert group in data["groups"], f"Missing group: {group}"
            assert group in data["counts"], f"Missing count for: {group}"
        
        print(f"✓ API returns 5 groups: {list(data['counts'].keys())}")
        print(f"  Counts: {data['counts']}, Total: {data['total']}")
    
    def test_needs_outreach_stage(self):
        """New school with no interactions -> needs_outreach"""
        # Create test program
        create_response = self.session.post(
            f"{BASE_URL}/api/programs",
            json={
                "university_name": "TEST_NeedsOutreach School",
                "division": "D1",
                "region": "West"
            }
        )
        assert create_response.status_code == 200
        program = create_response.json()
        self.test_programs.append(program["program_id"])
        
        # Verify it's in needs_outreach
        response = self.session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["board_group"] == "needs_outreach"
        print(f"✓ New school assigned to needs_outreach")
    
    def test_waiting_on_reply_stage(self):
        """School with outreach but no coach reply -> waiting_on_reply"""
        # Create test program
        create_response = self.session.post(
            f"{BASE_URL}/api/programs",
            json={
                "university_name": "TEST_WaitingReply School",
                "division": "D2",
                "region": "East"
            }
        )
        assert create_response.status_code == 200
        program = create_response.json()
        self.test_programs.append(program["program_id"])
        
        # Add an outreach interaction
        interaction_response = self.session.post(
            f"{BASE_URL}/api/interactions",
            json={
                "program_id": program["program_id"],
                "type": "Email",
                "outcome": "Sent",
                "notes": "Test outreach"
            }
        )
        assert interaction_response.status_code == 200
        
        # Verify it's now waiting_on_reply
        response = self.session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["board_group"] == "waiting_on_reply"
        print(f"✓ School with outreach assigned to waiting_on_reply")
    
    def test_in_conversation_stage_via_mark_replied(self):
        """School with coach reply (via mark-replied) -> in_conversation"""
        # Create test program
        create_response = self.session.post(
            f"{BASE_URL}/api/programs",
            json={
                "university_name": "TEST_InConversation School",
                "division": "D3",
                "region": "South"
            }
        )
        assert create_response.status_code == 200
        program = create_response.json()
        self.test_programs.append(program["program_id"])
        
        # Mark as replied
        mark_replied_response = self.session.post(
            f"{BASE_URL}/api/programs/{program['program_id']}/mark-replied",
            json={"note": "Coach responded to my email"}
        )
        assert mark_replied_response.status_code == 200
        
        # Verify it's now in_conversation
        response = self.session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["board_group"] == "in_conversation"
        assert data["signals"]["has_coach_reply"] == True
        print(f"✓ School with coach reply assigned to in_conversation")
    
    def test_overdue_stage(self):
        """School with past due date -> overdue"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Create test program with past due date
        create_response = self.session.post(
            f"{BASE_URL}/api/programs",
            json={
                "university_name": "TEST_Overdue School",
                "division": "NAIA",
                "region": "Central",
                "next_action_due": yesterday
            }
        )
        assert create_response.status_code == 200
        program = create_response.json()
        self.test_programs.append(program["program_id"])
        
        # Verify it's overdue
        response = self.session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["board_group"] == "overdue"
        print(f"✓ School with past due date assigned to overdue")
    
    def test_archived_stage(self):
        """School with is_active=false -> archived"""
        # Create test program
        create_response = self.session.post(
            f"{BASE_URL}/api/programs",
            json={
                "university_name": "TEST_Archived School",
                "division": "D1",
                "region": "West",
                "is_active": False
            }
        )
        assert create_response.status_code == 200
        program = create_response.json()
        self.test_programs.append(program["program_id"])
        
        # Verify it's archived
        response = self.session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["board_group"] == "archived"
        print(f"✓ Inactive school assigned to archived")
    
    def test_mark_replied_requires_note(self):
        """Mark replied endpoint requires non-empty note"""
        # Create test program
        create_response = self.session.post(
            f"{BASE_URL}/api/programs",
            json={"university_name": "TEST_RequiresNote School", "division": "D1"}
        )
        program = create_response.json()
        self.test_programs.append(program["program_id"])
        
        # Try to mark replied with empty note
        response = self.session.post(
            f"{BASE_URL}/api/programs/{program['program_id']}/mark-replied",
            json={"note": ""}
        )
        assert response.status_code == 400
        print(f"✓ Mark replied rejects empty note")
    
    def test_snooze_updates_due_date(self):
        """Snoozing a school updates next_action_due"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Create overdue program
        create_response = self.session.post(
            f"{BASE_URL}/api/programs",
            json={
                "university_name": "TEST_Snooze School",
                "division": "D1",
                "next_action_due": yesterday
            }
        )
        program = create_response.json()
        self.test_programs.append(program["program_id"])
        
        # Snooze by updating due date to 3 days from now
        future_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        update_response = self.session.put(
            f"{BASE_URL}/api/programs/{program['program_id']}",
            json={"next_action_due": future_date}
        )
        assert update_response.status_code == 200
        
        # Verify no longer overdue
        response = self.session.get(f"{BASE_URL}/api/programs/{program['program_id']}")
        data = response.json()
        assert data["board_group"] != "overdue"
        print(f"✓ Snooze moves school out of overdue stage")
    
    def test_filter_chips_only_show_nonzero(self):
        """Filter chips should only show stages with count > 0"""
        response = self.session.get(f"{BASE_URL}/api/programs", params={"grouped": "true"})
        data = response.json()
        
        # Count non-zero groups
        nonzero_groups = [k for k, v in data["counts"].items() if v > 0]
        print(f"✓ Non-zero groups: {nonzero_groups}")
        print(f"  Filter chips should show: All + {len(nonzero_groups)} stage chips")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
