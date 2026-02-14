"""
Test Dynamic Board Grouping Feature
====================================
Tests the new dynamic board grouping logic that categorizes programs into 4 action-oriented groups:
- action_required: Overdue, needs response, or stale
- upcoming: Follow-up due within 14 days
- in_progress: Recently contacted (7 days) or active conversation
- closed: Not a fit, committed, or archived
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDynamicBoardGrouping:
    """Tests for GET /api/programs?grouped=true endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for all tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_grouped_endpoint_returns_200(self):
        """Test that grouped=true endpoint returns 200"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/programs?grouped=true returns 200")
    
    def test_grouped_response_structure(self):
        """Test that grouped response has correct structure"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check top-level keys
        assert "groups" in data, "Response missing 'groups' key"
        assert "counts" in data, "Response missing 'counts' key"
        assert "total" in data, "Response missing 'total' key"
        
        # Check groups structure
        groups = data["groups"]
        expected_groups = ["action_required", "upcoming", "in_progress", "closed"]
        for group in expected_groups:
            assert group in groups, f"Missing group: {group}"
            assert isinstance(groups[group], list), f"Group {group} should be a list"
        
        print(f"✓ Response has correct structure with groups: {list(groups.keys())}")
    
    def test_counts_match_programs(self):
        """Test that counts match actual program counts in each group"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        groups = data["groups"]
        counts = data["counts"]
        
        for group_key, programs in groups.items():
            expected_count = len(programs)
            actual_count = counts.get(group_key, 0)
            assert expected_count == actual_count, f"Count mismatch for {group_key}: expected {expected_count}, got {actual_count}"
        
        # Verify total
        total_from_groups = sum(len(programs) for programs in groups.values())
        assert total_from_groups == data["total"], f"Total mismatch: {total_from_groups} vs {data['total']}"
        
        print(f"✓ Counts match programs: {counts}, total: {data['total']}")
    
    def test_action_required_programs(self):
        """Test that action_required group contains overdue/stale programs"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        action_required = data["groups"]["action_required"]
        count = data["counts"]["action_required"]
        
        print(f"✓ Action Required group has {count} programs")
        
        # Verify programs in action_required have board_group set correctly
        for p in action_required:
            assert p.get("board_group") == "action_required", f"Program {p.get('university_name')} has wrong board_group"
        
        print(f"✓ All action_required programs have correct board_group")
    
    def test_upcoming_programs(self):
        """Test that upcoming group contains programs with follow-up due within 14 days"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        upcoming = data["groups"]["upcoming"]
        count = data["counts"]["upcoming"]
        
        print(f"✓ Upcoming group has {count} programs")
        
        # Verify programs in upcoming have board_group set correctly
        for p in upcoming:
            assert p.get("board_group") == "upcoming", f"Program {p.get('university_name')} has wrong board_group"
        
        print(f"✓ All upcoming programs have correct board_group")
    
    def test_in_progress_programs(self):
        """Test that in_progress group contains recently contacted or active conversation programs"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        in_progress = data["groups"]["in_progress"]
        count = data["counts"]["in_progress"]
        
        print(f"✓ In Progress group has {count} programs")
        
        # Verify programs in in_progress have board_group set correctly
        for p in in_progress:
            assert p.get("board_group") == "in_progress", f"Program {p.get('university_name')} has wrong board_group"
        
        print(f"✓ All in_progress programs have correct board_group")
    
    def test_closed_programs(self):
        """Test that closed group contains committed/not-a-fit/not-interested programs"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        closed = data["groups"]["closed"]
        count = data["counts"]["closed"]
        
        print(f"✓ Closed group has {count} programs")
        
        # Verify programs in closed have board_group set correctly
        for p in closed:
            assert p.get("board_group") == "closed", f"Program {p.get('university_name')} has wrong board_group"
        
        # Verify closed programs have closed statuses
        closed_statuses = ["Not a Fit / Closed", "Not Interested", "Committed"]
        for p in closed:
            status = p.get("recruiting_status", "")
            assert status in closed_statuses, f"Program {p.get('university_name')} has non-closed status: {status}"
        
        print(f"✓ All closed programs have correct board_group and closed statuses")
    
    def test_program_has_board_group_field(self):
        """Test that each program has board_group field"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        
        data = response.json()
        all_programs = []
        for group_programs in data["groups"].values():
            all_programs.extend(group_programs)
        
        for p in all_programs:
            assert "board_group" in p, f"Program {p.get('university_name')} missing board_group"
            assert p["board_group"] in ["action_required", "upcoming", "in_progress", "closed"]
        
        print(f"✓ All {len(all_programs)} programs have valid board_group field")
    
    def test_search_with_grouped(self):
        """Test that search filter works with grouped=true"""
        # First get all programs to find a search term
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
        assert response.status_code == 200
        data = response.json()
        
        # Get first program name for search
        all_programs = []
        for group_programs in data["groups"].values():
            all_programs.extend(group_programs)
        
        if all_programs:
            search_term = all_programs[0]["university_name"][:5]  # First 5 chars
            
            search_response = self.session.get(f"{BASE_URL}/api/programs?grouped=true&search={search_term}")
            assert search_response.status_code == 200
            
            search_data = search_response.json()
            assert "groups" in search_data
            assert "counts" in search_data
            
            print(f"✓ Search '{search_term}' with grouped=true works, total: {search_data['total']}")
        else:
            print("⚠ No programs to test search with")
    
    def test_division_filter_with_grouped(self):
        """Test that division filter works with grouped=true"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true&division=D1")
        assert response.status_code == 200
        
        data = response.json()
        assert "groups" in data
        
        # All programs should be D1
        all_programs = []
        for group_programs in data["groups"].values():
            all_programs.extend(group_programs)
        
        for p in all_programs:
            assert p.get("division") == "D1", f"Program {p.get('university_name')} has wrong division"
        
        print(f"✓ Division filter with grouped=true works, {data['total']} D1 programs")
    
    def test_region_filter_with_grouped(self):
        """Test that region filter works with grouped=true"""
        response = self.session.get(f"{BASE_URL}/api/programs?grouped=true&region=Midwest")
        assert response.status_code == 200
        
        data = response.json()
        assert "groups" in data
        
        print(f"✓ Region filter with grouped=true works, {data['total']} Midwest programs")
    
    def test_non_grouped_still_works(self):
        """Test that non-grouped endpoint still returns flat list"""
        response = self.session.get(f"{BASE_URL}/api/programs")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Non-grouped response should be a list"
        
        # Each program should still have board_group field
        for p in data:
            assert "board_group" in p, f"Program {p.get('university_name')} missing board_group"
        
        print(f"✓ Non-grouped endpoint returns flat list with {len(data)} programs")


class TestBoardGroupingLogic:
    """Tests for the categorize_program() logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for all tests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_closed_status_goes_to_closed_group(self):
        """Test that programs with closed statuses go to closed group"""
        # Create a test program with closed status
        test_program = {
            "university_name": f"TEST_Closed_University_{datetime.now().strftime('%H%M%S')}",
            "division": "D1",
            "recruiting_status": "Not a Fit / Closed",
            "region": "Test Region"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json=test_program)
        assert create_resp.status_code == 200 or create_resp.status_code == 201
        
        created = create_resp.json()
        program_id = created["program_id"]
        
        try:
            # Verify it's in closed group
            grouped_resp = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
            assert grouped_resp.status_code == 200
            
            data = grouped_resp.json()
            closed_programs = data["groups"]["closed"]
            
            found = any(p["program_id"] == program_id for p in closed_programs)
            assert found, "Closed status program should be in closed group"
            
            print(f"✓ Closed status program correctly placed in closed group")
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")
    
    def test_recently_contacted_goes_to_in_progress(self):
        """Test that recently contacted programs go to in_progress group"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        test_program = {
            "university_name": f"TEST_InProgress_University_{datetime.now().strftime('%H%M%S')}",
            "division": "D1",
            "recruiting_status": "Contacted",
            "initial_contact_sent": today,
            "region": "Test Region"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json=test_program)
        assert create_resp.status_code == 200 or create_resp.status_code == 201
        
        created = create_resp.json()
        program_id = created["program_id"]
        
        try:
            # Verify it's in in_progress group
            grouped_resp = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
            assert grouped_resp.status_code == 200
            
            data = grouped_resp.json()
            in_progress_programs = data["groups"]["in_progress"]
            
            found = any(p["program_id"] == program_id for p in in_progress_programs)
            assert found, "Recently contacted program should be in in_progress group"
            
            print(f"✓ Recently contacted program correctly placed in in_progress group")
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")
    
    def test_upcoming_follow_up_goes_to_upcoming(self):
        """Test that programs with follow-up in next 14 days go to upcoming group"""
        # Set follow-up due in 7 days (within 14 day window)
        due_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        old_contact = (datetime.now() - timedelta(days=20)).strftime("%Y-%m-%d")  # 20 days ago, not recent
        
        test_program = {
            "university_name": f"TEST_Upcoming_University_{datetime.now().strftime('%H%M%S')}",
            "division": "D1",
            "recruiting_status": "Contacted",
            "next_action_due": due_date,
            "initial_contact_sent": old_contact,
            "region": "Test Region"
        }
        
        create_resp = self.session.post(f"{BASE_URL}/api/programs", json=test_program)
        assert create_resp.status_code == 200 or create_resp.status_code == 201
        
        created = create_resp.json()
        program_id = created["program_id"]
        
        try:
            # Verify it's in upcoming group
            grouped_resp = self.session.get(f"{BASE_URL}/api/programs?grouped=true")
            assert grouped_resp.status_code == 200
            
            data = grouped_resp.json()
            upcoming_programs = data["groups"]["upcoming"]
            
            found = any(p["program_id"] == program_id for p in upcoming_programs)
            assert found, "Program with upcoming follow-up should be in upcoming group"
            
            print(f"✓ Upcoming follow-up program correctly placed in upcoming group")
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/programs/{program_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
